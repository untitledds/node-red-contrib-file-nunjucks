# node-red-contrib-file-template

A Node-RED node that loads HTML template content from the filesystem with automatic file watching and reloading, perfect for managing large template files externally.

## Features

- 📁 **File-based Templates**: Load HTML templates from the filesystem instead of embedding them in flows
- 🔄 **Auto-reload**: Automatically watches template files for changes and reloads content
- 🎯 **Mustache Support**: Built-in support for Mustache/Handlebars-style variable substitution
- 📊 **Status Indicators**: Visual feedback on file load status and errors
- 🛡️ **Error Handling**: Graceful fallback to inline templates when files are unavailable
- ⚡ **Performance**: Only reloads files when they actually change (based on modification time)

## Installation

### Via Node-RED Palette Manager
1. Go to Node-RED settings → Manage Palette → Install
2. Search for `node-red-contrib-file-template`
3. Click Install

### Via npm
```bash
cd ~/.node-red
npm install node-red-contrib-file-template
```

### Manual Installation
```bash
git clone https://github.com/yourusername/node-red-contrib-file-template.git
cd node-red-contrib-file-template
npm install
npm link
cd ~/.node-red
npm link node-red-contrib-file-template
```

## Usage

### Basic Usage

1. Drag the **file-template** node from the function category into your flow
2. Double-click to configure:
   - **Template File**: Path to your HTML template file (e.g., `templates/dashboard.html`)
   - **Template Data**: Message property containing data for substitution (default: `payload`)
   - **Template Format**: Choose Handlebars/Mustache for variable substitution or Plain HTML
3. Connect your data source to the input
4. Connect the output to a dashboard template node or HTTP response

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| **Name** | Node display name | (auto-generated) |
| **Template File** | Path to template file relative to Node-RED working directory | *required* |
| **Template Format** | `handlebars` for variable substitution, `plain` for static HTML | `handlebars` |
| **Template Data** | Message property containing template data | `payload` |
| **Output** | Set `msg.template` as `string` or `parsed` object | `str` |
| **Fallback Template** | Optional inline template if file loading fails | (empty) |

### Example Flow

```json
[
    {
        "id": "template-node",
        "type": "file-template",
        "name": "Dashboard Template",
        "filename": "templates/TodoList.html",
        "format": "handlebars",
        "field": "payload",
        "fieldType": "msg",
        "output": "str"
    }
]
```

## Template Syntax

### Variable Substitution
Use Mustache-style syntax for variable substitution:

**Template File** (`templates/dashboard.html`):
```html
<div class="dashboard">
    <h1>{{title}}</h1>
    <p>Welcome, {{user.name}}!</p>
    <div class="stats">
        <span>Total Items: {{stats.total}}</span>
        <span>Completed: {{stats.completed}}</span>
    </div>
</div>
```

**Input Message**:
```javascript
{
    "payload": {
        "title": "My Dashboard",
        "user": {
            "name": "John Doe"
        },
        "stats": {
            "total": 25,
            "completed": 18
        }
    }
}
```

**Output** (`msg.template`):
```html
<div class="dashboard">
    <h1>My Dashboard</h1>
    <p>Welcome, John Doe!</p>
    <div class="stats">
        <span>Total Items: 25</span>
        <span>Completed: 18</span>
    </div>
</div>
```

### Nested Properties
Access nested object properties using dot notation:
```html
<p>{{user.profile.email}}</p>
<p>{{settings.theme.primaryColor}}</p>
```

### Default Values
If a variable doesn't exist, it will be replaced with an empty string:
```html
<p>{{nonexistent.property}}</p>  <!-- Results in: <p></p> -->
```

## File Watching

The node automatically watches your template files for changes:

- ✅ **File Modified**: Automatically reloads content when you save changes
- ⚠️ **File Deleted**: Shows warning status, falls back to inline template if available
- 🔄 **File Restored**: Automatically detects when file is restored and reloads
- 📊 **Status Updates**: Visual indicators show current file status

## Status Indicators

| Color | Meaning |
|-------|---------|
| 🟢 **Green** | Template file loaded successfully |
| 🟡 **Yellow** | Using fallback inline template |
| 🔴 **Red** | Error loading file or processing template |
| ⚪ **Grey** | No file specified or node inactive |

## Output Format

The node adds the processed template to `msg.template` and includes metadata:

```javascript
{
    "template": "<html>...</html>",  // Processed template content
    "_fileTemplate": {               // Metadata
        "filename": "templates/dashboard.html",
        "lastModified": 1640995200000,
        "length": 2048,
        "format": "handlebars"
    }
}
```

## Use Cases

### Dashboard Templates
Perfect for Node-RED dashboards with large HTML templates:
```
[data source] → [file-template] → [dashboard template]
```

### Web Applications
Generate dynamic web pages:
```
[HTTP request] → [data processing] → [file-template] → [HTTP response]
```

### Email Templates
Create dynamic email content:
```
[trigger] → [user data] → [file-template] → [email sender]
```

### Report Generation
Generate HTML reports from data:
```
[database query] → [data formatting] → [file-template] → [PDF converter]
```

## Advanced Features

### Multiple Data Sources
Pull template data from different contexts:
- `msg` - From incoming message (default)
- `flow` - From flow context
- `global` - From global context

### Error Recovery
- Automatic retry on file system errors
- Fallback to inline template content
- Graceful handling of malformed templates
- Detailed error logging

### Performance Optimization
- File content caching
- Modification time checking (only reload when changed)
- Efficient file watching with chokidar
- Memory-efficient string processing

## Troubleshooting

### Common Issues

**Template file not found**
- Verify the file path is relative to Node-RED working directory
- Check file permissions
- Ensure the file exists and is readable

**Variables not substituting**
- Verify the input data structure matches your template variables
- Check that the data is in the specified message property (`payload` by default)
- Ensure you're using correct Mustache syntax: `{{variable}}`

**File watching not working**
- Some file systems (like network drives) may not support file watching
- Restart Node-RED if file watching stops working
- Check Node-RED logs for file watcher errors

### Debug Tips

1. **Check Status**: Node status indicator shows current state
2. **View Logs**: Check Node-RED debug panel for detailed error messages
3. **Test Data**: Use a debug node to verify your input data structure
4. **File Permissions**: Ensure Node-RED has read access to template files

## Development

### Local Development
```bash
git clone https://github.com/yourusername/node-red-contrib-file-template.git
cd node-red-contrib-file-template
npm install
npm link
cd ~/.node-red
npm link node-red-contrib-file-template
# Restart Node-RED
```

### Testing
```bash
npm test
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/node-red-contrib-file-template/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/node-red-contrib-file-template/discussions)
- 📧 **Email**: your.email@example.com

## Related Nodes

- [node-red-contrib-file-function](https://flows.nodered.org/node/node-red-contrib-file-function) - File-based function nodes
- [node-red-dashboard](https://flows.nodered.org/node/node-red-dashboard) - Dashboard templates
- [node-red-node-email](https://flows.nodered.org/node/node-red-node-email) - Email integration
