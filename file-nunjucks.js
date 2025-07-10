module.exports = function (RED) {
  'use strict';
  const fs = require('fs').promises;
  const path = require('path');
  const chokidar = require('chokidar');
  const nunjucks = require('nunjucks');
  const marked = require('marked');
  const LRU = require('lru-cache');
  const debounce = require('debounce');
  const createSandbox = require('./sandbox');

  // Caches
  const envCache = new LRU({ max: 50 });
  const templateCache = new LRU({ max: 100 });

  function FileNunjucksNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Configuration
    node.sourceType = config.sourceType || 'file'; // 'file' or 'folder'
    node.filename = config.filename || '';
    node.folderPath = config.folderPath || '';
    node.engine = config.engine || 'nunjucks';
    node.field = config.field || 'payload';
    node.fieldType = config.fieldType || 'msg';
    node.output = config.output || 'str';
    node.name = config.name;
    node.loadOnBoot = config.loadOnBoot !== false;
    node.bootDelay = parseInt(config.bootDelay) || 1000;
    node.watchMode = config.watchMode !== false;
    node.cacheTemplates = config.cacheTemplates !== false;
    node.sandbox = config.sandbox !== false;

    try {
      node.customFilters = JSON.parse(config.customFilters || '{}');
    } catch (e) {
      node.error('Invalid custom filters JSON');
      node.customFilters = {};
    }

    let watcher = null;
    let fileContent = '';
    let lastModified = 0;

    function updateStatus(text, color = 'grey') {
      node.status({ fill: color, shape: 'dot', text: text });
    }

    async function resolveFilePath(msg) {
      let filename;
      if (node.sourceType === 'file') {
        filename = node.filename;
      } else {
        filename = RED.util.getMessageProperty(msg, 'filename');
      }

      if (!filename) throw new Error('Filename not provided');

      const basePath = node.sourceType === 'file' ? filename : path.join(node.folderPath, filename);
      const fullPath = path.resolve(basePath);

      // Security check
      if (!fullPath.startsWith(process.cwd())) {
        throw new Error(`Access denied to file path: ${fullPath}`);
      }

      return fullPath;
    }

    async function loadTemplate(fullPath) {
      if (!fullPath) {
        throw new Error('Cannot load template: fullPath is undefined');
      }

      try {
        if (node.cacheTemplates && templateCache.has(fullPath)) {
          const cached = templateCache.get(fullPath);
          fileContent = cached.content;
          lastModified = cached.mtime;
        } else {
          fileContent = await fs.readFile(fullPath, 'utf8');
          const stats = await fs.stat(fullPath);
          lastModified = stats.mtimeMs;
          if (node.cacheTemplates) {
            templateCache.set(fullPath, {
              content: fileContent,
              mtime: lastModified
            });
          }
        }
        updateStatus(`Loaded: ${path.basename(fullPath)} (${fileContent.length} chars)`, 'green');
      } catch (err) {
        updateStatus('Error loading', 'red');
        node.error(`Error reading template: ${err.message}`);
        throw err;
      }
    }

    function setupWatcherForFolder() {
      if (!node.folderPath || !node.watchMode || node.sourceType !== 'folder') return;

      const resolvedPath = path.resolve(node.folderPath);

      if (watcher) {
        watcher.close().catch(err => node.error('Error closing previous watcher:', err));
      }

      const debouncedReload = debounce(async (filePath) => {
        if (/\.(njk|html|md)$/i.test(filePath)) {
          await loadTemplate(filePath);
        }
      }, 500);

      watcher = chokidar.watch(resolvedPath, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      });

      watcher.on('change', debouncedReload);
      watcher.on('add', debouncedReload);
      watcher.on('unlink', (filePath) => {
        node.warn(`File removed: ${filePath}`);
        templateCache.delete(filePath);
      });

      watcher.on('error', error => {
        node.error(`Folder watcher error: ${error.message}`);
        updateStatus('Watcher error', 'red');
      });
    }

    function getNunjucksEnv(fullPath) {
      const dir = path.dirname(fullPath || '.');
      const cacheKey = `${dir}:${node.sandbox}`;
      if (envCache.has(cacheKey)) return envCache.get(cacheKey);

      const loader = new nunjucks.FileSystemLoader(dir, {
        noCache: !node.cacheTemplates,
        watch: false
      });

      const env = new nunjucks.Environment(loader, {
        autoescape: false,
        throwOnUndefined: true
      });

      // Built-in filters
      env.addFilter('formatDate', (date, format = 'YYYY-MM-DD HH:mm:ss') => {
        const moment = require('moment');
        return moment(date).format(format);
      });
      env.addFilter('uppercase', str => str?.toUpperCase() || '');
      env.addFilter('lowercase', str => str?.toLowerCase() || '');
      env.addFilter('default', (value, defaultValue) => value ?? defaultValue);

      // Custom filters
      Object.entries(node.customFilters).forEach(([name, fn]) => {
        try {
          const filterFn = new Function('return ' + fn)();
          env.addFilter(name, filterFn);
        } catch (e) {
          node.error(`Error adding filter "${name}": ${e.message}`);
        }
      });

      // Security
      if (node.sandbox) {
        env.addGlobal('console', undefined);
        env.addGlobal('process', undefined);
        env.addGlobal('require', undefined);
        env.addGlobal('eval', undefined);
      }

      envCache.set(cacheKey, env);
      return env;
    }

    async function processMessage(msg) {
      try {
        // Берём путь к файлу из msg.filename, если он есть
        const filename = RED.util.getMessageProperty(msg, 'filename') || node.filename;

        if (!filename) {
          throw new Error('Filename not provided in message or configuration');
        }

        const fullPath = await resolveFilePath(msg);

        // Security check
        if (!fullPath.startsWith(process.cwd())) {
          throw new Error(`Access denied to file path: ${fullPath}`);
        }

        let templateContent;

        // Если файл изменился или ещё не загружен
        if (!fileContent || lastModified === 0 || (await fs.stat(fullPath)).mtimeMs > lastModified) {
          await loadTemplate(fullPath);
        }

        templateContent = fileContent;

        if (!templateContent) {
          throw new Error('No template content available');
        }

        // Получаем данные для шаблона
        let templateData;
        switch (node.fieldType) {
        case 'flow':
          templateData = node.context().flow.get(node.field) || {};
          break;
        case 'global':
          templateData = node.context().global.get(node.field) || {};
          break;
        case 'msg':
        default:
          templateData = RED.util.getMessageProperty(msg, node.field) || msg.payload || {};
        }

        // Добавляем текущее время
        templateData.now = new Date();

        // Применяем песочницу, если включена
        const safeData = node.sandbox ? createSandbox(templateData) : templateData;

        // Обработка шаблона
        let result;
        if (node.engine === 'nunjucks') {
          const env = getNunjucksEnv(fullPath);
          result = env.renderString(templateContent, safeData);
        } else if (node.engine === 'mustache' || node.engine === 'handlebars') {
          result = templateContent.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            return key.trim().split('.').reduce((obj, k) =>
              (obj && typeof obj === 'object' && k in obj) ? obj[k] : match,
            safeData
            ) || '';
          });
        } else {
          throw new Error(`Unsupported template engine: ${node.engine}`);
        }

        // Markdown
        if (fullPath.endsWith('.md') || templateContent.includes('<!-- markdown -->')) {
          result = marked.parse(result);
        }

        // Подготовка результата
        msg.template = (node.output === 'parsed') ? tryParseJSON(result) : result;

        // Метаданные
        msg._fileTemplate = {
          filename: fullPath,
          engine: node.engine,
          length: result.length,
          cached: node.cacheTemplates,
          sandbox: node.sandbox,
          timestamp: Date.now()
        };

        return msg;

      } catch (err) {
        updateStatus('Template error', 'red');
        node.error('Template processing error:', err);
        throw err;
      }
    }

    function tryParseJSON(str) {
      try {
        return JSON.parse(str);
      } catch (e) {
        return str;
      }
    }

    node.on('input', async function (msg, send, done) {
      send = send || function () { node.send.apply(node, arguments); };
      const safeDone = (err) => {
        if (typeof done === 'function') {
          done(err);
        } else if (err) {
          node.error(`Unhandled error in input handler: ${err.message}`, msg);
        }
      };

      try {
        if (node.watchMode && node.sourceType === 'folder') {
          setupWatcherForFolder();
        }

        const result = await processMessage(msg);
        send(result);
        safeDone();
      } catch (err) {
        safeDone(err);
      }
    });

    node.on('close', async function (done) {
      try {
        const cleanupTasks = [];
        if (watcher) {
          cleanupTasks.push(
            watcher.close()
              .then(() => node.log('File watcher closed'))
              .catch(err => node.error('Error closing watcher:', err))
          );
        }

        if (node.cacheTemplates) {
          templateCache.clear();
          envCache.clear();
          node.log('Caches cleared');
        }

        await Promise.all(cleanupTasks);
        updateStatus('', 'grey');
        done();
      } catch (err) {
        node.error('Cleanup error:', err);
        done(err);
      }
    });

    // Initial load
    if (node.loadOnBoot && node.sourceType === 'file' && node.filename) {
      setTimeout(async () => {
        try {
          const fullPath = await resolveFilePath(null);
          await loadTemplate(fullPath);
          if (node.watchMode) {
            setupWatcherForFolder();
          }
        } catch (err) {
          node.error(`Initial load failed: ${err.message}`);
        }
      }, node.bootDelay);
    }
  }

  RED.nodes.registerType('file-nunjucks', FileNunjucksNode);

  // HTTP API
  RED.httpAdmin.post('/file-nunjucks/load-file', async function (req, res) {
    try {
      const filename = req.body.filename;
      if (!filename) return res.status(400).json({ error: 'Filename is required' });
      const fullPath = path.resolve(filename);
      if (!fullPath.startsWith(process.cwd())) return res.status(403).json({ error: 'Access denied' });

      const [content, stats] = await Promise.all([
        fs.readFile(fullPath, 'utf8'),
        fs.stat(fullPath)
      ]);

      res.json({
        success: true,
        content,
        size: content.length,
        mtime: stats.mtime.getTime(),
        filename: path.basename(fullPath)
      });
    } catch (err) {
      res.status(500).json({ error: 'File read failed', details: err.message });
    }
  });

  RED.httpAdmin.post('/file-nunjucks/save-file', async function (req, res) {
    try {
      const { filename, content } = req.body;
      if (!filename || content === undefined) {
        return res.status(400).json({ error: 'Filename and content are required' });
      }

      const fullPath = path.resolve(filename);
      if (!fullPath.startsWith(process.cwd())) return res.status(403).json({ error: 'Access denied' });

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');

      res.json({
        success: true,
        size: content.length,
        filename: path.basename(fullPath)
      });
    } catch (err) {
      res.status(500).json({ error: 'File save failed', details: err.message });
    }
  });

  RED.httpAdmin.get('/file-nunjucks/list', async function (req, res) {
    const folderPath = req.query.folder;
    if (!folderPath) return res.status(400).json({ error: 'Folder path is required' });

    const fullPath = path.resolve(folderPath);
    if (!fullPath.startsWith(process.cwd())) return res.status(403).json({ error: 'Access denied' });

    try {
      const files = await fs.readdir(fullPath);
      const templates = files.filter(f => /\.(njk|html|md)$/i.test(f));
      res.json({ templates });
    } catch (err) {
      res.status(500).json({ error: 'Failed to list files', details: err.message });
    }
  });
};