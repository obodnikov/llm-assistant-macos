# 🔧 Native Modules Integration Guide

## Current State Analysis

### ✅ What You Have
- Working Electron app with Mail.app integration
- OpenAI API integration with GPT models
- Privacy filtering for sensitive content
- Native macOS UI with blur effects
- Settings panel and configuration management
- AppleScript-based Mail.app context detection

### ❌ What's Missing for Native Modules
- C++/Objective-C native module source files (`.mm` files)
- `binding.gyp` build configuration
- Native module JavaScript wrappers
- Build scripts and tooling
- Enhanced IPC handlers for native features

## 📁 Required File Structure

```
llm-assistant-macos/
├── binding.gyp                          # ← NEW: Build configuration
├── package.json                         # ← UPDATE: Add native deps
├── 
├── native-modules/                      # ← NEW: Native modules folder
│   ├── index.js                         # ← NEW: JS wrapper
│   ├── text-selection/
│   │   └── text_selection.mm            # ← NEW: C++ source
│   ├── context-menu/
│   │   └── context_menu.mm              # ← NEW: C++ source
│   └── accessibility/
│       └── accessibility.mm             # ← NEW: C++ source
├── 
├── src/
│   ├── main/
│   │   ├── main.js                      # ← KEEP: Current main
│   │   └── main-with-native.js          # ← NEW: Enhanced version
│   ├── preload/
│   │   ├── preload.js                   # ← KEEP: Current preload
│   │   └── preload-enhanced.js          # ← NEW: Native APIs
│   └── renderer/
│       ├── js/
│       │   └── assistant.js             # ← UPDATE: Add native support
│       └── ...
├── 
├── scripts/
│   ├── setup-wizard.js                  # ← KEEP: Current wizard
│   ├── build-native.js                  # ← NEW: Build automation
│   ├── test-native-modules.js           # ← NEW: Testing
│   └── check-permissions.js             # ← NEW: Permission check
└── 
└── docs/
    ├── SETUP.md                         # ← UPDATE: Add native setup
    ├── PRIVACY.md                       # ← KEEP: Current docs
    └── NATIVE_MODULES.md                # ← NEW: Native docs
```

## 🎯 Implementation Strategy

### **Phase 1: Add Build Infrastructure** (No Breaking Changes)

1. **Add `binding.gyp`** - Native modules build configuration
2. **Update `package.json`** - Add native dependencies
3. **Add build scripts** - Automation for building/testing

**Result**: Build infrastructure in place, app still works normally

### **Phase 2: Add Native Module Source Files**

1. **Create native module directories**
2. **Add `.mm` source files** from artifacts
3. **Build native modules** with `npm run build-native`

**Result**: Native modules built but not yet integrated

### **Phase 3: Add JavaScript Wrappers** (Gradual Integration)

1. **Add `native-modules/index.js`** - High-level wrapper
2. **Create enhanced main process** - `main-with-native.js`
3. **Create enhanced preload** - `preload-enhanced.js`

**Result**: Native modules available but optional

### **Phase 4: Update UI Layer** (Feature Enhancement)

1. **Update `assistant.js`** - Add native module support
2. **Add new keyboard shortcuts** - Quick actions
3. **Add context menu integration** - Right-click features

**Result**: Full native modules functionality active

## 📝 Step-by-Step Integration

### Step 1: Add Build Configuration

Create `binding.gyp` in project root:

```json
{
  "targets": [
    {
      "target_name": "text_selection",
      "sources": ["native-modules/text-selection/text_selection.mm"],
      "include_dirs": ["<!(node -e \"require('nan')\")"],
      "libraries": ["-framework Cocoa", "-framework ApplicationServices"],
      "xcode_settings": {
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++11", "-stdlib=libc++"]
      }
    },
    {
      "target_name": "context_menu",
      "sources": ["native-modules/context-menu/context_menu.mm"],
      "include_dirs": ["<!(node -e \"require('nan')\")"],
      "libraries": ["-framework Cocoa", "-framework ApplicationServices"],
      "xcode_settings": {
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++11", "-stdlib=libc++"]
      }
    },
    {
      "target_name": "accessibility",
      "sources": ["native-modules/accessibility/accessibility.mm"],
      "include_dirs": ["<!(node -e \"require('nan')\")"],
      "libraries": ["-framework Cocoa", "-framework ApplicationServices"],
      "xcode_settings": {
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++11", "-stdlib=libc++"]
      }
    }
  ]
}
```

