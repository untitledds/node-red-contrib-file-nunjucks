module.exports = function (RED)
{
    "use strict";

    const fs = require('fs');
    const path = require('path');
    const chokidar = require('chokidar');

    function FileTemplateNode(config)
    {
        RED.nodes.createNode(this, config);
        const node = this;

        // Configuration
        node.filename = config.filename || "";
        node.format = config.format || "handlebars";
        node.syntax = config.syntax || "mustache";
        node.template = config.template || "";
        node.field = config.field || "payload";
        node.fieldType = config.fieldType || "msg";
        node.output = config.output || "str";
        node.name = config.name;
        node.loadOnBoot = config.loadOnBoot || false;
        node.bootData = config.bootData || "{}";
        node.bootDelay = parseInt(config.bootDelay) || 1000;

        // File watching
        let watcher = null;
        let fileContent = "";
        let lastModified = 0;

        // Status tracking
        function updateStatus(text, color = "grey")
        {
            node.status({
                fill: color,
                shape: "dot",
                text: text
            });
        }

        // Load template from file
        function loadTemplate()
        {
            if (!node.filename)
            {
                updateStatus("No file specified", "red");
                return;
            }

            const fullPath = path.resolve(node.filename);

            try
            {
                // Check if file exists
                if (!fs.existsSync(fullPath))
                {
                    updateStatus(`File not found: ${node.filename}`, "red");
                    node.error(`Template file not found: ${fullPath}`);
                    return;
                }

                // Get file stats
                const stats = fs.statSync(fullPath);
                const modTime = stats.mtime.getTime();

                // Only reload if file has changed
                if (modTime > lastModified)
                {
                    fileContent = fs.readFileSync(fullPath, 'utf8');
                    lastModified = modTime;

                    updateStatus(`Loaded: ${path.basename(node.filename)} (${fileContent.length} chars)`, "green");
                    node.log(`Template loaded from: ${fullPath} (${fileContent.length} characters)`);
                }

            } catch (err)
            {
                updateStatus(`Error loading file`, "red");
                node.error(`Error loading template file ${fullPath}: ${err.message}`);
            }
        }

        // Setup file watching
        function setupWatcher()
        {
            if (!node.filename) return;

            const fullPath = path.resolve(node.filename);

            try
            {
                // Clean up existing watcher
                if (watcher)
                {
                    watcher.close();
                }

                // Watch the file for changes
                watcher = chokidar.watch(fullPath, {
                    persistent: true,
                    ignoreInitial: false
                });

                watcher.on('change', () =>
                {
                    node.log(`Template file changed: ${fullPath}`);
                    loadTemplate();
                });

                watcher.on('error', (error) =>
                {
                    node.error(`File watcher error: ${error.message}`);
                    updateStatus("Watcher error", "red");
                });

                watcher.on('unlink', () =>
                {
                    updateStatus("File deleted", "red");
                    node.warn(`Template file deleted: ${fullPath}`);
                });

            } catch (err)
            {
                node.error(`Error setting up file watcher: ${err.message}`);
                updateStatus("Watcher failed", "red");
            }
        }

        // Process template on boot
        function processOnBoot()
        {
            if (!node.loadOnBoot) return;

            try
            {
                // Parse boot data
                let bootData = {};
                if (node.bootData && node.bootData.trim())
                {
                    try
                    {
                        bootData = JSON.parse(node.bootData);
                    } catch (e)
                    {
                        node.error(`Invalid boot data JSON: ${e.message}`);
                        bootData = {};
                    }
                }

                // Create synthetic message
                const bootMsg = {
                    payload: bootData,
                    topic: "boot",
                    _bootTriggered: true
                };

                // Process using internal method
                const result = processMessage(bootMsg);
                if (result.error)
                {
                    node.error(`Boot processing error: ${result.error.message}`);
                    updateStatus("Boot error", "red");
                } else
                {
                    node.log(`Template processed on boot with data: ${JSON.stringify(bootData)}`);
                    updateStatus("Boot complete", "green");
                }

            } catch (err)
            {
                node.error(`Boot processing error: ${err.message}`);
                updateStatus("Boot error", "red");
            }
        }

        // Internal message processing function
        function processMessage(msg)
        {
            try
            {
                // If no file content, try to load it
                if (!fileContent && node.filename)
                {
                    loadTemplate();
                }

                // If still no content, use inline template or error
                let templateContent = fileContent;
                if (!templateContent)
                {
                    if (node.template)
                    {
                        templateContent = node.template;
                        updateStatus("Using inline template", "yellow");
                    } else
                    {
                        throw new Error("No template content available");
                    }
                }

                // Get the data to template
                let templateData = {};

                // Extract data based on field configuration
                if (node.fieldType === "msg")
                {
                    templateData = RED.util.getMessageProperty(msg, node.field) || {};
                } else if (node.fieldType === "flow")
                {
                    templateData = node.context().flow.get(node.field) || {};
                } else if (node.fieldType === "global")
                {
                    templateData = node.context().global.get(node.field) || {};
                } else
                {
                    templateData = msg.payload || {};
                }

                // Process template based on format
                let result = templateContent;

                if (node.format === "handlebars" || node.format === "mustache")
                {
                    // Simple mustache-style template processing
                    result = templateContent.replace(/\{\{([^}]+)\}\}/g, function (match, key)
                    {
                        const keys = key.trim().split('.');
                        let value = templateData;

                        for (let k of keys)
                        {
                            if (value && typeof value === 'object' && k in value)
                            {
                                value = value[k];
                            } else
                            {
                                return match; // Return original if key not found
                            }
                        }

                        return value !== null && value !== undefined ? value : '';
                    });
                }

                // Set output based on configuration
                if (node.output === "str")
                {
                    msg.template = result;
                } else if (node.output === "parsed")
                {
                    try
                    {
                        msg.template = JSON.parse(result);
                    } catch (e)
                    {
                        msg.template = result; // Fall back to string if not valid JSON
                    }
                }

                // Add metadata
                msg._fileTemplate = {
                    filename: node.filename,
                    lastModified: lastModified,
                    length: result.length,
                    format: node.format
                };

                return { success: true, message: msg };

            } catch (err)
            {
                updateStatus("Template error", "red");
                return { success: false, error: err };
            }
        }

        // Initialize
        if (node.filename)
        {
            loadTemplate();
            setupWatcher();

            // Schedule boot processing if enabled
            if (node.loadOnBoot)
            {
                // Use setImmediate to ensure Node-RED has fully initialized
                setImmediate(() =>
                {
                    setTimeout(() =>
                    {
                        // Double-check that the node is still valid and RED is available
                        if (node && RED && RED.util)
                        {
                            processOnBoot();
                        } else
                        {
                            node.warn("Node-RED not fully initialized, skipping boot processing");
                        }
                    }, node.bootDelay);
                });
            }
        } else
        {
            updateStatus("No file specified", "grey");
        }

        // Handle incoming messages
        node.on('input', function (msg, send, done)
        {
            // Backwards compatibility
            send = send || function () { node.send.apply(node, arguments); };
            done = done || function (error)
            {
                if (error)
                {
                    node.error(error, msg);
                }
            };

            try
            {
                // Process using internal method
                const result = processMessage(msg);
                if (result.error)
                {
                    node.error(`Template processing error: ${result.error.message}`);
                    done(result.error);
                } else
                {
                    send(result.message);
                    done();
                }

            } catch (err)
            {
                updateStatus("Template error", "red");
                done(err);
            }
        });

        // Cleanup on node removal
        node.on('close', function (removed, done)
        {
            if (watcher)
            {
                watcher.close();
            }
            updateStatus("", "grey");
            done();
        });
    }

    // Register the node
    RED.nodes.registerType("file-template", FileTemplateNode);
}; 
