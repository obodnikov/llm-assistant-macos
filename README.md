# 🤖 LLM Assistant for macOS

AI-powered assistant with native Mail.app integration for macOS. Get intelligent help with email composition, text processing, and more using OpenAI's GPT models.

![Demo](https://via.placeholder.com/600x400/007AFF/FFFFFF?text=LLM+Assistant+Demo)

## ✨ Features

### 🎯 Core Functionality
- **Global Hotkey Access**: `Cmd + Option + L` to summon from anywhere
- **Mail.app Integration**: Smart email context detection and assistance
- **Privacy Protection**: Automatic filtering of sensitive content
- **Native macOS UI**: Blur effects, dark mode, and system integration

### 📧 Email Intelligence
- **Context Awareness**: Understands email threads and composition state
- **Smart Actions**: Summarize, translate, improve, and draft replies
- **Thread Analysis**: Process entire email conversations
- **Professional Tone**: AI-optimized for business communication

### 🔒 Privacy & Security
- **Local Filtering**: Sensitive content filtered before cloud processing
- **Configurable Protection**: API keys, credentials, financial data
- **Visual Feedback**: Highlighted sensitive content with warnings
- **Encrypted Storage**: API keys stored securely using Electron Store

## 🚀 Quick Start

### Prerequisites
- macOS 10.15 or later
- Node.js 18+ and npm
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/llm-assistant-macos.git
   cd llm-assistant-macos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run setup wizard**
   ```bash
   npm run setup-wizard
   ```
   The wizard will guide you through:
   - OpenAI API key configuration
   - Privacy settings
   - Model selection
   - Connection testing

4. **Start the application**
   ```bash
   npm start
   ```

### Development Mode
```bash
npm run dev
```
Runs with DevTools open and shows the main window for debugging.

## 📖 Usage

### Basic Usage
1. **Launch**: The app runs in the background (no dock icon)
2. **Activate**: Press `Cmd + Option + L` anywhere to open the assistant
3. **Process Text**: 
   - Select text and use quick actions
   - Type custom requests in the input field
   - Assistant automatically detects Mail.app context

### Mail.app Integration
- **Composing Email**: Assistant detects draft and offers composition help
- **Reading Emails**: Provides thread summaries and reply suggestions  
- **Context Actions**: Smart suggestions based on email content

### Quick Actions
- **📝 Summarize**: Extract key points from text or email threads
- **🌐 Translate**: Translate to/from any language
- **✨ Improve**: Enhance tone, clarity, and professionalism
- **↩️ Draft Reply**: Generate contextual email responses

### Privacy Features
The assistant automatically detects and filters:
- API keys and authentication tokens
- Login credentials and passwords
- Financial information (credit cards, SSN, bank details)
- Configurable custom patterns

Filtered content is highlighted and replaced with `[FILTERED]` before processing.

## ⚙️ Configuration

### Settings Panel
Access via the gear icon in the assistant panel:
- **API Configuration**: OpenAI key and model selection
- **Privacy Settings**: Enable/disable content filtering
- **Custom Patterns**: Add your own sensitive content patterns

### Models Available
- **GPT-4**: Most capable, best for complex tasks
- **GPT-4 Turbo**: Good balance of speed and capability  
- **GPT-3.5 Turbo**: Fastest and most cost-effective

### Config File Location
Settings are stored in: `~/Library/Application Support/llm-assistant-macos/config.json`

## 🔧 Development

### Project Structure
```
llm-assistant-macos/
├── src/
│   ├── main/           # Electron main process
│   │   └── main.js     # App entry point, window management
│   ├── renderer/       # UI components
│   │   ├── assistant.html
│   │   ├── css/
│   │   └── js/
│   └── preload/        # Secure IPC bridge
│       └── preload.js
├── scripts/            # Setup and build scripts
├── config/             # Configuration files
└── docs/               # Documentation
```

### Key Components
- **Main Process**: Window management, global shortcuts, system integration
- **Renderer Process**: UI, user interactions, display logic
- **Preload Script**: Secure communication bridge between main and renderer
- **Privacy Filter**: Sensitive content detection and filtering
- **Mail Bridge**: AppleScript integration with Mail.app

### Building
```bash
npm run build
```
Creates a distributable `.dmg` file in the `dist` folder.

### Native Modules
For advanced system integration (text selection, context menus), native modules can be added:
```bash
npm run build-native
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Follow the existing code style and structure
4. Test thoroughly on macOS
5. Submit a pull request

### Code Style
- Use modern JavaScript (ES6+)
- Follow the project structure guidelines
- Keep files under 800 lines
- Add comments for complex logic
- Test privacy filtering thoroughly

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- AI powered by [OpenAI](https://openai.com/)
- UI inspired by native macOS design patterns
- Privacy-first approach for secure AI assistance

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/llm-assistant-macos/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/llm-assistant-macos/discussions)
- **Email**: your.email@example.com

---

**Note**: This app requires macOS and is designed specifically for Mail.app integration. For cross-platform versions, see our [Electron Web](https://github.com/yourusername/llm-assistant-web) variant.