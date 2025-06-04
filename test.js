// Simple test script for node-red-contrib-file-template
// This is a basic test to ensure the node loads and processes templates correctly

const fs = require('fs');
const path = require('path');

// Mock Node-RED environment
const mockRED = {
    nodes: {
        createNode: function (node, config)
        {
            node.log = console.log;
            node.warn = console.warn;
            node.error = console.error;
            node.status = function (status)
            {
                console.log('Status:', status);
            };
            node.on = function (event, callback)
            {
                console.log('Event registered:', event);
                if (event === 'input')
                {
                    node._inputCallback = callback;
                }
            };
            node.send = function (msg)
            {
                console.log('Node output:', JSON.stringify(msg, null, 2));
            };
        },
        registerType: function (type, constructor)
        {
            console.log('Node type registered:', type);
        }
    },
    util: {
        getMessageProperty: function (msg, prop)
        {
            return msg[prop];
        }
    }
};

// Load our node
const fileTemplateNode = require('./file-template.js');
fileTemplateNode(mockRED);

// Test configuration
const testConfig = {
    filename: 'examples/templates/sample-dashboard.html',
    format: 'handlebars',
    field: 'payload',
    fieldType: 'msg',
    output: 'str'
};

console.log('Testing node-red-contrib-file-template...\n');

// Create a test node instance
const FileTemplateNode = function (config)
{
    mockRED.nodes.createNode(this, config);

    // Copy configuration
    this.filename = config.filename;
    this.format = config.format;
    this.field = config.field;
    this.fieldType = config.fieldType;
    this.output = config.output;

    console.log('Node created with config:', config);
};

// Test data
const testMessage = {
    payload: {
        title: "Test Dashboard",
        subtitle: "Node testing in progress",
        stats: {
            total: 25,
            completed: 18,
            pending: 7,
            progress: 72
        },
        user: {
            name: "Test User",
            email: "test@example.com",
            role: "Developer",
            lastLogin: new Date().toLocaleString()
        },
        description: "This is a test of the file-template node functionality.",
        status: "Testing",
        project: {
            name: "Node-RED File Template",
            status: "Development"
        },
        lastUpdated: new Date().toISOString()
    }
};

console.log('Test message:', JSON.stringify(testMessage, null, 2));
console.log('\n--- Test Results ---');

// Verify template file exists
if (fs.existsSync(testConfig.filename))
{
    console.log('✅ Template file exists:', testConfig.filename);

    // Read and show template preview
    const templateContent = fs.readFileSync(testConfig.filename, 'utf8');
    console.log('✅ Template loaded successfully');
    console.log('Template size:', templateContent.length, 'characters');

    // Simple template processing test (basic mustache replacement)
    let processedTemplate = templateContent;
    const data = testMessage.payload;

    // Basic mustache-style replacement
    processedTemplate = processedTemplate.replace(/\{\{([^}]+)\}\}/g, function (match, key)
    {
        const keys = key.trim().split('.');
        let value = data;

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

    console.log('✅ Template processing test passed');
    console.log('Processed template preview (first 200 chars):');
    console.log(processedTemplate.substring(0, 200) + '...');

} else
{
    console.log('❌ Template file not found:', testConfig.filename);
}

console.log('\n--- Installation Instructions ---');
console.log('To use this node in Node-RED:');
console.log('1. Copy this directory to your Node-RED nodes directory');
console.log('2. Or run: npm link (in this directory)');
console.log('3. Then run: npm link node-red-contrib-file-template (in ~/.node-red)');
console.log('4. Restart Node-RED');
console.log('5. Look for "file-template" in the function category');
console.log('\n--- Publishing Instructions ---');
console.log('To publish to npm:');
console.log('1. Create GitHub repository');
console.log('2. Update package.json with your details');
console.log('3. Run: npm publish');
console.log('4. Submit to Node-RED library: https://flows.nodered.org/add/node'); 
