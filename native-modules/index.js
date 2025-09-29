// native-modules/index.js
// JavaScript wrapper for native modules

const path = require('path');

let textSelection, contextMenu, accessibility;

// Initialize native modules with error handling
function initializeNativeModules() {
  try {
    const buildPath = path.join(__dirname, '..', 'build', 'Release');
    
    textSelection = require(path.join(buildPath, 'text_selection.node'));
    contextMenu = require(path.join(buildPath, 'context_menu.node'));
    accessibility = require(path.join(buildPath, 'accessibility.node'));
    
    console.log('✅ Native modules loaded successfully');
    return true;
  } catch (error) {
    console.warn('⚠️ Native modules not available:', error.message);
    console.warn('   App will use fallback implementations (v0.1.0 mode)');
    return false;
  }
}

// Text Selection Module Wrapper
class TextSelectionManager {
  constructor() {
    this.isMonitoring = false;
    this.callback = null;
    this.hasNativeModule = !!textSelection;
  }

  // Start monitoring global text selection
  startMonitoring(callback) {
    if (!this.hasNativeModule) {
      throw new Error('Native text selection module not available');
    }

    if (!accessibility.checkAccessibilityPermissions()) {
      throw new Error('Accessibility permissions required for text selection monitoring');
    }

    this.callback = callback;
    this.isMonitoring = textSelection.startMonitoring((data) => {
      if (this.callback) {
        this.callback(data);
      }
    });

    return this.isMonitoring;
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.hasNativeModule || !this.isMonitoring) {
      return false;
    }

    const stopped = textSelection.stopMonitoring();
    if (stopped) {
      this.isMonitoring = false;
      this.callback = null;
    }
    return stopped;
  }

  // Get currently selected text
  async getSelectedText() {
    if (!this.hasNativeModule) {
      return this.getSelectedTextViaAppleScript();
    }

    if (!accessibility.checkAccessibilityPermissions()) {
      throw new Error('Accessibility permissions required');
    }

    return textSelection.getSelectedText();
  }

  // Fallback AppleScript implementation
  async getSelectedTextViaAppleScript() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const script = `
        tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
        end tell
        
        set oldClipboard to the clipboard
        tell application "System Events" to keystroke "c" using command down
        delay 0.1
        set selectedText to the clipboard
        set the clipboard to oldClipboard
        
        return selectedText
      `;

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      return {
        text: stdout.trim(),
        appName: 'Unknown',
        x: 0,
        y: 0
      };
    } catch (error) {
      return {
        text: '',
        appName: 'Unknown',
        x: 0,
        y: 0
      };
    }
  }
}

// Context Menu Module Wrapper
class ContextMenuManager {
  constructor() {
    this.isListening = false;
    this.menuItems = [];
    this.callback = null;
    this.hasNativeModule = !!contextMenu;
  }

  // Register context menu items
  registerContextMenu(menuItems, callback) {
    if (!this.hasNativeModule) {
      console.warn('Native context menu not available');
      return false;
    }

    this.menuItems = menuItems;
    this.callback = callback;

    return contextMenu.registerContextMenu(menuItems, (data) => {
      if (this.callback) {
        this.callback(data);
      }
    });
  }

  // Start listening for right-clicks
  startListening() {
    if (!this.hasNativeModule) {
      return false;
    }

    if (!accessibility.checkAccessibilityPermissions()) {
      throw new Error('Accessibility permissions required for context menu');
    }

    this.isListening = contextMenu.startListening();
    return this.isListening;
  }

  // Stop listening
  stopListening() {
    if (!this.hasNativeModule || !this.isListening) {
      return false;
    }

    const stopped = contextMenu.stopListening();
    if (stopped) {
      this.isListening = false;
    }
    return stopped;
  }

  // Show context menu at specific location
  showContextMenu(x, y, selectedText = '') {
    if (!this.hasNativeModule) {
      return false;
    }

    return contextMenu.showContextMenu(x, y, selectedText);
  }
}

