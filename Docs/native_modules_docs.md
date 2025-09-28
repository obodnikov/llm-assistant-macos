# 🔧 Native Modules Documentation

## Overview

The LLM Assistant includes three native modules that provide deep macOS system integration:

- **Text Selection** - Global text selection monitoring and retrieval
- **Context Menu** - System-wide right-click context menu integration  
- **Accessibility** - macOS Accessibility APIs for text manipulation and UI automation

## Features Enabled by Native Modules

### 🎯 Enhanced Functionality
- **Global Text Selection**: Monitor text selection anywhere in the system
- **Smart Context Menus**: Right-click on any text to access AI assistance
- **Direct Text Insertion**: Insert AI responses directly into any application
- **System-wide Hotkeys**: Additional keyboard shortcuts for quick actions
- **Advanced Mail Integration**: Deeper integration with Mail.app

### ⚡ Quick Actions Available
- `Cmd + Option + L` - Open Assistant Panel (always available)
- `Cmd + Option + S` - Quick Summarize (requires native modules)
- `Cmd + Option + T` - Quick Translate (requires native modules)  
- `Cmd + Option + I` - Quick Improve (requires native modules)

## Requirements

### System Requirements
- **macOS 10.15** (Catalina) or later
- **Xcode Command Line Tools**
- **Node.js 18+** with npm
- **Python 3** (for node-gyp)

### Permissions Required
- **Accessibility Permission** - Required for all native module functionality
- **Input Monitoring** - Required for global hotkeys and text selection

## Installation & Build

### 1. Install Dependencies

```bash
# Install Xcode command line tools
xcode-select --install

# Install Node.js dependencies
npm install

# Install native module build tools
npm install -g node-gyp
```

### 2. Build Native Modules

```bash
# Build all native modules
npm run build-native

# Or build individually
npm run clean-native
npm run install-native
```

### 3. Test Installation

```bash
# Test if modules load correctly
npm run test-native

# Check macOS permissions
npm run check-permissions
```

## Project Structure

```
llm-assistant-macos/
├── binding.gyp                    # Native modules build configuration
├── native-modules/                # Native module source code
│   ├── index.js                   # JavaScript wrapper/interface
│   ├── text-selection/
│   │   └── text_selection.mm      # Text selection native code
│   ├── context-menu/
│   │   └── context_menu.mm        # Context menu native code
│   └── accessibility/
│       └── accessibility.mm       # Accessibility APIs native code
├── build/Release/                 # Built .node files (created after build)
│   ├── text_selection.node
│   ├── context_menu.node
│   └── accessibility.node
└── scripts/
    ├── build-native.js            # Build automation script
    ├── test-native-modules.js     # Testing script
    └── check-permissions.js       # Permission checker
```

## Usage Examples

### JavaScript Integration

```javascript
// Import native modules
const { nativeModules } = require('./src/native-modules');

// Initialize modules
await nativeModules.initialize();

// Check availability
const status = nativeModules.getStatus();
console.log('Native modules status:', status);

// Use text selection
const selection = await nativeModules.textSelection.getSelectedText();
console.log('Selected text:', selection.text);

// Register context menu
const menuItems = [
  { title: '✨ Improve Text', action: 'improve' },
  { title: '📝 Summarize', action: 'summarize' }
];

nativeModules.contextMenu.registerContextMenu(menuItems, (data) => {
  console.log('Menu action:', data.action, data.text);
});

// Start monitoring
nativeModules.textSelection.startMonitoring((data) => {
  console.log('Text selected:', data);
});

// Insert text at cursor
const success = await nativeModules.accessibility.insertTextAtCursor('Hello, World!');
console.log('Text inserted:', success);
```

### Renderer Process Usage

```javascript
// Check native modules availability
const status = await window.nativeModulesAPI.getStatus();
if (status.available) {
  console.log('Native modules ready!');
}

// Get selected text
const selectedText = await window.systemAPI.getSelectedText();

// Insert text with smart replacement
const inserted = await window.assistantUtils.smartTextReplace('New text content');

// Quick copy with notification  
await window.assistantUtils.quickCopy('Text to copy');

// Get current context
const context = await window.assistantUtils.getCurrentContext();
console.log('Current context:', context);
```

## API Reference

### Text Selection Module

#### Methods
```javascript
// Start monitoring global text selection
startMonitoring(callback)
// callback: (data) => { text, appName, x, y }

// Stop monitoring
stopMonitoring()

// Get currently selected text
getSelectedText()
// Returns: { text, appName, x, y }
```

### Context Menu Module

#### Methods
```javascript
// Register context menu items
registerContextMenu(menuItems, callback)
// menuItems: [{ title, action, icon? }]
// callback: (data) => { action, text }

// Start listening for right-clicks
startListening()

// Stop listening
stopListening()

// Show context menu at coordinates
showContextMenu(x, y, selectedText?)
```

### Accessibility Module

#### Methods
```javascript
// Check accessibility permissions
checkPermissions()
// Returns: boolean

// Request accessibility permissions
requestPermissions()
// Returns: boolean

// Get frontmost application
getFrontmostApplication()
// Returns: { name, bundleId, pid }

// Get application windows
getApplicationWindows(pid)
// Returns: [{ title, position, size, focused }]

// Get focused element
getFocusedElement()
// Returns: { role, value, selectedText, selectedRange }

// Set text in focused element
setFocusedElementText(text)
// Returns: boolean

// Insert text at cursor
insertTextAtCursor(text)
// Returns: boolean

// Simulate key press
simulateKeyPress(keyCode, command?, shift?, option?, control?)
// Returns: boolean

// Get element at point
getElementAtPoint(x, y)
// Returns: { role, description }
```

