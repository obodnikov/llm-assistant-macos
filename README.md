# 🤖 LLM Assistant for macOS

AI-powered assistant with **native macOS integration** and **Mail.app support**. Get intelligent help with email composition, text processing, and more using OpenAI's GPT models.

![Version](https://img.shields.io/badge/version-0.4.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![macOS](https://img.shields.io/badge/macOS-11.0+-blue)
![Node](https://img.shields.io/badge/node-24.9.0-brightgreen)

## ✨ Features

### 🎯 Native macOS Integration
- **C++/Objective-C Modules**: Deep system-level integration
- **Real-time Text Selection**: Monitor text selection system-wide
- **Context Menus**: Right-click integration in any app
- **Direct Text Manipulation**: Insert text at cursor position
- **Window Management**: Access window and application information

### 📧 Mail.app Intelligence
- **Smart Context Detection**: Automatically detects viewing/composing emails
- **Email Content Extraction**: Reads email content, subject, sender
- **Quick Actions**: Summarize, translate, improve, draft reply
- **Edit-Before-Process**: Customize prompts before processing
- **Graceful Fallbacks**: Works even when Mail.app not active

### 🔒 Privacy & Security
- **Local Content Filtering**: Sensitive data filtered before cloud processing
- **Automatic Detection**: API keys, credentials, financial information
- **Visual Feedback**: Highlighted sensitive content with warnings
- **Secure Storage**: API keys stored in macOS Keychain
- **No Data Retention**: Content not stored locally or in logs

### 🚀 Performance
- **Native Module Performance**: Fast C++ modules for system operations
- **Graceful Degradation**: AppleScript fallbacks when native unavailable
- **Memory Efficient**: Optimized for low memory footprint
- **Quick Response**: Optimized API calls and processing

## 🚀 Quick Start

### Prerequisites
- **macOS**: 11.0 (Big Sur) or later
- **Node.js**: 24.9.0 or compatible
- **Xcode Command Line Tools**: For building native modules
- **OpenAI API key**: [Get one here](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/obodnikov/llm-assistant-macos.git
cd llm-assistant-macos

# Install dependencies (builds native modules automatically)
npm install

# Verify native modules
npm run check-permissions

# Start the application
npm start
```

### First Run Setup

1. **Grant Permissions** when prompted:
   - ✅ Accessibility Access (required)
   - ✅ Automation for Mail.app (required for Mail features)

2. **Configure API Key**:
   - Click Settings icon (⚙️)
   - Paste OpenAI API key
   - Select preferred model

3. **Test It**:
   - Open Mail.app, select an email
   - Press `Cmd+Option+L`
   - Click "Summarize"

## 📖 Usage

### Global Access
- **Hotkey**: `Cmd+Option+L` - Toggle assistant from anywhere
  - Opens on your current desktop/Space
  - Stays visible when switching apps
  - Only hides when you press the hotkey again or click hide button
- **Menu Bar**: Click app icon in menu bar
- **Mail Integration**: Auto-detects when Mail.app is active

### Mail.app Integration

#### Quick Actions
When viewing an email in Mail.app:
- **📝 Summarize** - Extract key points concisely
- **🌐 Translate** - Translate email content
- **✨ Improve** - Enhance clarity and tone
- **💬 Draft Reply** - Generate contextual reply

#### Workflow
1. Open Mail.app and select an email
2. Press `Cmd+Option+L` to open the assistant
3. Click a quick action (e.g., "Summarize")
4. Edit prompt if desired
5. Click "Process"
6. Assistant window stays visible - press `Cmd+Option+L` again to hide

### Custom Prompts
Instead of quick actions, type custom requests:
- "Extract action items from this email"
- "Translate to Spanish with formal tone"
- "Draft a polite decline response"

## ⚙️ Configuration

### Model Selection

**New in v0.3.0**: Flexible model configuration system with support for multiple AI providers.

#### Available Models (OpenAI)
| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **GPT-5** | Medium | Excellent | High | Full flagship model (recommended) |
| **GPT-5 Mini** | Fast | Excellent | Medium | Lightweight, optimized for speed |
| **GPT-5 Nano** | Very Fast | Good | Low | Most cost-effective |
| **GPT-4.1** | Medium | Excellent | High | Superior reasoning and context |
| **GPT-4.1 Mini** | Fast | Very Good | Medium | Balanced performance |
| **GPT-4.1 Nano** | Very Fast | Good | Low | Simple or bulk tasks |

Configure models in Settings or via `config/models.json`. See [MODEL_MANAGEMENT.md](docs/MODEL_MANAGEMENT.md) for adding custom models.

### Privacy Settings
Configure in Settings (⚙️):
- ✅ API Keys filtering (`sk-`, `pk-`, etc.)
- ✅ Credentials filtering (passwords, tokens)
- ✅ Financial data (credit cards, SSN)
- ⚠️ Email addresses (optional)
- ⚠️ Phone numbers (optional)

### Custom Prompts
Customize AI behavior for different actions in Settings (⚙️):
- **System Prompt (Base)** - Core AI personality and behavior
- **Compose Context Addition** - Additional instructions when composing emails
- **Mailbox Context Addition** - Additional instructions when viewing email threads
- **Summarize Prompt** - Template for summarization requests
- **Translate Prompt** - Template for translation requests
- **Improve Prompt** - Template for text improvement requests
- **Reply Prompt** - Template for email reply generation

All prompts support customization to match your specific needs and tone preferences.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd+Option+L` | Toggle assistant (show/hide) |
| `Cmd+Enter` | Process request |
| `Cmd+Q` | Quit application (when assistant is focused) |

**Note:** The assistant window stays visible when switching apps and only hides when you explicitly toggle it with `Cmd+Option+L` or click the hide button.

## 🔧 Native Modules

### What's Included
Three native C++/Objective-C modules provide system-level integration:

1. **Text Selection Module** (`text_selection.node`)
   - Real-time text selection monitoring
   - System-wide text detection
   - Event-driven callbacks

2. **Context Menu Module** (`context_menu.node`)
   - Right-click integration
   - Custom menu actions
   - Cross-application support

3. **Accessibility Module** (`accessibility.node`)
   - Window information access
   - Direct text insertion
   - Application state detection

### Building Native Modules

```bash
# Clean previous builds
npm run clean-native

# Build for Electron
npm run build-native

# Check build status
npm run check-permissions
```

### Troubleshooting

**Module version mismatch:**
```bash
npm run clean-native
npm run build-native
```

**Build failures:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Verify installation
xcode-select -p
```

See [Docs/SETUP.md](Docs/SETUP.md) for detailed troubleshooting.

## 📁 Project Structure

```
llm-assistant-macos/
├── binding.gyp                    # Native modules build config
├── package.json                   # Dependencies & scripts
│
├── native-modules/                # Native C++/Obj-C modules
│   ├── index.js                   # JS wrapper
│   ├── text-selection/
│   │   └── text_selection.mm
│   ├── context-menu/
│   │   └── context_menu.mm
│   └── accessibility/
│       └── accessibility.mm
│
├── build/Release/                 # Compiled native modules
│   ├── accessibility.node
│   ├── context_menu.node
│   └── text_selection.node
│
├── config/
│   └── models.json               # Default model configuration
│
├── src/
│   ├── main/
│   │   ├── main.js               # Main process with native integration
│   │   └── modelManager.js       # Model configuration manager
│   ├── renderer/
│   │   ├── assistant.html        # UI
│   │   ├── css/
│   │   └── js/
│   │       └── assistant.js      # UI logic with native support
│   └── preload/
│       └── preload.js            # IPC bridge with native APIs
│
├── scripts/
│   ├── check-permissions.js      # Permission verification
│   └── setup-wizard.js           # Interactive setup with model selection
│
├── docs/
│   ├── MODEL_MANAGEMENT.md       # Model configuration guide
│   ├── Model_Management_Implementat_on_Guide.md
│   └── Model_Management_Quick_Reference.md
│
└── Docs/
    ├── SETUP.md                  # Detailed setup guide
    ├── integration_guide.md      # Technical integration docs
    └── PRIVACY.md                # Privacy policy
```

## 🛠️ Development

### Running in Development
```bash
# Start with DevTools
npm run dev

# Start normally
npm start

# Build for distribution
npm run build
```

### Key Technologies
- **Electron 28.3.3** - Desktop app framework
- **Node.js v18** (via Electron) - Runtime
- **C++20** - Native modules
- **Objective-C** - macOS integration
- **AppleScript** - Mail.app automation
- **OpenAI API** - AI processing

### Testing
```bash
# Test native modules
node -e "console.log(require('./build/Release/accessibility.node'))"

# Check permissions
npm run check-permissions

# Test Mail integration
# 1. Open Mail.app
# 2. Select an email
# 3. Run: npm start
```

## 📊 System Requirements

### Minimum
- **macOS**: 11.0 (Big Sur)
- **RAM**: 4GB
- **Storage**: 500MB
- **Network**: Internet for API calls

### Recommended
- **macOS**: 12.0 (Monterey) or later
- **RAM**: 8GB+
- **Storage**: 1GB
- **Network**: Stable broadband

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature-name`
3. **Follow** existing code style
4. **Test** thoroughly on macOS
5. **Submit** a pull request

### Development Guidelines
- Use modern JavaScript (ES6+)
- Follow existing project structure
- Document complex logic
- Test privacy filtering thoroughly
- Ensure native modules build successfully

## 📄 Documentation

- **[SETUP.md](Docs/SETUP.md)** - Detailed setup and configuration
- **[integration_guide.md](Docs/integration_guide.md)** - Technical integration details
- **[PRIVACY.md](Docs/PRIVACY.md)** - Privacy policy and data handling
- **[MODEL_MANAGEMENT.md](docs/MODEL_MANAGEMENT.md)** - Model configuration guide
- **[Model_Management_Quick_Reference.md](docs/Model_Management_Quick_Reference.md)** - Quick reference for model management

## 🐛 Known Issues

- Native modules require rebuild when updating Electron version
- Mail.app must be frontmost for context detection
- Some Mail.app windows return generic "window" class name (handled)

See [GitHub Issues](https://github.com/obodnikov/llm-assistant-macos/issues) for current bugs and feature requests.

## 📋 TODO / Roadmap

### Planned Features
- **Apply Button Implementation**: Direct insertion of AI-generated results back to Mail.app or active application
- **Enhanced Context Menu Integration**: System-wide right-click actions for text selection
- **Multi-App Support**: Extend beyond Mail.app to Notes, Messages, and other apps
- **Conversation History**: Save and retrieve previous AI interactions
- **Custom Quick Actions**: User-defined quick action templates
- **Offline Mode**: Local LLM support for privacy-sensitive operations

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Electron** - Desktop app framework
- **OpenAI** - GPT models and API
- **node-gyp** - Native module build system
- **NAN** - Native Abstractions for Node.js
- macOS design patterns and guidelines

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/obodnikov/llm-assistant-macos/issues)
- **Discussions**: [GitHub Discussions](https://github.com/obodnikov/llm-assistant-macos/discussions)
- **Documentation**: [Docs/](Docs/)

## 🔄 Version History

### v0.4.0 (Current)
- ✅ **Improved Window Management**
  - Window now appears on current desktop/Space when invoked
  - Stays visible when switching between applications
  - No longer auto-hides on focus loss
  - Only hides when explicitly toggled with `Cmd+Option+L` or hide button clicked
- ✅ **Automatic State Reset**
  - Conversation state clears when window is reopened
  - Fresh context on each invocation
  - Mail context refreshed automatically
- ✅ **Enhanced User Experience**
  - More predictable window behavior
  - Better multi-desktop support
  - Visible on all Spaces for easy access

### v0.3.0
- ✅ **Flexible Model Configuration System**
  - Support for multiple AI providers (OpenAI, Anthropic, Perplexity, Ollama)
  - Dynamic model loading from `config/models.json`
  - User override configuration in `~/Library/Application Support/llm-assistant-macos/models-override.json`
  - Add/remove models without code changes
- ✅ **New GPT-5 and GPT-4.1 Model Series**
  - GPT-5 (Full flagship), GPT-5 Mini, GPT-5 Nano
  - GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano
  - Automatic API parameter handling (`max_completion_tokens` vs `max_tokens`)
- ✅ **Updated Setup Wizard**
  - 6 model options instead of 3
  - Automatic model configuration testing
- ✅ **Model Management APIs**
  - IPC handlers for model CRUD operations
  - Runtime model config reloading
  - Provider enable/disable support
- ✅ **Configurable AI Prompts**
  - Customizable system prompt and context-specific additions
  - Editable quick action prompts (Summarize, Translate, Improve, Reply)
  - Settings UI for prompt customization
- ✅ **Enhanced Documentation**
  - Comprehensive model management guide
  - Implementation guide for developers
  - Quick reference for common tasks

### v0.2.0
- ✅ Native C++/Objective-C modules integration
- ✅ Enhanced Mail.app support with robust content extraction
- ✅ Edit-before-process workflow for all actions
- ✅ Fixed window type detection issues
- ✅ C++20 compatibility and Electron targeting
- ✅ Comprehensive permission checking
- ✅ Graceful fallback to AppleScript mode

### v0.1.0
- ✅ Initial release with basic Mail.app integration
- ✅ AppleScript-based automation
- ✅ Privacy filtering
- ✅ OpenAI API integration

---

**Built with ❤️ for macOS** | **Powered by OpenAI GPT** | **Native Integration via C++/Objective-C**