// Accessibility Module Wrapper
class AccessibilityManager {
  constructor() {
    this.hasNativeModule = !!accessibility;
  }

  // Check accessibility permissions
  checkPermissions() {
    if (!this.hasNativeModule) {
      return false;
    }
    return accessibility.checkAccessibilityPermissions();
  }

  // Request accessibility permissions
  requestPermissions() {
    if (!this.hasNativeModule) {
      throw new Error('Native accessibility module not available');
    }
    return accessibility.requestAccessibilityPermissions();
  }

  // Get frontmost application
  getFrontmostApplication() {
    if (!this.hasNativeModule) {
      return this.getFrontmostAppViaAppleScript();
    }
    return accessibility.getFrontmostApplication();
  }

  // Get application windows
  getApplicationWindows(pid) {
    if (!this.hasNativeModule) {
      throw new Error('Native accessibility module required for window enumeration');
    }

    if (!this.checkPermissions()) {
      throw new Error('Accessibility permissions required');
    }

    return accessibility.getApplicationWindows(pid);
  }

  // Get focused element
  getFocusedElement() {
    if (!this.hasNativeModule) {
      return null;
    }

    if (!this.checkPermissions()) {
      throw new Error('Accessibility permissions required');
    }

    return accessibility.getFocusedElement();
  }

  // Set text in focused element
  setFocusedElementText(text) {
    if (!this.hasNativeModule) {
      return this.setTextViaKeyboard(text);
    }

    if (!this.checkPermissions()) {
      throw new Error('Accessibility permissions required');
    }

    return accessibility.setFocusedElementText(text);
  }

  // Insert text at cursor
  insertTextAtCursor(text) {
    if (!this.hasNativeModule) {
      return this.setTextViaKeyboard(text);
    }

    if (!this.checkPermissions()) {
      throw new Error('Accessibility permissions required');
    }

    return accessibility.insertTextAtCursor(text);
  }

  // Simulate key press
  simulateKeyPress(keyCode, withCommand = false, withShift = false, withOption = false, withControl = false) {
    if (!this.hasNativeModule) {
      throw new Error('Native accessibility module required for key simulation');
    }

    return accessibility.simulateKeyPress(keyCode, withCommand, withShift, withOption, withControl);
  }

  // Get element at point
  getElementAtPoint(x, y) {
    if (!this.hasNativeModule) {
      return null;
    }

    if (!this.checkPermissions()) {
      throw new Error('Accessibility permissions required');
    }

    return accessibility.getElementAtPoint(x, y);
  }

