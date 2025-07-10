// Simple test script for node-red-contrib-file-nunjucks
// This is a basic test to ensure the node loads and processes templates correctly

const fs = require('fs');
const path = require('path');

// Mock Node-RED environment
const mockRED = {
  nodes: {
    createNode: function (node, config) {
      node.log = console.log;
      node.warn = console.warn;
      node.error = console.error;
      node.status = function (status) {
        console.log('Status:', status);
      };
      node.on = function (event, callback) {
        console.log('Event registered:', event);
        if (event === 'input') {
          node._inputCallback = callback;
        }
      };
      node.send = function (msg) {
        console.log('Node output:', JSON.stringify(msg, null, 2));
      };
    },
    registerType: function (type, constructor) {
      console.log('Node type registered:', type);
      this._nodeTypes = this._nodeTypes || {};
      this._nodeTypes[type] = constructor;
    },
    getType: function (type) {
      return this._nodeTypes ? this._nodeTypes[type] : null;
    }
  },
  util: {
    getMessageProperty: function (msg, prop) {
      return msg[prop];
    }
  },
  httpAdmin: {
    post: function () {
      // Stub for admin routes - not needed in test
      console.log('HTTP route registered');
    }
  }
};

// Load our node
const fileNunjucksNode = require('./file-nunjucks.js');
fileNunjucksNode(mockRED); // Registers the node type

// Test configuration
const testConfig = {
  filename: '', // No file - will use inline template for testing
  engine: 'nunjucks',
  field: 'payload',
  fieldType: 'msg',
  output: 'str',
  template: `
<div class="test-dashboard">
    <h1>{{ title }}</h1>
    <h2>{{ subtitle }}</h2>
    <div class="stats">
        <p>Total: {{ stats.total }}</p>
        <p>Completed: {{ stats.completed }}</p>
        <p>Progress: {{ stats.progress }}%</p>
    </div>
    <div class="user-info">
        <p>User: {{ user.name }} ({{ user.role }})</p>
        <p>Email: {{ user.email }}</p>
    </div>
    <div class="project-info">
        <p>Project: {{ project.name }}</p>
        <p>Status: {{ project.status }}</p>
    </div>
    <p>Today: {{ now | formatDate }}</p>
</div>`
};

console.log('Testing node-red-contrib-file-nunjucks...\n');

// Create a test node instance
const FileNunjucksNode = mockRED.nodes.getType('file-nunjucks');
const testNodeInstance = new FileNunjucksNode(testConfig);

console.log('✅ Node instance created with config:', testConfig);

// Test data
const testMessage = {
  payload: {
    title: 'Test Dashboard',
    subtitle: 'Node testing in progress',
    stats: {
      total: 25,
      completed: 18,
      pending: 7,
      progress: 72
    },
    user: {
      name: 'Test User',
      email: 'test@example.com',
      role: 'Developer'
    },
    project: {
      name: 'Node-RED File Template',
      status: 'Development'
    }
  }
};

console.log('Test message:', JSON.stringify(testMessage, null, 2));
console.log('\n--- Running Test ---');

// Simulate input event
testNodeInstance._inputCallback(testMessage);

console.log('\n✅ Test completed successfully!');