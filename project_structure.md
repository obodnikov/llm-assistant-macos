# 🏗️ LLM Assistant - Project Setup Guide

## 📁 Complete Directory Structure

Current folder structure of the LLM Assistant project:

```
llm-assistant-macos/
├── package.json                 # Project configuration & dependencies
├── README.md                    # Main documentation
├── AI.md                        # AI integration notes
├── PROJECT_COMPLETE.md          # Project completion status
├── project_structure.md         # This file
├── .gitignore                   # Git ignore file
├── binding.gyp                  # Native module build configuration
│
├── src/                         # Source code
│   ├── main/                    # Electron main process
│   │   ├── main.js              # App entry point & system integration
│   │   └── modelManager.js      # AI model configuration manager
│   │
│   ├── renderer/                # UI layer (web technologies)
│   │   ├── index.html           # Main window (dev only)
│   │   ├── assistant.html       # Assistant panel UI
│   │   ├── css/
│   │   │   └── assistant.css    # Native macOS styling
│   │   └── js/
│   │       └── assistant.js     # Assistant panel logic
│   │
│   └── preload/                 # Security bridge
│       └── preload.js           # IPC communication layer
│
├── scripts/                     # Build & setup scripts
│   ├── setup-wizard.js          # Interactive configuration
│   └── check-permissions.js     # Check macOS permissions
│
├── config/                      # Configuration files
│   └── models.json              # AI model configurations (OpenAI, Anthropic, Perplexity, Ollama)
│
├── docs/                        # Documentation
│   ├── SETUP.md                 # Detailed setup guide
│   ├── PRIVACY.md               # Privacy features
│   ├── MODEL_MANAGEMENT.md      # Model management documentation
│   ├── Model_Management_Quick_Reference.md
│   ├── Model_Management_Implementat_on_Guide.md
│   ├── app_icon_guide.md        # Application icon guide
│   ├── integration_guide.md     # System integration guide
│   ├── native_modules_docs.md   # Native modules documentation
│   └── talk-with-clade-about-mvp.md  # Development notes
│
├── assets/                      # Application assets
│   └── icons/                   # App icons (multiple sizes)
│
├── build/                       # Build output (created by node-gyp)
│   ├── Release/                 # Release builds of native modules
│   │   ├── accessibility.node   # Accessibility native module
│   │   ├── context_menu.node    # Context menu native module
│   │   └── text_selection.node  # Text selection native module
│   └── entitlements.mac.plist   # macOS app entitlements
│
├── dist/                        # Distribution files (created by electron-builder)
├── node_modules/                # Dependencies (created by npm install)
│
└── native-modules/              # Native C++ addons for system integration
    ├── index.js                 # Native modules loader
    ├── accessibility/           # macOS accessibility APIs
    │   └── accessibility.mm     # Accessibility implementation (C++)
    ├── context-menu/            # System context menus
    │   └── context_menu.mm      # Context menu implementation (C++)
    └── text-selection/          # Global text selection
        └── text_selection.mm    # Text selection implementation (C++)
```

## 🚀 Setup Instructions

### 1. Create Project Directory
```bash
mkdir llm-assistant-macos
cd llm-assistant-macos
```

### 2. Initialize Project
```bash
npm init -y
```

### 3. Create Directory Structure
```bash
# Source directories
mkdir -p src/main src/renderer/css src/renderer/js src/preload

# Support directories
mkdir -p scripts config docs assets/icons

# Native modules
mkdir -p native-modules/accessibility native-modules/context-menu native-modules/text-selection

# Build directories (will be created automatically)
mkdir -p build dist
```

### 4. Create Files
Copy each artifact from our conversation into the appropriate location:

#### Core Files
- `package.json` → root directory (includes electron-builder config)
- `binding.gyp` → native module build configuration
- `src/main/main.js` → main process entry point
- `src/main/modelManager.js` → AI model manager
- `src/preload/preload.js` → security bridge
- `src/renderer/assistant.html` → assistant UI
- `src/renderer/index.html` → main window (dev mode)
- `src/renderer/css/assistant.css` → styling
- `src/renderer/js/assistant.js` → UI logic
- `scripts/setup-wizard.js` → configuration wizard
- `scripts/check-permissions.js` → permission checker
- `config/models.json` → AI model configurations
- `README.md` → documentation

#### Native Modules (C++)
- `native-modules/index.js` → module loader
- `native-modules/accessibility/accessibility.mm` → accessibility API implementation
- `native-modules/context-menu/context_menu.mm` → context menu implementation
- `native-modules/text-selection/text_selection.mm` → text selection implementation

### 5. Install Dependencies
```bash
npm install
```