  // Fallback implementations
  async getFrontmostAppViaAppleScript() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const script = `
        tell application "System Events"
          set frontApp to first application process whose frontmost is true
          return "{\"name\":\"" & (name of frontApp) & "\",\"bundleId\":\"" & (bundle identifier of frontApp) & "\"}"
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      return JSON.parse(stdout.trim());
    } catch (error) {
      return { name: 'Unknown', bundleId: 'unknown' };
    }
  }

  async setTextViaKeyboard(text) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      const script = `tell application "System Events" to keystroke "${escapedText}"`;
      await execAsync(`osascript -e '${script}'`);
      return true;
    } catch (error) {
      console.error('Failed to set text via keyboard:', error);
      return false;
    }
  }
}

// Main native modules interface
class NativeModules {
  constructor() {
    this.initialized = false;
    this.textSelection = null;
    this.contextMenu = null;
    this.accessibility = null;
  }

  // Initialize all modules
  initialize() {
    if (this.initialized) {
      return true;
    }

    const hasNativeModules = initializeNativeModules();
    
    this.textSelection = new TextSelectionManager();
    this.contextMenu = new ContextMenuManager();
    this.accessibility = new AccessibilityManager();
    
    this.initialized = true;
    
    return hasNativeModules;
  }

  // Check if native modules are available
  isAvailable() {
    return this.textSelection?.hasNativeModule && 
           this.contextMenu?.hasNativeModule && 
           this.accessibility?.hasNativeModule;
  }

  // Get status of each module
  getStatus() {
    return {
      textSelection: this.textSelection?.hasNativeModule || false,
      contextMenu: this.contextMenu?.hasNativeModule || false,
      accessibility: this.accessibility?.hasNativeModule || false,
      permissions: this.accessibility?.checkPermissions() || false
    };
  }

  // Setup all modules for LLM Assistant
  async setupForAssistant() {
    if (!this.initialized) {
      this.initialize();
    }

    const status = this.getStatus();
    
    // Check permissions first
    if (!status.permissions && this.accessibility.hasNativeModule) {
      console.log('⚠️ Accessibility permissions required for full functionality');
      console.log('   The app will work in fallback mode until permissions are granted');
    }

    // Setup context menu for AI actions
    if (this.contextMenu.hasNativeModule && status.permissions) {
      const menuItems = [
        { title: '✨ Improve Text', action: 'improve', icon: 'sparkles' },
        { title: '📝 Summarize', action: 'summarize', icon: 'doc.text' },
        { title: '🌐 Translate', action: 'translate', icon: 'globe' },
        { title: '↩️ Draft Reply', action: 'reply', icon: 'arrowshape.turn.up.left' }
      ];

      this.contextMenu.registerContextMenu(menuItems, (data) => {
        // Emit event to main process
        if (global.nativeModuleCallback) {
          global.nativeModuleCallback('context-menu-action', data);
        }
      });

      this.contextMenu.startListening();
      console.log('✅ Context menu registered and listening');
    }

    // Setup text selection monitoring
    if (this.textSelection.hasNativeModule && status.permissions) {
      this.textSelection.startMonitoring((data) => {
        // Emit event to main process
        if (global.nativeModuleCallback) {
          global.nativeModuleCallback('text-selection', data);
        }
      });
      console.log('✅ Text selection monitoring started');
    }

    return status;
  }

  // Cleanup all modules
  cleanup() {
    if (this.textSelection) {
      this.textSelection.stopMonitoring();
    }

    if (this.contextMenu) {
      this.contextMenu.stopListening();
    }

    console.log('🧹 Native modules cleaned up');
  }
}

// Key codes for common keys (for accessibility.simulateKeyPress)
const KeyCodes = {
  // Letters
  A: 0, B: 11, C: 8, D: 2, E: 14, F: 3, G: 5, H: 4, I: 34, J: 38, K: 40, L: 37, M: 46,
  N: 45, O: 31, P: 35, Q: 12, R: 15, S: 1, T: 17, U: 32, V: 9, W: 13, X: 7, Y: 16, Z: 6,
  
  // Numbers
  ZERO: 29, ONE: 18, TWO: 19, THREE: 20, FOUR: 21, FIVE: 23, SIX: 22, SEVEN: 26, EIGHT: 28, NINE: 25,
  
  // Function keys
  F1: 122, F2: 120, F3: 99, F4: 118, F5: 96, F6: 97, F7: 98, F8: 100, F9: 101, F10: 109, F11: 103, F12: 111,
  
  // Special keys
  SPACE: 49, RETURN: 36, TAB: 48, DELETE: 51, BACKSPACE: 51, ESCAPE: 53,
  LEFT_ARROW: 123, RIGHT_ARROW: 124, DOWN_ARROW: 125, UP_ARROW: 126,
  
  // Modifiers (these are flags, not key codes)
  COMMAND: 'command', SHIFT: 'shift', OPTION: 'option', CONTROL: 'control'
};

// Export singleton instance
const nativeModules = new NativeModules();

module.exports = {
  nativeModules,
  KeyCodes,
  TextSelectionManager,
  ContextMenuManager,
  AccessibilityManager
};