# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2025-06-09

### Added

- **File Editor Interface**: Added a built-in text editor for template content in the node configuration
- **Load File Button**: Click to populate the editor with current file content
- **Save to File Button**: Write editor changes directly back to the filesystem
- **Auto-load Functionality**: File content automatically loads when filename is specified
- **Real-time File Info**: Shows file size, modification time, and status updates
- **Content Preview**: See template content without leaving the Node-RED editor

### Enhanced

- **Better UX**: Edit template files without switching between Node-RED and external editors
- **Safety Features**: Confirmation dialog before overwriting files
- **Status Feedback**: Clear status messages for load/save operations
- **Monospace Editor**: Proper code formatting with syntax highlighting-ready interface

### Technical

- Added HTTP endpoints: `/file-template/load-file` and `/file-template/save-file`
- Enhanced configuration UI with responsive textarea editor
- Improved error handling for file operations

## [1.1.3] - 2025-06-07

### Removed
- **Example Files**: Completely removed examples directory and all references to example template files
  - Eliminated source of installation issues where users tried to import non-existent example flows
  - Updated test.js to use inline template instead of external file references
  - Cleaner package with no unnecessary example files that could cause confusion

### Changed
- **Testing**: test.js now uses inline template for testing instead of external file
- **Package Size**: Smaller package without example files

## [1.1.2] - 2025-01-07

### Fixed - Critical Boot Processing Bug
- **Load on Boot Crash**: Fixed Node-RED server crash when "Load on Boot" option was enabled
  - Issue: `node.emit('input', bootMsg)` was missing required `send` and `done` callback parameters
  - Solution: Refactored to use internal `processMessage()` function shared by both input handler and boot processing
  - Added safety checks to ensure Node-RED is fully initialized before boot processing
  - Improved error handling with proper status updates for boot operations

### Technical Details
- Eliminated unsafe `node.emit('input')` call that caused missing callback parameters
- Created shared `processMessage()` function for consistent template processing
- Added `setImmediate()` + `setTimeout()` for proper initialization timing
- Enhanced boot error reporting with detailed status indicators
- Maintains full functionality while preventing server crashes

### Changed
- Refactored internal message processing architecture
- Improved boot timing with dual-stage initialization check
- Enhanced error handling and logging for boot operations

## [1.1.1] - 2025-01-07

### Fixed - Critical Boot Processing Bug
- **Load on Boot Crash**: Fixed Node-RED server crash when "Load on Boot" option was enabled
  - Issue: `node.emit('input', bootMsg)` was missing required `send` and `done` callback parameters
  - Solution: Refactored to use internal `processMessage()` function shared by both input handler and boot processing
  - Added safety checks to ensure Node-RED is fully initialized before boot processing
  - Improved error handling with proper status updates for boot operations

### Technical Details
- Eliminated unsafe `node.emit('input')` call that caused missing callback parameters
- Created shared `processMessage()` function for consistent template processing
- Added `setImmediate()` + `setTimeout()` for proper initialization timing
- Enhanced boot error reporting with detailed status indicators
- Maintains full functionality while preventing server crashes

### Changed
- Refactored internal message processing architecture
- Improved boot timing with dual-stage initialization check
- Enhanced error handling and logging for boot operations

## [1.1.0] - 2025-01-07

### Added
- **Load on Boot functionality** - Automatically process templates when Node-RED starts up
- **Boot Delay configuration** - Configurable delay (default 1000ms) before processing template on startup
- **Boot Data configuration** - JSON data for template variable substitution on boot
- **Enhanced UI** - Collapsible boot settings section in configuration dialog
- **Better documentation** - Clearer help text explaining template vs. data concepts

### Features
- 🚀 Automatic template processing on Node-RED startup
- ⏱️ Configurable boot delay for proper initialization timing
- 📋 Boot data configuration for template variables
- 🎨 Improved UI with conditional visibility of boot settings
- 📚 Enhanced documentation and examples

### Changed
- Version bumped to 1.1.0
- Updated package description to include boot processing
- Improved help text and configuration labels

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
