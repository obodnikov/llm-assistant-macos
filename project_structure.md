# 🏗️ LLM Assistant - Project Setup Guide

## 📁 Complete Directory Structure

Create this exact folder structure for your LLM Assistant project:

```
llm-assistant-macos/
├── package.json                 # Project configuration & dependencies
├── README.md                    # Main documentation
├── LICENSE                      # MIT license file
├── .gitignore                   # Git ignore file
├── 
├── src/                         # Source code
│   ├── main/                    # Electron main process
│   │   └── main.js              # App entry point & system integration
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
│   ├── build.js                 # Build automation
│   └── notarize.js              # macOS notarization
│
├── config/                      # Configuration files
│   ├── config.example.json      # Template configuration
│   └── privacy-patterns.json    # Sensitive content patterns
│
├── docs/                        # Documentation
│   ├── SETUP.md                 # Detailed setup guide
│   ├── API-KEYS.md              # API configuration help
│   ├── PRIVACY.md               # Privacy features
│   └── DEVELOPMENT.md           # Development guide
│
├── assets/                      # Application assets
│   ├── icons/                   # App icons (multiple sizes)
│   ├── images/                  # Screenshots, demos
│   └── sounds/                  # Notification sounds
│
├── build/                       # Build output (created by npm run build)
├── dist/                        # Distribution files (created by electron-builder)
├── node_modules/                # Dependencies (created by npm install)
│
└── native-modules/              # Future: Native addons for system integration
    ├── text-selection/          # Global text selection
    ├── context-menu/            # System context menus
    └── accessibility/           # macOS accessibility APIs
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
mkdir -p scripts config docs assets/icons assets/images

# Build directories (will be created automatically)
mkdir -p build dist
```

### 4. Create Files
Copy each artifact from our conversation into the appropriate location:

#### Core Files
- `package.json` → root directory
- `src/main/main.js` → main process entry point
- `src/preload/preload.js` → security bridge
- `src/renderer/assistant.html` → assistant UI
- `src/renderer/index.html` → main window (dev mode)
- `src/renderer/css/assistant.css` → styling
- `src/renderer/js/assistant.js` → UI logic
- `scripts/setup-wizard.js` → configuration wizard
- `README.md` → documentation

### 5. Install Dependencies
```bash
npm install
```

This will install:
- `electron` - Desktop app framework
- `openai` - OpenAI API client
- `electron-store` - Secure settings storage
- `node-applescript` - Mail.app integration
- `electron-window-state` - Window state management
- Development tools and build system

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
# Build the app
npm run build

# Output will be in dist/ folder as .dmg
```

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

## 🎯 Next Steps

### MVP Features (Current)
- [x] Basic Electron app structure
- [x] Global hotkey activation
- [x] OpenAI integration
- [x] Privacy filtering
- [x] Mail.app context detection
- [x] Native macOS UI

### Future Enhancements
- [ ] Native modules for system text selection
- [ ] Context menu integration
- [ ] Multiple AI provider support
- [ ] Advanced Mail.app features
- [ ] Spotlight integration
- [ ] Touch Bar support

### Deployment Options
1. **GitHub Release**: Direct download from releases
2. **Homebrew**: Package for easy installation
3. **Mac App Store**: Full App Store distribution

## 🤝 Development Tips

### Debugging
- Use `npm run dev` to see console output
- Check DevTools for renderer process debugging
- Monitor main process with console logs

### Testing Mail Integration
1. Open Mail.app
2. Compose a new email or view existing emails
3. Activate assistant with `Cmd + Option + L`
4. Verify context detection works

### Privacy Testing
1. Type sensitive content (API keys, passwords)
2. Verify content gets highlighted and filtered
3. Test with different privacy settings

This structure gives you a complete, professional Electron app with all the features we discussed! The setup wizard makes it easy for users to get started, and the modular structure allows for easy development and maintenance.