## Troubleshooting

### Build Issues

#### "Xcode Command Line Tools Not Found"
```bash
# Install Xcode command line tools
xcode-select --install

# Verify installation
xcode-select -p
```

#### "Python Not Found"
```bash
# Install Python 3 via Homebrew
brew install python3

# Or use system Python
which python3
```

#### "node-gyp Build Failed"
```bash
# Clean and rebuild
npm run clean-native
npm cache clean --force
npm run build-native

# Check node-gyp logs
npm run build-native --verbose
```

### Runtime Issues

#### "Accessibility Permissions Required"
1. Go to **System Preferences** → **Security & Privacy** → **Privacy**
2. Select **Accessibility** in the sidebar
3. Click the lock icon and enter your password
4. Click **+** and add **LLM Assistant**
5. Ensure the checkbox is checked
6. Restart the app

#### "Native Modules Not Loading"
```bash
# Test if modules were built correctly
npm run test-native

# Check if .node files exist
ls -la build/Release/*.node

# Try rebuilding
npm run rebuild
```

#### "Context Menu Not Appearing"
- Ensure accessibility permissions are granted
- Check that context menu is registered: `nativeModules.contextMenu.isListening`
- Verify text is selected when right-clicking
- Check console for error messages

### Performance Issues

#### "High CPU Usage"
- Native modules use event taps which can consume CPU
- Disable monitoring when not needed:
  ```javascript
  nativeModules.textSelection.stopMonitoring();
  nativeModules.contextMenu.stopListening();
  ```

#### "Memory Leaks"
- Native modules properly clean up resources
- Call cleanup on app quit:
  ```javascript
  app.on('will-quit', () => {
    nativeModules.cleanup();
  });
  ```

## Development

### Building from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/llm-assistant-macos.git
   cd llm-assistant-macos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create native module source files**
   - Copy the C++/Objective-C code from the artifacts
   - Place `text_selection.mm` in `native-modules/text-selection/`
   - Place `context_menu.mm` in `native-modules/context-menu/`
   - Place `accessibility.mm` in `native-modules/accessibility/`

4. **Build native modules**
   ```bash
   npm run build-native
   ```

5. **Test the build**
   ```bash
   npm run test-native
   npm run check-permissions
   ```

6. **Start development**
   ```bash
   npm run dev
   ```

### Code Structure

#### Native Module Architecture
```
C++/Objective-C (.mm files)
       ↓
Node.js Native Addons (.node)
       ↓  
JavaScript Wrapper (index.js)
       ↓
IPC Bridge (preload.js)
       ↓
Renderer Process (assistant.js)
```

#### Adding New Native Functionality

1. **Add C++/Objective-C code** to appropriate `.mm` file
2. **Export function** in the native module's `Initialize` function
3. **Add JavaScript wrapper** in `native-modules/index.js`
4. **Add IPC handler** in `main-enhanced.js`
5. **Expose to renderer** in `preload-enhanced.js`
6. **Use in UI** via the exposed APIs

### Testing

```bash
# Test all native modules
npm run test-native

# Test specific functionality
node -e "
const { nativeModules } = require('./src/native-modules');
nativeModules.initialize().then(() => {
  console.log('Status:', nativeModules.getStatus());
});
"

# Test permissions
npm run check-permissions
```

## Security Considerations

### Permissions
- Native modules require powerful system permissions
- Only grant accessibility permissions to trusted applications
- The app requests minimal necessary permissions

### Code Signing
For distribution outside development:
```bash
# Sign the native modules
codesign --force --sign "Developer ID Application: Your Name" build/Release/*.node

# Sign the entire app
codesign --force --deep --sign "Developer ID Application: Your Name" dist/mac/LLM\ Assistant.app
```

### Privacy
- Native modules can access any text on screen
- No text is logged or transmitted outside the app
- All processing respects the app's privacy filtering

## Fallback Behavior

When native modules are not available:
- **Text Selection**: Falls back to AppleScript-based clipboard monitoring
- **Context Menu**: Feature disabled, shows notification
- **Text Insertion**: Falls back to clipboard + manual paste
- **Accessibility**: Limited to AppleScript-based operations

The app remains fully functional with reduced capabilities.

## Contributing

### Guidelines
1. Follow existing code style and patterns
2. Test thoroughly on multiple macOS versions
3. Ensure proper resource cleanup
4. Document any new APIs
5. Consider fallback implementations

### Pull Request Process
1. Create feature branch: `git checkout -b feature/new-native-feature`
2. Make changes and test: `npm run test-native`
3. Update documentation if needed
4. Submit pull request with detailed description

## Support

### Getting Help
- **GitHub Issues**: [Report bugs and request features](https://github.com/yourusername/llm-assistant-macos/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/yourusername/llm-assistant-macos/discussions)
- **Documentation**: This guide and inline code comments

### Known Limitations
- macOS only (native modules use Cocoa/Core Foundation)
- Requires accessibility permissions for full functionality
- Some sandboxed apps may not be accessible
- Performance impact from global event monitoring

### Future Enhancements
- [ ] Support for additional text manipulation operations
- [ ] Integration with more system services
- [ ] Performance optimizations for event monitoring
- [ ] Additional context menu customization options
- [ ] Support for custom UI element interactions

---

**Note**: Native modules provide advanced system integration but are optional. The LLM Assistant works without them using fallback implementations, though with reduced functionality.