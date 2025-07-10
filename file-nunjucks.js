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
    node.filename = config.filename || '';
    node.engine = config.engine || 'nunjucks';
    node.template = config.template || '';
    node.field = config.field || 'payload';
    node.fieldType = config.fieldType || 'msg';
    node.output = config.output || 'str';
    node.name = config.name;
    node.loadOnBoot = config.loadOnBoot || false;
    node.bootData = config.bootData || '{}';
    node.bootDelay = parseInt(config.bootDelay) || 1000;
    node.watchMode = config.watchMode !== false;
    node.cacheTemplates = config.cacheTemplates || false;
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

    async function loadTemplate() {
      if (!node.filename) return;

      const fullPath = path.resolve(node.filename);

      // Security check
      if (!fullPath.startsWith(process.cwd())) {
        throw new Error(`Access denied to file path: ${fullPath}`);
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

    function setupWatcher() {
      if (!node.filename || !node.watchMode) return;

      const fullPath = path.resolve(node.filename);

      if (watcher) {
        watcher.close().catch(err => {
          node.error('Error closing previous watcher:', err);
        });
      }

      const debouncedReload = debounce(() => {
        loadTemplate().catch(err => {
          node.error('Error reloading template:', err);
        });
      }, 500);

      watcher = chokidar.watch(fullPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      });

      watcher.on('change', debouncedReload);
      watcher.on('error', (error) => {
        node.error(`File watcher error: ${error.message}`);
        updateStatus('Watcher error', 'red');
      });
      watcher.on('unlink', () => {
        updateStatus('File deleted', 'red');
        node.warn(`Template file deleted: ${fullPath}`);
      });
    }

    function getNunjucksEnv() {
      const dir = path.dirname(node.filename || '.');
      const cacheKey = `${dir}:${node.sandbox}`;

      if (envCache.has(cacheKey)) {
        return envCache.get(cacheKey);
      }

      const loader = new nunjucks.FileSystemLoader(dir, {
        noCache: !node.cacheTemplates,
        watch: false // We handle watching ourselves
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
        if (!fileContent && node.filename) {
          await loadTemplate();
        }

        const templateContent = fileContent || node.template;
        if (!templateContent) {
          throw new Error('No template content available');
        }

        // Get template data
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

        // Add current time
        templateData.now = new Date();

        // Apply sandbox if enabled
        const safeData = node.sandbox ? createSandbox(templateData) : templateData;

        // Process template
        let result;
        if (node.engine === 'nunjucks') {
          const env = getNunjucksEnv();
          result = env.renderString(templateContent, safeData);
        }
        else if (node.engine === 'mustache' || node.engine === 'handlebars') {
          result = templateContent.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            return key.trim().split('.').reduce((obj, k) =>
              (obj && typeof obj === 'object' && k in obj) ? obj[k] : match,
            safeData
            ) || '';
          });
        }
        else {
          throw new Error(`Unsupported template engine: ${node.engine}`);
        }

        // Process Markdown if needed
        if (node.filename.endsWith('.md') || templateContent.includes('<!-- markdown -->')) {
          result = marked.parse(result);
        }

        // Prepare output
        msg.template = (node.output === 'parsed') ?
          tryParseJSON(result) :
          result;

        // Add metadata
        msg._fileTemplate = {
          filename: node.filename,
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
        } else {
          if (err) {
            node.error(`Unhandled error in input handler: ${err.message}`, msg);
          }
        }
      };
      try {
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

    // Initialization
    if (node.filename) {
      loadTemplate()
        .then(() => {
          if (node.watchMode) setupWatcher();
        })
        .catch(err => {
          node.error(`Initial template load failed: ${err.message}`);
        });
    } else {
      updateStatus('No file specified', 'grey');
    }
  }

  RED.nodes.registerType('file-nunjucks', FileNunjucksNode);

  // HTTP API endpoints
  RED.httpAdmin.post('/file-nunjucks/load-file', async function (req, res) {
    try {
      const filename = req.body.filename;
      if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
      }

      const fullPath = path.resolve(filename);
      if (!fullPath.startsWith(process.cwd())) {
        return res.status(403).json({ error: 'Access denied' });
      }

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
      res.status(500).json({
        error: 'File read failed',
        details: err.message
      });
    }
  });

  RED.httpAdmin.post('/file-nunjucks/save-file', async function (req, res) {
    try {
      const { filename, content } = req.body;
      if (!filename || content === undefined) {
        return res.status(400).json({ error: 'Filename and content are required' });
      }

      const fullPath = path.resolve(filename);
      if (!fullPath.startsWith(process.cwd())) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');

      res.json({
        success: true,
        size: content.length,
        filename: path.basename(fullPath)
      });

    } catch (err) {
      res.status(500).json({
        error: 'File save failed',
        details: err.message
      });
    }
  });
};