### Step 2: Update package.json

Add to your existing `package.json`:

```json
{
  "scripts": {
    "build-native": "node-gyp rebuild",
    "clean-native": "node-gyp clean",
    "test-native": "node scripts/test-native-modules.js",
    "check-permissions": "node scripts/check-permissions.js",
    "rebuild": "npm run clean-native && npm run build-native",
    "prepare": "npm run build-native || echo 'Native modules build failed - using fallbacks'"
  },
  "devDependencies": {
    "node-gyp": "^10.0.1",
    "nan": "^2.17.0"
  },
  "gypfile": true
}
```

### Step 3: Create Native Module Directories

```bash
mkdir -p native-modules/text-selection
mkdir -p native-modules/context-menu
mkdir -p native-modules/accessibility
mkdir -p scripts
```

### Step 4: Add Native Module Source Files

Copy the `.mm` files from the artifacts I created:
- `text_selection.mm` → `native-modules/text-selection/`
- `context_menu.mm` → `native-modules/context-menu/`
- `accessibility.mm` → `native-modules/accessibility/`

### Step 5: Add JavaScript Wrapper

Copy `native-modules/index.js` from the artifacts to provide the high-level API.

### Step 6: Build Native Modules

```bash
# Install dependencies
npm install

# Build native modules
npm run build-native

# Test if they load
npm run test-native

# Check permissions
npm run check-permissions
```

### Step 7: Integrate into Main Process

You have two options:

**Option A: Replace current main.js** (Recommended for full integration)
- Rename `src/main/main.js` → `src/main/main-original.js`
- Copy `main-enhanced.js` from artifacts → `src/main/main.js`
- Update `package.json` main field if needed

**Option B: Side-by-side** (Recommended for testing)
- Keep current `src/main/main.js`
- Add `src/main/main-with-native.js` from artifacts
- Switch between them in `package.json` main field

### Step 8: Update Preload Script

**Option A: Replace**
- Rename `src/preload/preload.js` → `src/preload/preload-original.js`
- Copy `preload-enhanced.js` → `src/preload/preload.js`

**Option B: Extend**
Add to end of your existing `preload.js`:

```javascript
// Native modules support
contextBridge.exposeInMainWorld('nativeModulesAPI', {
  getStatus: () => ipcRenderer.invoke('get-native-modules-status'),
  onTextSelected: (callback) => {
    ipcRenderer.on('text-selected', (event, data) => callback(data));
  },
  onContextMenuAction: (callback) => {
    ipcRenderer.on('context-menu-action', (event, data) => callback(data));
  },
  onQuickAction: (callback) => {
    ipcRenderer.on('quick-action', (event, data) => callback(data));
  }
});
```

### Step 9: Update Assistant UI

Add to `src/renderer/js/assistant.js`:

