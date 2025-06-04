# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-06-04

### Added
- Initial release of node-red-contrib-file-template
- File-based HTML template loading with automatic file watching
- Mustache/Handlebars-style variable substitution ({{variable}})
- Support for nested object properties ({{user.name}})
- Automatic file change detection and reloading using chokidar
- Visual status indicators for file load status
- Graceful error handling with fallback to inline templates
- Support for multiple data sources (msg, flow, global context)
- Comprehensive configuration options in Node-RED editor
- File picker button for easy template file selection
- Metadata output with file information (_fileTemplate)
- Template format options (handlebars/plain)
- Output format options (string/parsed)
- Example templates and flows for demonstration
- Comprehensive documentation and usage examples

### Features
- 📁 File-based template management
- 🔄 Automatic file watching and reloading
- 🎯 Mustache-style variable substitution
- 📊 Visual status feedback
- 🛡️ Error handling and fallback support
- ⚡ Performance optimized with file caching
- 🔧 Flexible configuration options
- 📝 Complete documentation and examples

### Dependencies
- chokidar: ^3.5.3 (for file watching)
- Node.js: >=12.0.0
- Node-RED: Compatible with current versions 
