# 🔧 Native Modules Integration Guide

## ✅ Integration Complete!

The LLM Assistant now has **full native macOS integration** with C++/Objective-C modules for enhanced system-level features.

## 🎉 What's Been Implemented

### Native Modules (C++/Objective-C)
- ✅ **Text Selection Module** - Real-time system-wide text selection monitoring
- ✅ **Context Menu Module** - Right-click integration in any app
- ✅ **Accessibility Module** - Direct text manipulation and window management

### Build Infrastructure
- ✅ `binding.gyp` - Build configuration for Electron 28 (Node.js v18)
- ✅ Build scripts - `npm run build-native` targeting Electron
- ✅ Permission checking - `npm run check-permissions`
- ✅ Automatic fallbacks when native modules unavailable

### Integration Features
- ✅ Mail.app context detection (AppleScript-based, no window type checking)
- ✅ Native module initialization in main process
- ✅ IPC handlers for native features
- ✅ Frontend support for native module events
- ✅ Graceful degradation to fallback mode

## 📁 Project Structure

```
llm-assistant-macos/
├── binding.gyp                          # Native build configuration (C++20)
├── package.json                         # Updated with native scripts
│
├── native-modules/                      # Native modules folder
│   ├── index.js                         # JS wrapper for native modules
│   ├── text-selection/
│   │   └── text_selection.mm            # Text selection native code
│   ├── context-menu/
│   │   └── context_menu.mm              # Context menu native code
│   └── accessibility/
│       └── accessibility.mm             # Accessibility native code
│
├── build/Release/                       # Compiled native modules
│   ├── accessibility.node
│   ├── context_menu.node
│   └── text_selection.node
│
├── src/
│   ├── main/
│   │   └── main.js                      # Enhanced with native module support
│   ├── preload/
│   │   └── preload.js                   # Exposes native module APIs
│   └── renderer/
│       └── js/
│           └── assistant.js             # UI with native module integration
│
└── scripts/
    └── check-permissions.js             # Permission verification script
```

## 🚀 Getting Started

### Prerequisites
- ✅ Xcode Command Line Tools
- ✅ Node.js 24.9.0 (system)
- ✅ Electron 28.3.3 (includes Node.js v18)
- ✅ Python 3.13.7

### Building Native Modules

```bash
# Clean previous builds
npm run clean-native

# Build for Electron (targets Electron's Node.js version)
npm run build-native

# This runs: node-gyp rebuild --target=28.3.3 --arch=arm64 --dist-url=https://electronjs.org/headers
```

### Checking Permissions

```bash
npm run check-permissions
```

This verifies:
- ✅ Accessibility permissions
- ✅ Automation permissions for Mail.app
- ✅ Native modules are built
- ⚠️ Screen Recording (manual check)

### Running the App

```bash
npm start
```

On first run, macOS will prompt for:
1. **Accessibility access** - Required for text selection and manipulation
2. **Automation access for Mail** - Required for Mail.app integration

## 🔧 Key Implementation Details

### 1. Mail.app Integration (Fixed)

**Problem**: Mail.app windows return class name "window" instead of "compose" or "mailbox"

**Solution**: Skip window type checking, directly try to get selected message

```javascript
// Simplified approach - try selected message first
const getMessageScript = `
  tell application "Mail"
    set selectedMessages to selection
    if (count of selectedMessages) > 0 then
      set firstMessage to item 1 of selectedMessages
      return content & "|||SEP|||" & subject & "|||SEP|||" & sender
    end if
  end tell
`;
```

**Key improvements**:
- ✅ No JSON string building in AppleScript (avoids escaping issues)
- ✅ Uses delimiter-based parsing (`|||SEP|||` markers)
- ✅ Node.js builds proper JSON objects safely
- ✅ Returns type: `viewer` for viewing emails, `compose` for drafting

### 2. Native Module Build Configuration

**Problem**: Node.js v24.9.0 (MODULE_VERSION 137) vs Electron's Node.js v18 (MODULE_VERSION 119)

**Solution**: Build specifically for Electron with correct target

```json
{
  "scripts": {
    "build-native": "node-gyp rebuild --target=28.3.3 --arch=arm64 --dist-url=https://electronjs.org/headers"
  }
}
```