This will install:
- `electron` - Desktop app framework
- `openai` - OpenAI API client
- `electron-store` - Secure settings storage
- `electron-window-state` - Window state management
- `electron-builder` - Application packaging
- `node-gyp` - Native addon compiler
- `nan` - Native addon abstraction layer

### 5b. Build Native Modules
```bash
npm run build-native
```

This compiles the C++ native modules:
- accessibility.node - macOS Accessibility API integration
- context_menu.node - System context menu integration
- text_selection.node - Global text selection monitoring

### 6. Run Setup Wizard
```bash
npm run setup-wizard
```

This interactive wizard will:
- Configure your OpenAI API key
- Set privacy preferences
- Choose AI model
- Test the configuration
- Save settings securely

### 7. Start Development
```bash
# Development mode (with DevTools)
npm run dev

# Production mode
npm start
```

## 🔧 Development Workflow

### Daily Development
1. **Start dev mode**: `npm run dev`
2. **Edit code**: Changes auto-reload
3. **Test features**: Use `Cmd + Option + L` to test
4. **Check Mail integration**: Open Mail.app and test context detection

### Testing
- **Manual Testing**: Use the assistant with real email workflows
- **Privacy Testing**: Verify sensitive content filtering works
- **Performance Testing**: Check memory usage and response times
- **Cross-version Testing**: Test with different macOS versions

### Building for Distribution
```bash
# Clean previous builds (if needed)
npm run clean-native

# Build native modules
npm run build-native

# Build the Electron app
npm run build

# Output will be in dist/ folder as .dmg
```

**Important Notes:**
- Native modules are automatically rebuilt during `npm install` (via postinstall hook)
- The `config/` directory is now included in builds, so `models.json` will be available in packaged apps
- All build warnings in native modules have been resolved

## 🔒 Security Considerations

### API Key Storage
- Keys stored encrypted using Electron Store
- Never committed to version control
- Configurable through setup wizard

### Privacy Protection
- All sensitive content filtered before cloud processing
- Visual feedback shows what was filtered
- Configurable filtering patterns

### Code Signing (Future)
For public distribution, you'll need:
- Apple Developer Account
- Code signing certificate
- Notarization setup

## 🎯 Project Status

### Completed Features ✅
- [x] Basic Electron app structure
- [x] Global hotkey activation (`Cmd + Option + L`)
- [x] OpenAI integration with multiple models
- [x] Privacy filtering
- [x] Mail.app context detection
- [x] Native macOS UI with Settings panel
- [x] **Native modules for system text selection**
- [x] **Context menu integration**
- [x] **Multiple AI provider support** (OpenAI, Anthropic, Perplexity, Ollama)
- [x] **Model configuration system** with models.json
- [x] **Accessibility API integration**
- [x] **Build warnings resolved** (all V8 API warnings fixed)
- [x] **Config directory included in builds** (models.json now packages correctly)

### Future Enhancements 🚀
- [ ] Advanced Mail.app features (reply drafting, sentiment analysis)
- [ ] Spotlight integration
- [ ] Touch Bar support
- [ ] App Store distribution
- [ ] Automatic updates

### Deployment Options
1. **GitHub Release**: Direct download from releases
2. **Homebrew**: Package for easy installation
3. **Mac App Store**: Full App Store distribution

## 🤝 Development Tips

### Debugging
- Use `npm run dev` to see console output
- Check DevTools for renderer process debugging (automatically opens in dev mode)
- Monitor main process with console logs
- Use `npm run check-permissions` to verify macOS accessibility permissions

### Testing Native Modules
1. Ensure accessibility permissions are granted (System Preferences → Security & Privacy → Privacy → Accessibility)
2. Test text selection monitoring
3. Test context menu integration
4. Check window/application detection features

### Testing Mail Integration
1. Open Mail.app
2. Compose a new email or view existing emails
3. Activate assistant with `Cmd + Option + L`
4. Verify context detection works

### Testing AI Model Configuration
1. Open Settings panel in the app
2. Verify models load from `config/models.json`
3. Test switching between different AI providers
4. Verify custom model configurations

### Privacy Testing
1. Type sensitive content (API keys, passwords)
2. Verify content gets highlighted and filtered
3. Test with different privacy settings

### Build Troubleshooting

**If native modules fail to build:**
```bash
# Clean and rebuild
npm run clean-native
npm run build-native

# Check node-gyp installation
npm install -g node-gyp

# Verify Xcode command-line tools
xcode-select --install
```

**If models don't load in packaged app:**
- Verify `config/**/*` is in the `files` array in `package.json`
- Check that `config/models.json` exists
- Rebuild the app after changes

This structure gives you a complete, professional Electron app with native macOS integration! The setup wizard makes it easy for users to get started, and the modular structure allows for easy development and maintenance.