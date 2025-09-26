# 🚀 LLM Assistant - Detailed Setup Guide

## Prerequisites

### System Requirements
- **macOS**: 10.15 (Catalina) or later
- **Node.js**: Version 18.0 or later
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: 200MB for app + dependencies

### Required Accounts
- **OpenAI Account**: [Sign up here](https://platform.openai.com/signup)
- **API Access**: Ensure you have API credits available

## Installation Methods

### Method 1: Clone Repository (Recommended)
```bash
# Clone the repository
git clone https://github.com/yourusername/llm-assistant-macos.git
cd llm-assistant-macos

# Install dependencies
npm install

# Run setup wizard
npm run setup-wizard

# Start the app
npm start
```

### Method 2: Download Release
1. Go to [Releases](https://github.com/yourusername/llm-assistant-macos/releases)
2. Download the latest `.dmg` file
3. Mount the disk image and drag to Applications
4. Run the app and follow the setup wizard

## Step-by-Step Configuration

### 1. OpenAI API Key Setup

#### Getting Your API Key
1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Log in to your OpenAI account
3. Click "Create new secret key"
4. Name it "LLM Assistant macOS"
5. Copy the key (starts with `sk-`)

#### Important API Key Notes
- **Keep it secret**: Never share your API key
- **Usage billing**: You'll be charged based on usage
- **Rate limits**: Free tier has lower limits
- **Monitoring**: Check usage at [OpenAI Usage](https://platform.openai.com/usage)

### 2. Privacy Settings Configuration

#### Default Privacy Filters
The app automatically filters these by default:
- **API Keys**: `sk-`, `pk_`, `AIza`, etc.
- **Credentials**: Password, login, username patterns
- **Financial**: Credit cards, SSN, bank routing numbers
- **Personal**: Email addresses, phone numbers (optional)

#### Customizing Privacy Settings
```json
{
  "filter-api-keys": true,     // Recommended: true
  "filter-credentials": true,  // Recommended: true
  "filter-financial": true,    // Recommended: true
  "filter-emails": false,      // Optional: your choice
  "filter-phones": false       // Optional: your choice
}
```

### 3. Model Selection

#### Available Models
| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| **GPT-4** | Slow | Excellent | High | Complex emails, analysis |
| **GPT-4 Turbo** | Medium | Very Good | Medium | General use, good balance |
| **GPT-3.5 Turbo** | Fast | Good | Low | Quick tasks, summaries |

#### Cost Estimation (Approximate)
- **GPT-4**: $0.03-0.06 per request
- **GPT-4 Turbo**: $0.01-0.03 per request  
- **GPT-3.5 Turbo**: $0.002-0.004 per request

*Actual costs depend on text length and complexity*

## Advanced Configuration

### Mail.app Permissions

#### Granting Accessibility Access
1. **System Preferences** → **Security & Privacy**
2. Click **Privacy** tab → **Accessibility**
3. Click the lock icon and enter your password
4. Click **+** and add **LLM Assistant**
5. Ensure the checkbox is checked

#### Troubleshooting Mail Integration
```bash
# Test AppleScript access manually
osascript -e 'tell application "Mail" to get name of front window'

# If permission denied, reset privacy database
tccutil reset AppleEvents com.yourname.llm-assistant
```

### Global Hotkey Customization

#### Default Hotkey: `Cmd + Option + L`
To change the hotkey, edit `src/main/main.js`:
```javascript
// Find this line and modify:
globalShortcut.register('CommandOrControl+Alt+L', () => {
  toggleAssistant();
});

// Examples of alternatives:
// 'CommandOrControl+Shift+A'  // Cmd+Shift+A
// 'CommandOrControl+`'        // Cmd+Backtick
// 'F1'                        // F1 key
```

### Custom Privacy Patterns

#### Adding Custom Filters
Edit your config file at:
`~/Library/Application Support/llm-assistant-macos/config.json`

```json
{
  "custom-patterns": [
    {
      "name": "company-secrets",
      "pattern": "COMPANY-SECRET-\\d+",
      "description": "Company secret codes"
    },
    {
      "name": "project-codes", 
      "pattern": "PROJ-[A-Z]{3}-\\d{4}",
      "description": "Internal project codes"
    }
  ]
}
```

## Development Setup

### Running in Development Mode
```bash
# Start with DevTools open
npm run dev

# View main process logs
tail -f ~/Library/Logs/llm-assistant-macos/main.log

# View renderer process logs
# Open DevTools in the app window
```

### Building from Source
```bash
# Build the application
npm run build

# The .dmg will be created in dist/
open dist/
```

### Code Signing (Optional)
For distribution outside of development:
```bash
# Install Xcode command line tools
xcode-select --install

# Sign the app (requires Apple Developer account)
codesign --force --deep --sign "Developer ID Application: Your Name" dist/mac/LLM\ Assistant.app
```

## Troubleshooting

### Common Issues

#### 1. "Permission Denied" Errors
**Cause**: macOS security restrictions
**Solution**:
- Grant Accessibility permissions
- Allow the app in System Preferences → Security & Privacy

#### 2. "API Key Invalid" Errors
**Cause**: Incorrect or expired API key
**Solution**:
- Verify key starts with `sk-`
- Check OpenAI account status
- Re-run setup wizard: `npm run setup-wizard`

#### 3. "Mail Context Not Detected"
**Cause**: Mail.app not active or permission issues
**Solution**:
- Ensure Mail.app is frontmost application
- Grant AppleScript permissions
- Test manually: Open Mail.app, then activate assistant

#### 4. High Memory Usage
**Cause**: Electron overhead or memory leaks
**Solution**:
- Restart the app periodically
- Check Activity Monitor for memory usage
- Use lighter AI models (GPT-3.5 Turbo)

### Reset to Factory Settings
```bash
# Stop the app
pkill -f "llm-assistant"

# Remove all configuration
rm -rf ~/Library/Application\ Support/llm-assistant-macos/
rm -rf ~/Library/Preferences/com.yourname.llm-assistant.plist

# Restart setup
npm run setup-wizard
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=llm-assistant:*
npm start

# View detailed logs
tail -f ~/Library/Logs/llm-assistant-macos/debug.log
```

## Performance Optimization

### Reducing API Costs
1. **Use GPT-3.5 Turbo** for simple tasks
2. **Enable privacy filtering** to reduce token usage
3. **Be specific** in prompts to get concise responses
4. **Monitor usage** regularly in OpenAI dashboard

### Improving Response Speed
1. **Choose faster models** (GPT-3.5 Turbo vs GPT-4)
2. **Reduce context size** (shorter email threads)
3. **Use quick actions** instead of custom prompts
4. **Stable internet connection** for API calls

### Memory Management
1. **Restart app daily** if used heavily
2. **Close unused Mail.app windows**
3. **Monitor system memory** with Activity Monitor
4. **Use latest macOS version** for best performance

## Security Best Practices

### API Key Security
- ✅ **Never share** your API key
- ✅ **Monitor usage** for unexpected activity
- ✅ **Rotate keys** periodically (every 3-6 months)
- ✅ **Use organization accounts** for team usage

### Data Privacy
- ✅ **Enable all privacy filters** by default
- ✅ **Review filtered content** before processing
- ✅ **Avoid processing** highly sensitive documents
- ✅ **Use local models** for maximum privacy (future feature)

### Network Security
- ✅ **Use secure networks** (avoid public WiFi for sensitive content)
- ✅ **Monitor network traffic** if concerned about data
- ✅ **Consider VPN** for additional privacy layer

## Getting Help

### Support Channels
- **GitHub Issues**: [Report bugs](https://github.com/yourusername/llm-assistant-macos/issues)
- **Discussions**: [Feature requests and questions](https://github.com/yourusername/llm-assistant-macos/discussions)
- **Email**: your.email@example.com

### Before Reporting Issues
1. **Check logs**: `~/Library/Logs/llm-assistant-macos/`
2. **Test with simple case**: Try basic functionality first
3. **Include system info**: macOS version, app version
4. **Provide steps to reproduce**: Detailed reproduction steps

### Contributing
See [DEVELOPMENT.md](DEVELOPMENT.md) for contribution guidelines.

---

**Next**: Read [API-KEYS.md](API-KEYS.md) for detailed API configuration help.