**binding.gyp changes**:
- ✅ Upgraded from C++11 to C++20 (required by Node.js v18+)
- ✅ Updated MACOSX_DEPLOYMENT_TARGET from 10.15 to 11.0
- ✅ Fixed API compatibility issues (Boolean namespace, Initialize signature)

### 3. Frontend Quick Actions Flow

**User Experience Design**:
1. User clicks "Summarize" → Stores email content, fills prompt, focuses input
2. User can edit prompt text (e.g., "Please summarize this email concisely...")
3. User clicks "Process" → Uses stored email content (not clipboard)
4. AI processes the actual email

**Implementation**:
```javascript
async handleQuickAction(action) {
  // Store email content for later use
  this.storedText = emailContent;

  // Set prompt and let user edit
  this.userInput.value = prompt;
  this.userInput.focus();

  // User manually clicks "Process" when ready
}

async processRequest() {
  // Use stored text if available (from quick action)
  let textToProcess = this.storedText || fallbackToClipboard();
  await this.processWithText(textToProcess, prompt);
  this.storedText = null; // Clear after use
}
```

### 4. Context Type Handling

**Supported context types**:
- `viewer` - Viewing a received email (with content, subject, sender)
- `compose` - Composing a new email (with content, subject)
- `not_active` - Mail.app not frontmost
- `error` - Error occurred

**Button states**:
- "Summarize", "Translate", "Improve" → Always enabled with mail context
- "Draft Reply" → Enabled for `viewer` and `mailbox` types

## 🛠️ Build Fixes Applied

### C++ Compatibility Issues Fixed

1. **Boolean namespace conflict**
   ```cpp
   // Before: Boolean::New(isolate, value)
   // After:  v8::Boolean::New(isolate, value)
   ```

2. **Initialize function signature**
   ```cpp
   // Before: void Initialize(Local<Object> exports)
   // After:  void Initialize(Local<Object> exports, Local<Value> module, void* priv)
   ```

3. **AXValueGetValue type casting**
   ```cpp
   // Before: AXValueGetValue(value, kAXValueCGPointType, &point)
   // After:  AXValueGetValue(value, (AXValueType)kAXValueCGPointType, &point)
   ```

4. **Global vs Local handles**
   ```cpp
   // Before: static Local<Function> callback;
   // After:  static Global<Function> callback;
   //         Local<Function> cb = callback.Get(isolate);
   ```

5. **Event type constants**
   ```cpp
   // Before: kCGEventMouseUp (doesn't exist)
   // After:  kCGEventLeftMouseUp | kCGEventRightMouseUp
   ```

## 📊 Features Enabled

| Feature | Status | Details |
|---------|--------|---------|
| Native text selection | ✅ Working | Real-time system-wide monitoring |
| Context menu integration | ✅ Working | Right-click actions in any app |
| Accessibility features | ✅ Working | Direct text insertion, window info |
| Mail.app integration | ✅ Working | Content extraction without window type |
| Quick action buttons | ✅ Working | Summarize, Translate, Improve, Draft Reply |
| Stored text workflow | ✅ Working | Edit prompt before processing |
| Graceful fallbacks | ✅ Working | AppleScript fallback when native unavailable |

## 🔐 Required Permissions

### Accessibility (Required)
**What it enables**:
- System-wide text selection monitoring
- Reading window information
- Direct text insertion at cursor

**How to grant**:
1. System Settings → Privacy & Security → Accessibility
2. Add "Electron" or "LLM Assistant"
3. Toggle on

### Automation for Mail.app (Required for Mail features)
**What it enables**:
- Reading email content
- Getting email metadata (sender, subject)
- Detecting compose vs viewer windows

**How to grant**:
1. System Settings → Privacy & Security → Automation
2. Find "Electron" or "LLM Assistant"
3. Enable "Mail"

### Screen Recording (Optional)
**What it enables**:
- Advanced context menu positioning
- Cannot be checked programmatically

**How to grant**:
1. System Settings → Privacy & Security → Screen Recording
2. Add "Electron" or "LLM Assistant"
3. Toggle on

## 🧪 Testing

