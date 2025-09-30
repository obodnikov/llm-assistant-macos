# 🚀 LLM Assistant - Setup Guide

## Prerequisites

### System Requirements
- **macOS**: 11.0 (Big Sur) or later
- **Node.js**: Version 24.9.0 (or compatible version)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: 500MB for app + dependencies + native modules
- **Xcode Command Line Tools**: Required for native modules

### Required Accounts
- **OpenAI Account**: [Sign up here](https://platform.openai.com/signup)
- **API Access**: Ensure you have API credits available

## Quick Start

### Installation
```bash
# Clone the repository
git clone https://github.com/obodnikov/llm-assistant-macos.git
cd llm-assistant-macos

# Install dependencies
npm install

# Build native modules (automatically runs during npm install)
npm run build-native

# Check permissions
npm run check-permissions

# Start the app
npm start
```

### First Run
1. **Grant Permissions** when prompted:
   - **Accessibility** - Required for text selection and manipulation
   - **Automation for Mail.app** - Required for Mail integration
2. **Configure API Key** via Settings panel (⚙️)
3. **Test Mail Integration** - Open Mail.app, select an email, press `Cmd+Shift+L`

## Native Modules Setup

### Automatic Build (Recommended)
Native modules build automatically during `npm install` via the `postinstall` script:
```bash
npm install  # Builds native modules automatically
```

### Manual Build
If automatic build fails:
```bash
# Clean previous builds
npm run clean-native

# Build for Electron
npm run build-native

# Verify build
npm run check-permissions
```

### Build Requirements
The following are required for building native modules:

1. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

2. **Python 3** (usually pre-installed)
   ```bash
   python3 --version  # Should be 3.7 or later
   ```

3. **Node.js** (you already have this)
   ```bash
   node --version  # Should be 24.9.0 or compatible
   ```

### Troubleshooting Native Modules

#### Issue: "Module version mismatch"
```bash
# Rebuild for Electron
npm run clean-native
npm run build-native
```

#### Issue: "gyp: No Xcode or CLT version detected"
```bash
# Install Xcode Command Line Tools
xcode-select --install

# If already installed, reset the path
sudo xcode-select --reset
```

#### Issue: "Permission denied" during build
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

## Configuration

### 1. OpenAI API Key

#### Getting Your API Key
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Log in to your OpenAI account
3. Click "Create new secret key"
4. Name it "LLM Assistant macOS"
5. Copy the key (starts with `sk-`)

#### Setting Your API Key
1. Launch the app
2. Click the Settings icon (⚙️)
3. Paste your API key
4. Click "Save"

#### API Key Security
- ✅ **Never share** your API key
- ✅ **Monitor usage** at [OpenAI Usage](https://platform.openai.com/usage)
- ✅ **Rotate keys** periodically (every 3-6 months)
- ✅ The app stores keys securely in macOS Keychain

### 2. Privacy Settings

#### Default Privacy Filters
Enabled by default:
- **API Keys**: `sk-`, `pk_`, `AIza`, etc.
- **Credentials**: Password patterns, auth tokens
- **Financial**: Credit cards, SSN, bank routing numbers
- **Personal**: Email addresses (optional), phone numbers (optional)

#### Customizing Filters
Open Settings (⚙️) to toggle individual privacy filters.

### 3. Model Selection

#### Available Models
| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **GPT-4o** | Medium | Excellent | Medium | General use, best balance |
| **GPT-4 Turbo** | Medium | Excellent | Medium | Complex analysis |
| **GPT-3.5 Turbo** | Fast | Good | Low | Quick tasks, summaries |

#### Recommended Settings
- **Default**: GPT-4o (good balance of speed, quality, cost)
- **Complex emails**: GPT-4 Turbo
- **Quick summaries**: GPT-3.5 Turbo

## macOS Permissions

### Required Permissions

#### 1. Accessibility Access (Required)
**What it enables**:
- System-wide text selection monitoring
- Reading window information
- Direct text insertion at cursor

**How to grant**:
1. **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the lock icon (🔒) and enter your password
3. Click **+** and add "Electron" or "LLM Assistant"
4. Toggle the checkbox **ON**
5. Restart the app

#### 2. Automation for Mail.app (Required for Mail features)
**What it enables**:
- Reading email content
- Getting email metadata (sender, subject)
- Detecting Mail.app context

**How to grant**:
1. **System Settings** → **Privacy & Security** → **Automation**
2. Find "Electron" or "LLM Assistant"
3. Enable **Mail** checkbox
4. Restart the app

#### 3. Screen Recording (Optional)
**What it enables**:
- Advanced context menu positioning

**How to grant**:
1. **System Settings** → **Privacy & Security** → **Screen Recording**
2. Add "Electron" or "LLM Assistant"
3. Toggle **ON**

### Permission Verification
```bash
npm run check-permissions
```

This checks:
- ✅ Accessibility permissions
- ✅ Automation permissions for Mail.app
- ✅ Native modules built and ready
- ⚠️ Screen Recording (manual verification)

### Troubleshooting Permissions

#### "Permission Denied" Errors
1. Open **System Settings** → **Privacy & Security**
2. Remove "Electron" from **all** privacy sections
3. Restart the app
4. macOS will prompt for permissions again
5. Grant all requested permissions

#### Testing Mail Integration
```bash
# Test AppleScript access manually
osascript -e 'tell application "Mail" to get class of front window as string'
```

If this returns an error, reset privacy:
```bash
tccutil reset AppleEvents
```

## Features & Usage

### Mail.app Integration

#### Workflow
1. **Open Mail.app** and select an email
2. **Keep Mail frontmost** (active window)
3. Press **`Cmd+Shift+L`** to open LLM Assistant
4. Should show: **"Mail Context Detected - Viewing email: [subject]"**

#### Quick Actions
When Mail context is detected:
- **📝 Summarize** - Concise email summary
- **🌐 Translate** - Translate email content
- **✨ Improve** - Improve email text
- **💬 Draft Reply** - Generate reply draft

#### Usage Pattern
1. Click a quick action button (e.g., "Summarize")
2. Edit the prompt if needed
3. Click "Process"
4. AI processes the email content

### Native Module Features

When native modules are loaded successfully:
- ✅ Real-time text selection monitoring
- ✅ System-wide context menus (right-click)
- ✅ Direct text insertion at cursor position
- ✅ Window and application information access

### Fallback Mode

If native modules fail to load:
- ⚠️ App runs in **fallback mode**
- ✅ Mail.app integration still works (via AppleScript)
- ⚠️ Limited text selection capabilities
- ⚠️ No context menu integration

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+L` | Toggle LLM Assistant panel |
| `Cmd+,` | Open Settings |
| `Cmd+W` | Close panel |
| `Cmd+Q` | Quit application |
| `Esc` | Hide panel |

### Customizing Shortcuts
Edit `src/main/main.js`:
```javascript
// Find and modify:
globalShortcut.register('CommandOrControl+Shift+L', () => {
  toggleAssistantPanel();
});
```

## Troubleshooting

### Common Issues

#### 1. Native Modules Not Loading
**Symptoms**: Console shows "Native modules not available - using fallbacks"

**Solution**:
```bash
npm run clean-native
npm run build-native
npm start
```

#### 2. Mail Context Not Detected
**Cause**: Mail.app not frontmost or no email selected

**Solution**:
- Click on an email in Mail.app to select it
- Make sure Mail.app is the active window (frontmost)
- Open LLM Assistant while Mail is active

#### 3. "Draft Reply" Button Disabled
**Cause**: No email selected or wrong context type

**Solution**:
- Select an email in Mail.app (should be highlighted)
- Make sure you're viewing a received email (not composing)

#### 4. AI Processing Wrong Text
**Cause**: Stored text workflow issue

**Solution**:
- Click a quick action button (e.g., "Summarize")
- Wait for prompt to appear
- Click "Process" button
- Do NOT manually type or paste text when using quick actions

#### 5. High Memory Usage
**Cause**: Electron overhead

**Solution**:
- Restart the app periodically
- Monitor with Activity Monitor
- Use lighter models (GPT-3.5 Turbo)

### Debug Mode

#### Enable Debug Logging
```bash
# Open DevTools
Cmd+Option+I (while app is running)

# Check console for:
# - "📧 Mail context received:"
# - "🎯 handleQuickAction - currentContext:"
# - "✅ Native modules available"
```

#### Verbose Build Logging
```bash
DEBUG=electron-rebuild npm run build-native
```

### Reset to Factory Settings
```bash
# Stop the app
pkill -f "Electron"

# Remove configuration
rm -rf ~/Library/Application\ Support/llm-assistant-macos/

# Rebuild native modules
npm run clean-native
npm run build-native

# Restart
npm start
```

## Development

### Running in Development Mode
```bash
# Start with DevTools auto-open
npm run dev
```

### Building for Distribution
```bash
# Build native modules
npm run build-native

# Build app
npm run build

# Output in dist/
open dist/
```

### Testing Changes
```bash
# Test native modules
npm run test-native

# Check permissions
npm run check-permissions

# Run app
npm start
```

## Performance Tips

### Reducing API Costs
1. Use **GPT-3.5 Turbo** for simple tasks
2. Enable **privacy filtering** to reduce token usage
3. Be **specific** in prompts
4. Monitor usage at [OpenAI Dashboard](https://platform.openai.com/usage)

### Improving Speed
1. Choose faster models (GPT-3.5 Turbo)
2. Use quick action buttons instead of custom prompts
3. Ensure stable internet connection
4. Close unused Mail.app windows

### Memory Management
1. Restart app if memory usage > 500MB
2. Monitor with Activity Monitor
3. Close DevTools when not debugging

## Security Best Practices

### Data Privacy
- ✅ Enable **all privacy filters** by default
- ✅ Review content before processing sensitive data
- ✅ Avoid processing highly confidential documents
- ✅ All data sent to OpenAI API follows their privacy policy

### API Key Security
- ✅ Keys stored securely in macOS Keychain
- ✅ Never logged or displayed in console
- ✅ Rotate keys every 3-6 months
- ✅ Monitor for unexpected API usage

### Network Security
- ✅ Use secure networks (avoid public WiFi for sensitive content)
- ✅ All OpenAI API calls use HTTPS encryption
- ✅ Consider VPN for additional privacy

## Getting Help

### Support Channels
- **GitHub Issues**: [Report bugs](https://github.com/obodnikov/llm-assistant-macos/issues)
- **GitHub Discussions**: [Feature requests and questions](https://github.com/obodnikov/llm-assistant-macos/discussions)

### Before Reporting Issues
1. **Check console logs** (Cmd+Option+I)
2. **Run permission check**: `npm run check-permissions`
3. **Try clean rebuild**: `npm run clean-native && npm run build-native`
4. **Include system info**: macOS version, Node version, Electron version
5. **Provide reproduction steps**: Detailed step-by-step instructions

### Useful Information for Bug Reports
```bash
# Get version info
node --version
npm --version
./node_modules/.bin/electron --version

# Check native module status
npm run check-permissions

# Check build status
ls -la build/Release/
```

## Next Steps

- 📖 Read [integration_guide.md](integration_guide.md) for technical details
- 🔒 Review [PRIVACY.md](PRIVACY.md) for data handling information
- 💻 See [API-KEYS.md](API-KEYS.md) for API configuration help

---

**Version**: 0.2.0 with Native Modules
**Last Updated**: 2025-09-30