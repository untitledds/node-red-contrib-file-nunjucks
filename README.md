# node-red-contrib-file-nunjucks

**A powerful Node-RED node for rendering Nunjucks (Jinja2-style) templates from files or inline, with support for inheritance, blocks, filters and Markdown.**

## ✨ Features

- 📁 **File-based Templates**: Load Nunjucks/Markdown templates from the filesystem
- 🔄 **Auto-reload**: Watches template files and reloads on changes
- 🧩 **Template Inheritance**: Full support for `{% extends %}` and `{% block %}`
- 🧮 **Logic Support**: If statements, loops, macros, async tags
- 🎯 **Multiple Engines**: Choose between Mustache, Handlebars or Nunjucks
- 📊 **Status Indicators**: Visual feedback on file load status and errors
- 🛡️ **Error Handling**: Fallback to inline templates when files are unavailable
- ⚙️ **Editor Integration**: Snippets & autocomplete in Node-RED editor
- 📝 **Markdown Ready**: Output remains as Markdown if needed
- ⚡ **Performance**: Efficient caching and change detection

---

## 🔧 Installation

### Via Node-RED Palette Manager
1. Go to Node-RED settings → Manage Palette → Install
2. Search for `node-red-contrib-file-nunjucks`
3. Click Install

### Via npm
```bash
cd ~/.node-red
npm install node-red-contrib-file-nunjucks
```

### Manual Installation
```bash
git clone https://github.com/untitledds/node-red-contrib-file-nunjucks.git  
cd node-red-contrib-file-nunjucks
npm install
npm link
cd ~/.node-red
npm link node-red-contrib-file-nunjucks
```

> ⚠️ Make sure you have installed `nunjucks`:
```bash
npm install nunjucks
```

---

## 💡 Usage

### Basic Usage

1. Drag the **File Nunjucks** node into your flow (under the `template` category)
2. Double-click to configure:
   - **Template File**: Path to your `.md` or `.njk` file (e.g., `templates/incident.njk`)
   - **Engine**: Choose: `mustache`, `handlebars`, or `nunjucks`
   - **Data Source**: Message property containing data (default: `payload`)
   - **Output Format**: Set `msg.template` as `string` or `parsed JSON` (if applicable)

3. Connect your data source to the input
4. Use output in Dashboard, Email, Debug, etc.

---

## 📄 Example Flow

```json
[
    {
        "id": "nunjucks-node",
        "type": "file-nunjucks",
        "name": "Incident Report",
        "filename": "templates/incident.njk",
        "engine": "nunjucks",
        "field": "payload",
        "fieldType": "msg",
        "output": "str"
    }
]
```

---

## 📄 Template Syntax Examples

### Base Template (`base.njk`)
```njk
# {{ title }}

{% block content %}
Default content
{% endblock %}
```

### Child Template (`incident.njk`)
```njk
{% extends "base.njk" %}

{% block content %}
## Incident Details
- **Event**: {{ alert.event }}
- **Severity**: {{ alert.severity }}
- **Tags**:
  {% for tag in alert.tags %}
  - {{ tag }}
  {% endfor %}
{% endblock %}
```

### Input Message
```json
{
  "payload": {
    "alert": {
      "event": "High CPU Load",
      "severity": "critical",
      "tags": ["production", "server"]
    },
    "title": "System Alert"
  }
}
```

### Output (Markdown)
```markdown
# System Alert

## Incident Details
- **Event**: High CPU Load
- **Severity**: critical
- **Tags**:
  - production
  - server
```

---

## 🧩 Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| **Name** | Node display name | (auto-generated) |
| **Template File** | Path to template file (optional) | *none* |
| **Engine** | Template engine: mustache / handlebars / nunjucks | `nunjucks` |
| **Inline Template** | Inline template content (fallback) | *empty* |
| **Data Source** | Message property with template data (`payload` by default) | `payload` |
| **Source Type** | Where to get data from: `msg`, `flow`, `global` | `msg` |
| **Output** | Output format: `str` or `parsed` | `str` |

---

## 🖥️ Editor Snippets

✅ Built-in snippets for Jinja2/Nunjucks syntax:

| Shortcut | Inserts |
|---------|---------|
| `block` | `{% block %}...{% endblock %}` |
| `extends` | `{% extends "..." %}` |
| `include` | `{% include "..." %}` |
| `if` | `{% if %}...{% endif %}` |
| `for` | `{% for %}...{% endfor %}` |
| `var` | `{{ variable }}` |
| `filter` | `| filter` |
| `comment` | `{# comment #}` |

---

## 📁 File Watching

The node automatically watches your template files for changes:

- ✅ **File Modified**: Automatically reloads content when saved
- ⚠️ **File Deleted**: Shows warning, falls back to inline template
- 🔄 **File Restored**: Detects and reloads automatically
- 📊 **Status Updates**: Visual indicators show current file status

---

## 🌈 Status Indicators

| Color | Meaning |
|-------|---------|
| 🟢 **Green** | Template file loaded successfully |
| 🟡 **Yellow** | Using fallback inline template |
| 🔴 **Red** | Error loading file or processing template |
| ⚪ **Grey** | No file specified or node inactive |

---

## 📤 Output Format

The processed template is added to `msg.template` and includes metadata:

```javascript
{
    "template": "# System Alert\n...",
    "_fileTemplate": {
        "filename": "templates/incident.njk",
        "lastModified": 1718000000,
        "length": 256,
        "engine": "nunjucks"
    }
}
```

---

## 🧰 Use Cases

### 📋 Markdown Reports
Generate dynamic reports in Markdown:
```bash
[data] → [file-nunjucks] → [debug/email/http]
```

### 📬 Email Templates
Render HTML or plain text emails dynamically:
```bash
[trigger] → [data] → [file-nunjucks] → [email sender]
```

### 📊 Dashboard UI
Use Nunjucks templates inside Node-RED Dashboard:
```bash
[file-nunjucks] → [ui_template]
```

### 📄 Document Generation
Create templates for PDF, DOCX, etc.:
```bash
[data query] → [file-nunjucks] → [pdf converter]
```

---

## 🛠 Advanced Features

### Multiple Data Sources
Pull template data from:
- `msg` - From incoming message (default)
- `flow` - From flow context
- `global` - From global context

### Filters & Macros
Register custom filters/macros in context:
```js
context.nj.addFilter('uppercase', str => str.toUpperCase());
```

### Async Support
Support for asynchronous tags like `{% asyncEach %}`

### Partials
Use `{% include %}` and `{% import %}` for reusable components

---

## 🔍 Troubleshooting

### Common Issues

**Template file not found**
- Check path is relative to Node-RED working directory
- Ensure file exists and has proper permissions

**Variables not substituting**
- Verify data structure matches your template keys
- Ensure correct engine selected (`nunjucks` vs `mustache`)

**File watching not working**
- Some systems (like Docker or network drives) may have issues
- Restart Node-RED if it stops detecting changes

---

## 🔄 Fork Notice

This project is a maintained fork of the original [node-red-contrib-file-template](https://github.com/DanEdens/node-red-contrib-file-template ) created by [@DanEdens](https://github.com/DanEdens ).

The original repository has been extended to support:
- Nunjucks (Jinja2-style) templates with inheritance and blocks
- Markdown-ready output
- Enhanced editor snippets and autocomplete
- Full support for modern template workflows

All credits for the initial implementation go to Dan Edens.

---

## 🛡️ License

MIT License — see [LICENSE](LICENSE) for details

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Make changes
4. Add tests where applicable
5. Submit a PR

---

## 📣 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/untitledds/node-red-contrib-file-nunjucks/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/untitledds/node-red-contrib-file-nunjucks/discussions)

---

## 🔄 Related Nodes

- [node-red-dashboard](https://flows.nodered.org/node/node-red-dashboard) – For UI rendering
- [node-red-node-email](https://flows.nodered.org/node/node-red-node-email) – Send templated emails
- [node-red-contrib-ui-template](https://flows.nodered.org/node/node-red-contrib-ui-template) – Custom dashboard widgets
- [node-red-contrib-file-template](https://github.com/DanEdens/node-red-contrib-file-template) - 

---