### Test Native Modules
```bash
# Check if native modules load
node -e "console.log(require('./build/Release/accessibility.node'))"
node -e "console.log(require('./build/Release/text_selection.node'))"
node -e "console.log(require('./build/Release/context_menu.node'))"
```

### Test Mail Integration
1. Open Mail.app
2. Select an email
3. Keep Mail as frontmost window
4. Open LLM Assistant
5. Should show: "Mail Context Detected - Viewing email: [subject]"
6. Click "Summarize"
7. Edit prompt if needed
8. Click "Process"

### Console Debugging
Open DevTools (`Cmd+Option+I`) to see:
- `📧 Mail context received:` - Shows what Mail returned
- `🎯 handleQuickAction - currentContext:` - Shows current context state
- `✅ Using mail context content` - Confirms using mail content
- `📝 Text to process length:` - Shows content length

## ⚠️ Known Issues & Solutions

### Issue: "Module version mismatch"
**Cause**: Built for wrong Node.js version
**Solution**: Rebuild with Electron target
```bash
npm run clean-native
npm run build-native
```

### Issue: "Mail Context Detected" but no content
**Cause**: No email selected in Mail.app
**Solution**: Click on an email to select it first

### Issue: AI processes wrong text (console errors)
**Cause**: Stored text workflow not working
**Solution**: Already fixed - click quick action button, then "Process"

### Issue: "Draft Reply" button disabled
**Cause**: Context type not recognized
**Solution**: Already fixed - enabled for `viewer` type

## 🎯 Usage Patterns

### Pattern 1: Quick Email Summary
1. Select email in Mail.app
2. `Cmd+Option+L` to open assistant
3. Click "Summarize"
4. (Optional) Edit prompt
5. Click "Process"
6. Window stays visible - press `Cmd+Option+L` again to hide

### Pattern 2: Custom Email Processing
1. Select email in Mail.app
2. `Cmd+Option+L` to open assistant
3. Type custom prompt: "Extract action items from this email"
4. Click "Process"

### Pattern 3: Draft Reply
1. Select email in Mail.app
2. `Cmd+Option+L` to open assistant
3. Click "Draft Reply"
4. Edit prompt: "Draft a professional response accepting the offer"
5. Click "Process"
6. Copy result to Mail.app compose window

## 🚀 Future Enhancements

### Potential Additions
- [ ] Direct insertion of AI response into Mail compose window
- [ ] Multi-email thread analysis
- [ ] Attachment content extraction
- [ ] Calendar event parsing from emails
- [ ] Contact information extraction

### Performance Optimizations
- [ ] Cache mail context to avoid repeated AppleScript calls
- [ ] Background text selection monitoring with debouncing
- [ ] Lazy loading of native modules

## 📝 Maintenance

### Updating Electron Version
When updating Electron, rebuild native modules:
```bash
# Update package.json Electron version
npm install

# Rebuild for new Electron version
npm run clean-native
npm run build-native
```

### Debugging Native Module Issues
```bash
# Enable verbose logging
DEBUG=electron-rebuild npm run build-native

# Check module compatibility
node -p "process.versions"
./node_modules/.bin/electron --version
```

## ✅ Integration Checklist

- [x] Native modules source files added
- [x] binding.gyp configured for Electron + C++20
- [x] Build scripts updated in package.json
- [x] Native modules build successfully for Electron 28
- [x] Main process initializes native modules
- [x] IPC handlers for native features
- [x] Preload exposes native APIs to renderer
- [x] Frontend checks native module availability
- [x] Mail.app integration works without window type checking
- [x] Quick action buttons store text for editing
- [x] Draft Reply button enabled for viewer context
- [x] Permission checking script created
- [x] Graceful fallbacks when native modules unavailable
- [x] Console logging for debugging
- [x] Documentation updated

## 🎉 Conclusion

The native modules integration is **complete and functional**! The app now provides:

✅ **Deep macOS integration** - System-level text manipulation and monitoring
✅ **Enhanced Mail.app support** - Robust email content extraction
✅ **Professional UX** - Edit-before-process workflow for all actions
✅ **Production ready** - Graceful fallbacks, error handling, permission management

The integration successfully resolves all compatibility issues between Node.js v24, Electron 28's Node.js v18, and macOS native APIs.