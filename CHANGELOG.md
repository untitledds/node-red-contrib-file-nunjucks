# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2025-01-09

### Removed
- **Example Files**: Completely removed examples directory and all references to example template files
  - Eliminated source of installation issues where users tried to import non-existent example flows
  - Updated test.js to use inline template instead of external file references
  - Cleaner package with no unnecessary example files that could cause confusion

### Changed
- **Testing**: test.js now uses inline template for testing instead of external file
- **Package Size**: Smaller package without example files

## [1.1.3] - 2025-01-07

### Fixed - Example Flow Issues
- **Broken Example Template**: Fixed example flow that referenced non-existent template file
  - Issue: Example flow used `"examples/templates/sample-dashboard.html"` which doesn't exist in user installations
  - Solution: Converted to inline template that works immediately after import
  - Users can now import and use the example flow without crashes or missing file errors

### Changed
- **Example Flow**: Main example now uses safe inline template instead of external file reference
- **User Experience**: Example works immediately after import without requiring external files

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