```javascript
class AssistantPanel {
  constructor() {
    // ... existing code ...
    this.nativeModulesAvailable = false;
    this.checkNativeModules();
  }

  async checkNativeModules() {
    try {
      if (window.nativeModulesAPI) {
        const status = await window.nativeModulesAPI.getStatus();
        this.nativeModulesAvailable = status.available;
        
        if (this.nativeModulesAvailable) {
          this.setupNativeModuleListeners();
          console.log('✅ Native modules available');
        } else {
          console.log('ℹ️ Native modules not available - using fallbacks');
        }
      }
    } catch (error) {
      console.log('ℹ️ Native modules check failed:', error);
    }
  }

  setupNativeModuleListeners() {
    // Listen for text selection events
    window.nativeModulesAPI?.onTextSelected((data) => {
      console.log('Text selected:', data);
      // Handle selected text
    });

    // Listen for context menu actions
    window.nativeModulesAPI?.onContextMenuAction((data) => {
      console.log('Context menu action:', data);
      this.handleQuickAction(data.action, data.text);
    });

    // Listen for quick actions (from keyboard shortcuts)
    window.nativeModulesAPI?.onQuickAction((data) => {
      console.log('Quick action:', data);
      this.handleQuickAction(data.action, data.text);
    });
  }

  async handleQuickAction(action, text) {
    // Pre-fill the action
    if (this.userInput) {
      const prompts = {
        summarize: 'Summarize this text:',
        translate: 'Translate this text:',
        improve: 'Improve this text:',
        reply: 'Draft a reply to this:'
      };
      
      this.userInput.value = prompts[action] || action;
    }
    
    // Process with the text
    await this.processWithText(text);
  }
}
```

## ⚠️ Important Considerations

### **Backward Compatibility**
- Native modules are **optional** - app works without them
- All native features have **AppleScript fallbacks**
- No breaking changes to existing functionality

### **Permissions**
Users need to grant:
1. **Accessibility** - System Preferences → Security & Privacy → Privacy → Accessibility
2. Add **LLM Assistant** to the list
3. Restart app after granting permissions

### **Build Requirements**
- Xcode Command Line Tools: `xcode-select --install`
- Python 3: `brew install python3` (if not present)
- Node.js 18+: Already have this

### **Testing Strategy**
1. **Without native modules**: Test that app works with fallbacks
2. **With native modules**: Test all enhanced features
3. **Permissions denied**: Test graceful degradation

## 🎯 Recommended Implementation Order

### Week 1: Infrastructure
- [ ] Add `binding.gyp`
- [ ] Update `package.json`
- [ ] Add build scripts
- [ ] Test build process

### Week 2: Native Modules
- [ ] Add `.mm` source files
- [ ] Build native modules
- [ ] Add JavaScript wrapper
- [ ] Test module loading

### Week 3: Integration
- [ ] Add enhanced main process
- [ ] Add enhanced preload
- [ ] Update assistant UI
- [ ] Test all features

### Week 4: Polish
- [ ] Add documentation
- [ ] Create setup wizard updates
- [ ] Add permission checking
- [ ] Final testing

## 🚀 Quick Start (Minimal Integration)

If you want to start small:

1. **Add build infrastructure** (binding.gyp, package.json updates)
2. **Add only accessibility module** (simplest, most useful)
3. **Test text insertion** feature
4. **Gradually add** other modules

This gives you immediate value with minimal risk.

## 📊 Feature Comparison

| Feature | Current (AppleScript) | With Native Modules |
|---------|----------------------|---------------------|
| Mail context detection | ✅ Good | ✅ Excellent |
| Text selection | ❌ Limited | ✅ Real-time |
| Text insertion | ❌ Clipboard only | ✅ Direct |
| Context menus | ❌ No | ✅ Yes |
| Quick shortcuts | ⚠️ Basic | ✅ Advanced |
| Performance | ⚠️ Slow | ✅ Fast |
| System integration | ⚠️ Limited | ✅ Deep |

## 💡 Recommendations

### **For MVP** (Current State)
Your current implementation is **production-ready** for:
- Email composition assistance
- Privacy-filtered AI processing
- Basic Mail.app integration

### **For Enhanced Version** (With Native Modules)
Add native modules to enable:
- System-wide AI assistance (not just Mail.app)
- Right-click context menus
- Direct text manipulation
- Real-time text selection monitoring

### **Best Approach**
1. **Keep current implementation** as stable base
2. **Add native modules** as **opt-in enhancement**
3. **Test thoroughly** before making default
4. **Document differences** for users

## 🔍 Next Steps

Would you like me to:
1. **Create migration scripts** to safely integrate native modules?
2. **Generate test suite** for native module functionality?
3. **Create build automation** for CI/CD?
4. **Add feature flags** to toggle native modules on/off?

Let me know which aspect you'd like to focus on first!