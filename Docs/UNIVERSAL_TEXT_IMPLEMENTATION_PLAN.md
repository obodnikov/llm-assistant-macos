# Universal Text Processing — Implementation Plan

**Version:** 2.0.0 (target)
**Previous Version:** 1.1.0
**Goal:** Transform the Mail.app-focused LLM Assistant into a universal text processing tool that works with any selected text or clipboard content from any macOS application, while preserving Mail.app as a premium integration.

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Target Architecture](#2-target-architecture)
3. [Phase 1 — Core Text Capture Engine](#3-phase-1--core-text-capture-engine)
4. [Phase 2 — Source App Context Detection](#4-phase-2--source-app-context-detection)
5. [Phase 3 — UI Refactoring](#5-phase-3--ui-refactoring)
6. [Phase 4 — Apply-Back Mechanism](#6-phase-4--apply-back-mechanism)
7. [Phase 5 — Settings & Prompts Expansion](#7-phase-5--settings--prompts-expansion)
8. [Phase 6 — Documentation & Release](#8-phase-6--documentation--release)
9. [Cross-Phase Dependencies](#9-cross-phase-dependencies)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Current State Summary

### What exists today

- Electron 28.3.3 desktop app, macOS-only, background app (no dock icon)
- Global hotkey `Cmd+Option+L` toggles a floating assistant panel
- Mail.app integration via AppleScript: context detection, window enumeration, content extraction
- OpenAI API processing with GPT-5/GPT-4 parameter branching
- Native C++/Obj-C modules: text selection, context menu, accessibility (with AppleScript fallbacks)
- Privacy filtering (local, before API calls)
- Model management system with JSON config + user overrides
- Configurable prompts for quick actions

### What already supports universal use (no changes needed)
- `process-ai` IPC handler — completely app-agnostic (takes text + prompt + context)
- `read-clipboard` / `write-clipboard` IPC handlers
- `get-selected-text` IPC handler (uses native module or AppleScript fallback)
- `insert-text-at-cursor` IPC handler (native module or clipboard fallback)
- `filter-sensitive-content` IPC handler
- `systemAPI` bridge in preload (clipboard, selected text, notifications)
- `nativeModulesAPI` bridge (text selection events, context menu events, quick actions)
- Privacy filtering engine
- Model management system
- Settings storage (electron-store)

### What is Mail.app-specific (needs refactoring)
- `checkMailContext()` in assistant.js — called on every panel show
- `loadCurrentSelection()` — calls `getMailWindowContext` directly
- `updateMailContext()` — only handles compose/viewer/mailbox types
- Context indicator UI — hardcoded 📧 icon and "Mail Context Detected"
- Quick actions — "Draft Reply" only enabled for mail contexts
- `handleQuickAction()` — prompt generation assumes email content
- `resetOnShow()` — only refreshes mail context
- `toggleAssistant()` in main.js — no text capture on show
- System prompt additions — only compose/mailbox context types

### Key files and their roles
| File | Role | Lines (approx) |
|------|------|----------------|
| `src/main/main.js` | Main process: IPC, shortcuts, AppleScript, OpenAI | ~620 |
| `src/preload/preload.js` | IPC bridge: electronAPI, systemAPI, nativeModulesAPI | ~85 |
| `src/renderer/js/assistant.js` | UI logic: AssistantPanel class | ~940 |
| `src/renderer/assistant.html` | Panel markup | ~230 |
| `src/renderer/css/assistant.css` | Styling | ~varies |
| `native-modules/index.js` | Native module JS wrapper with fallbacks | ~430 |

---

## 2. Target Architecture

### Text capture flow (new)
```
User presses Cmd+Option+L
  → main.js: toggleAssistant()
    → Step 1: Detect frontmost app (native module or AppleScript)
    → Step 2: Capture selected text (native module or AppleScript clipboard trick)
    → Step 3: Determine context type:
        - If frontmost app is Mail.app → use existing Mail AppleScript flow (rich context)
        - If any other app → use generic text capture (selected text or clipboard)
        - If no text found → offer clipboard content or manual input
    → Step 4: Send captured context to renderer via IPC
    → Step 5: Show panel, renderer displays context-aware UI
```

### Context object (new unified format)
```javascript
// Replaces the current mail-only context
{
  source: 'mail' | 'app' | 'clipboard' | 'manual',
  appName: 'Mail' | 'Safari' | 'Notes' | 'Slack' | ...,
  appBundleId: 'com.apple.mail' | 'com.apple.Safari' | ...,
  type: 'compose' | 'viewer' | 'mailbox' | 'selection' | 'clipboard' | 'manual',
  text: '...',                    // The captured text
  // Mail-specific fields (only when source === 'mail')
  subject: '...',
  sender: '...',
  // Metadata
  capturedAt: Date.now(),
  textLength: 123
}
```

### Quick actions (new dynamic set)
```
Always visible:
  📝 Summarize    — works on any text
  🌐 Translate    — works on any text
  ✨ Improve      — works on any text
  🔧 Fix Grammar  — NEW, works on any text

Contextual (shown based on source):
  ↩️ Draft Reply  — only for mail (source === 'mail' && type === 'viewer')
  📏 Make Shorter — NEW, any text
  📐 Make Longer  — NEW, any text
  💡 Explain      — NEW, any text
```

---

## 3. Phase 1 — Core Text Capture Engine

**Goal:** Add a universal text capture mechanism in the main process that runs on every hotkey press, before showing the panel. This is the foundation everything else builds on.

**Can be implemented independently:** Yes
**Depends on:** Nothing
**Estimated scope:** ~150 lines new/modified code

### 3.1 New IPC handler: `capture-context`

**File:** `src/main/main.js`
**Location:** Add after the existing `get-selected-text` handler (around line 600)

Create a new IPC handler that orchestrates the full text capture flow:

```javascript
ipcMain.handle('capture-context', async () => {
  const context = {
    source: 'manual',
    appName: null,
    appBundleId: null,
    type: 'manual',
    text: '',
    subject: null,
    sender: null,
    capturedAt: Date.now(),
    textLength: 0
  };

  try {
    // Step 1: Detect frontmost app
    const frontApp = await detectFrontmostApp();
    context.appName = frontApp.name;
    context.appBundleId = frontApp.bundleId;

    // Step 2: Route based on app
    if (frontApp.name === 'Mail') {
      // Use existing rich Mail.app integration
      const mailContext = await captureMailContext();
      if (mailContext && mailContext.type !== 'error') {
        context.source = 'mail';
        context.type = mailContext.type;
        context.text = mailContext.content || '';
        context.subject = mailContext.subject || null;
        context.sender = mailContext.sender || null;
      }
    }

    // Step 3: If no text yet, try generic text selection
    if (!context.text) {
      const selectedText = await captureSelectedText();
      if (selectedText) {
        context.source = 'app';
        context.type = 'selection';
        context.text = selectedText;
      }
    }

    // Step 4: If still no text, try clipboard
    if (!context.text) {
      const clipboardText = clipboard.readText();
      if (clipboardText && clipboardText.trim()) {
        context.source = 'clipboard';
        context.type = 'clipboard';
        context.text = clipboardText;
      }
    }

    context.textLength = context.text.length;
  } catch (error) {
    console.error('Context capture failed:', error);
  }

  return context;
});
```

### 3.2 Helper function: `detectFrontmostApp()`

**File:** `src/main/main.js`
**Location:** Add after `executeAppleScript()` function (around line 300)

```javascript
async function detectFrontmostApp() {
  // Try native module first
  if (nativeModulesReady && nativeModules.accessibility) {
    try {
      const appInfo = await nativeModules.accessibility.getFrontmostApplication();
      if (appInfo && appInfo.name) {
        return { name: appInfo.name, bundleId: appInfo.bundleId || null };
      }
    } catch (error) {
      console.log('Native frontmost app detection failed, using AppleScript fallback');
    }
  }

  // AppleScript fallback
  try {
    const script = `
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        set appId to bundle identifier of frontApp
        return appName & "|||" & appId
      end tell
    `;
    const result = await executeAppleScript(script);
    const parts = result.split('|||');
    return { name: parts[0] || 'Unknown', bundleId: parts[1] || null };
  } catch (error) {
    console.error('Frontmost app detection failed:', error);
    return { name: 'Unknown', bundleId: null };
  }
}
```

### 3.3 Helper function: `captureSelectedText()`

**File:** `src/main/main.js`
**Location:** Add after `detectFrontmostApp()`

```javascript
async function captureSelectedText() {
  // Try native module first
  if (nativeModulesReady && nativeModules.textSelection) {
    try {
      const selection = await nativeModules.textSelection.getSelectedText();
      if (selection && selection.text && selection.text.trim()) {
        return selection.text;
      }
    } catch (error) {
      console.log('Native text selection failed, trying AppleScript fallback');
    }
  }

  // AppleScript fallback: copy selection to clipboard, read it, restore original
  try {
    const script = `
      tell application "System Events"
        -- Save current clipboard
        set oldClipboard to the clipboard
        
        -- Copy current selection
        keystroke "c" using command down
        delay 0.1
        
        -- Read the new clipboard content
        set selectedText to the clipboard
        
        -- Restore original clipboard
        set the clipboard to oldClipboard
        
        return selectedText
      end tell
    `;
    const result = await executeAppleScript(script);
    if (result && result.trim() && result !== 'oldClipboard') {
      return result.trim();
    }
  } catch (error) {
    console.log('AppleScript text selection fallback failed:', error);
  }

  return null;
}
```

### 3.4 Helper function: `captureMailContext()`

**File:** `src/main/main.js`
**Location:** Add after `captureSelectedText()`

This is a refactored extraction of the existing `get-mail-context` logic into a reusable function:

```javascript
async function captureMailContext() {
  // Reuse the existing AppleScript logic from get-mail-window-context handler
  // Extract the script execution into this function so both the IPC handler
  // and capture-context can use it
  try {
    const getSelectionScript = `
      tell application "Mail"
        set windowType to "unknown"
        set msgContent to ""
        set msgSubject to ""
        set msgSender to ""

        try
          repeat with w in (every window whose visible is true)
            try
              set msgs to every outgoing message of w
              if (count of msgs) > 0 then
                set windowType to "compose"
                set msg to item 1 of msgs
                set msgSubject to subject of msg as string
                set msgContent to content of msg as string
                return windowType & "|||SEP|||" & msgSubject & "|||SEP|||" & msgContent
              end if
            end try
          end repeat
        end try

        try
          set selectedMessages to selection
          if (count of selectedMessages) > 0 then
            set firstMessage to item 1 of selectedMessages
            set windowType to "viewer"
            set msgSubject to subject of firstMessage as string
            set msgContent to content of firstMessage as string
            set msgSender to sender of firstMessage as string
            return windowType & "|||SEP|||" & msgSubject & "|||SEP|||" & msgContent & "|||SEP|||" & msgSender
          end if
        end try

        return "mailbox|||SEP|||No email selected|||SEP|||"
      end tell
    `;

    const result = await executeAppleScript(getSelectionScript);
    const parts = result.split('|||SEP|||');

    if (parts[0] === 'compose') {
      return { type: 'compose', subject: parts[1], content: parts[2] };
    } else if (parts[0] === 'viewer') {
      return { type: 'viewer', subject: parts[1], content: parts[2], sender: parts[3] };
    } else {
      return { type: 'mailbox' };
    }
  } catch (error) {
    console.error('Mail context capture failed:', error);
    return { type: 'error', error: error.message };
  }
}
```

### 3.5 Update preload bridge

**File:** `src/preload/preload.js`
**Location:** Add to `electronAPI` object (around line 20)

Add the new IPC channel:
```javascript
// Universal context capture
captureContext: () => ipcRenderer.invoke('capture-context'),
```

### 3.6 Modify `toggleAssistant()` to capture context before showing

**File:** `src/main/main.js`
**Location:** `toggleAssistant()` function (line 145)

Current behavior: shows panel, then renderer calls `checkMailContext()`.
New behavior: capture context in main process, send to renderer with `window-shown` event.

```javascript
function toggleAssistant() {
  if (!assistantPanel) {
    createAssistantPanel();
    return;
  }

  if (assistantPanel.isVisible()) {
    assistantPanel.hide();
  } else {
    // Position panel at cursor
    const { screen } = require('electron');
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);

    assistantPanel.setPosition(
      Math.min(cursor.x + 20, display.bounds.width - 400),
      Math.min(cursor.y + 20, display.bounds.height - 520)
    );

    assistantPanel.show();
    assistantPanel.focus();

    // Notify renderer that window is shown (context will be fetched by renderer)
    assistantPanel.webContents.send('window-shown');
  }
}
```

Note: The actual context capture happens in the renderer via `captureContext()` call in `resetOnShow()`. This avoids a race condition where the main process captures context before the renderer is ready to receive it.

### 3.7 Files changed in Phase 1

| File | Change Type | What |
|------|-------------|------|
| `src/main/main.js` | Add | `detectFrontmostApp()` function |
| `src/main/main.js` | Add | `captureSelectedText()` function |
| `src/main/main.js` | Add | `captureMailContext()` function (extracted from existing handler) |
| `src/main/main.js` | Add | `capture-context` IPC handler |
| `src/main/main.js` | Modify | Refactor `get-mail-window-context` to use `captureMailContext()` |
| `src/preload/preload.js` | Add | `captureContext` to electronAPI |

### 3.8 Testing Phase 1

1. Open Mail.app, select an email → `Cmd+Option+L` → verify `capture-context` returns `source: 'mail'`
2. Open Safari, select text on a page → `Cmd+Option+L` → verify `source: 'app'`, `type: 'selection'`
3. Copy text to clipboard, deselect everything → `Cmd+Option+L` → verify `source: 'clipboard'`
4. No text selected, empty clipboard → verify `source: 'manual'`, `text: ''`
5. Verify existing `get-mail-context` and `get-mail-window-context` handlers still work (backward compat)

---

## 4. Phase 2 — Source App Context Detection

**Goal:** Build an app-awareness layer that identifies the source application and categorizes it for UI and prompt decisions.

**Can be implemented independently:** Yes (but Phase 1 should be done first for full integration)
**Depends on:** Phase 1 (uses `detectFrontmostApp()`)
**Estimated scope:** ~80 lines new code + new file

### 4.1 New module: `src/main/contextDetector.js`

Create a dedicated module for app categorization logic. This keeps main.js clean and makes the logic testable.

```javascript
/**
 * Context Detector — categorizes source applications for UI and prompt decisions.
 * 
 * App categories determine which quick actions are shown and how prompts are built.
 */

const APP_CATEGORIES = {
  email: {
    apps: ['Mail', 'Outlook', 'Spark', 'Airmail', 'Thunderbird'],
    bundleIds: ['com.apple.mail', 'com.microsoft.Outlook', 'com.readdle.smartemail.macos'],
    icon: '📧',
    label: 'Email',
    actions: ['summarize', 'translate', 'improve', 'fixGrammar', 'reply']
  },
  browser: {
    apps: ['Safari', 'Google Chrome', 'Firefox', 'Arc', 'Brave Browser', 'Microsoft Edge'],
    bundleIds: ['com.apple.Safari', 'com.google.Chrome', 'org.mozilla.firefox'],
    icon: '🌐',
    label: 'Browser',
    actions: ['summarize', 'translate', 'improve', 'fixGrammar', 'explain', 'makeShorter', 'makeLonger']
  },
  editor: {
    apps: ['TextEdit', 'Notes', 'Pages', 'Microsoft Word', 'Google Docs'],
    bundleIds: ['com.apple.TextEdit', 'com.apple.Notes', 'com.apple.iWork.Pages'],
    icon: '📝',
    label: 'Document',
    actions: ['summarize', 'translate', 'improve', 'fixGrammar', 'makeShorter', 'makeLonger']
  },
  code: {
    apps: ['Visual Studio Code', 'Xcode', 'Sublime Text', 'Cursor', 'Kiro', 'Terminal', 'iTerm2', 'Warp'],
    bundleIds: ['com.microsoft.VSCode', 'com.apple.dt.Xcode'],
    icon: '💻',
    label: 'Code',
    actions: ['summarize', 'improve', 'explain', 'fixGrammar']
  },
  messaging: {
    apps: ['Messages', 'Slack', 'Telegram', 'Discord', 'WhatsApp', 'Microsoft Teams'],
    bundleIds: ['com.apple.MobileSMS', 'com.tinyspeck.slackmacgap'],
    icon: '💬',
    label: 'Messaging',
    actions: ['summarize', 'translate', 'improve', 'fixGrammar', 'reply']
  },
  unknown: {
    apps: [],
    bundleIds: [],
    icon: '📋',
    label: 'Text',
    actions: ['summarize', 'translate', 'improve', 'fixGrammar', 'explain', 'makeShorter', 'makeLonger']
  }
};

function categorizeApp(appName, bundleId) {
  for (const [category, config] of Object.entries(APP_CATEGORIES)) {
    if (category === 'unknown') continue;
    
    if (bundleId && config.bundleIds.includes(bundleId)) {
      return { category, ...config };
    }
    if (appName && config.apps.some(name => 
      appName.toLowerCase().includes(name.toLowerCase())
    )) {
      return { category, ...config };
    }
  }
  
  return { category: 'unknown', ...APP_CATEGORIES.unknown };
}

function getAvailableActions(context) {
  if (context.source === 'mail') {
    return APP_CATEGORIES.email.actions;
  }
  
  const appCategory = categorizeApp(context.appName, context.appBundleId);
  return appCategory.actions;
}

function getContextIcon(context) {
  if (context.source === 'clipboard') return '📎';
  if (context.source === 'manual') return '✏️';
  if (context.source === 'mail') return '📧';
  
  const appCategory = categorizeApp(context.appName, context.appBundleId);
  return appCategory.icon;
}

function getContextLabel(context) {
  if (context.source === 'clipboard') return 'Clipboard';
  if (context.source === 'manual') return 'Manual input';
  if (context.source === 'mail') {
    if (context.type === 'compose') return 'Composing email';
    if (context.type === 'viewer') return `Email: ${(context.subject || '').substring(0, 40)}`;
    return 'Mail';
  }
  
  return `Text from ${context.appName || 'Unknown app'}`;
}

module.exports = {
  APP_CATEGORIES,
  categorizeApp,
  getAvailableActions,
  getContextIcon,
  getContextLabel
};
```

### 4.2 Integrate with `capture-context` handler

**File:** `src/main/main.js`

Add to the `capture-context` IPC handler (from Phase 1), after building the context object:

```javascript
const { categorizeApp, getAvailableActions, getContextIcon, getContextLabel } = require('./contextDetector');

// ... inside capture-context handler, before return:
const appCategory = categorizeApp(context.appName, context.appBundleId);
context.category = appCategory.category;
context.categoryIcon = getContextIcon(context);
context.categoryLabel = getContextLabel(context);
context.availableActions = getAvailableActions(context);
```

### 4.3 Add to preload bridge

**File:** `src/preload/preload.js`

No additional changes needed — the `captureContext` channel from Phase 1 returns the enriched context object.

### 4.4 Files changed in Phase 2

| File | Change Type | What |
|------|-------------|------|
| `src/main/contextDetector.js` | New file | App categorization module |
| `src/main/main.js` | Modify | Import contextDetector, enrich capture-context response |

### 4.5 Testing Phase 2

1. Trigger from Mail.app → verify `category: 'email'`, `categoryIcon: '📧'`
2. Trigger from Safari → verify `category: 'browser'`, `categoryIcon: '🌐'`
3. Trigger from VS Code → verify `category: 'code'`, `categoryIcon: '💻'`
4. Trigger from Notes → verify `category: 'editor'`, `categoryIcon: '📝'`
5. Trigger from Slack → verify `category: 'messaging'`, `categoryIcon: '💬'`
6. Trigger from unknown app → verify `category: 'unknown'`, `categoryIcon: '📋'`
7. Clipboard fallback → verify `categoryIcon: '📎'`
8. Verify `availableActions` array matches expected actions per category

---

## 5. Phase 3 — UI Refactoring

**Goal:** Update the renderer (HTML + JS) to use the new universal context system. Replace the Mail-only context indicator with a universal one. Make quick actions dynamic based on source app.

**Can be implemented independently:** No
**Depends on:** Phase 1 (capture-context IPC), Phase 2 (context enrichment)
**Estimated scope:** ~250 lines modified across HTML, JS, CSS

### 5.1 Update `assistant.html` — Context indicator

**File:** `src/renderer/assistant.html`

Replace the current mail-specific context indicator (lines ~83-92):

**Current:**
```html
<div id="context-indicator" class="context-indicator hidden">
    <div class="context-icon">📧</div>
    <div class="context-info">
        <div class="context-title">Mail Context Detected</div>
        <div class="context-details"></div>
    </div>
    <button id="refresh-selection-btn" class="icon-btn" title="Refresh selected email">🔄</button>
</div>
```

**New:**
```html
<div id="context-indicator" class="context-indicator hidden">
    <div id="context-icon" class="context-icon">📋</div>
    <div class="context-info">
        <div id="context-title" class="context-title">Text Captured</div>
        <div id="context-details" class="context-details"></div>
    </div>
    <button id="refresh-context-btn" class="icon-btn" title="Recapture text">🔄</button>
</div>
```

### 5.2 Update `assistant.html` — Quick actions

**File:** `src/renderer/assistant.html`

Replace the static quick actions block (lines ~96-113):

**New:**
```html
<div id="quick-actions" class="quick-actions">
    <!-- Always visible -->
    <button class="action-btn" data-action="summarize">
        <span class="action-icon">📝</span>
        <span class="action-text">Summarize</span>
    </button>
    <button class="action-btn" data-action="translate">
        <span class="action-icon">🌐</span>
        <span class="action-text">Translate</span>
    </button>
    <button class="action-btn" data-action="improve">
        <span class="action-icon">✨</span>
        <span class="action-text">Improve</span>
    </button>
    <button class="action-btn" data-action="fixGrammar">
        <span class="action-icon">🔧</span>
        <span class="action-text">Fix Grammar</span>
    </button>
    <!-- Contextual — shown/hidden by JS -->
    <button class="action-btn contextual-action" data-action="reply" style="display:none;">
        <span class="action-icon">↩️</span>
        <span class="action-text">Draft Reply</span>
    </button>
    <button class="action-btn contextual-action" data-action="explain" style="display:none;">
        <span class="action-icon">💡</span>
        <span class="action-text">Explain</span>
    </button>
    <button class="action-btn contextual-action" data-action="makeShorter" style="display:none;">
        <span class="action-icon">📏</span>
        <span class="action-text">Shorter</span>
    </button>
    <button class="action-btn contextual-action" data-action="makeLonger" style="display:none;">
        <span class="action-icon">📐</span>
        <span class="action-text">Longer</span>
    </button>
</div>
```

### 5.3 Update `assistant.html` — Remove Mail window selector

**File:** `src/renderer/assistant.html`

Remove or hide the window selector block (lines ~95-105). It's Mail-specific and won't be needed in the universal flow. Keep the HTML but add `style="display:none"` — it can be shown conditionally when source is Mail and multiple windows exist.

### 5.4 Update `assistant.js` — Replace `checkMailContext()` with `loadContext()`

**File:** `src/renderer/js/assistant.js`

Replace the `checkMailContext()` method (line ~371):

```javascript
async loadContext() {
  try {
    if (!window.electronAPI || !window.electronAPI.captureContext) {
      this.hideContextIndicator();
      return;
    }

    const context = await window.electronAPI.captureContext();
    this.updateContext(context);
  } catch (error) {
    console.log('Context capture failed:', error);
    this.hideContextIndicator();
  }
}
```

### 5.5 Update `assistant.js` — Replace `updateMailContext()` with `updateContext()`

**File:** `src/renderer/js/assistant.js`

Replace `updateMailContext()` (line ~400):

```javascript
updateContext(context) {
  if (!context || (!context.text && context.source === 'manual')) {
    this.hideContextIndicator();
    this.currentContext = null;
    return;
  }

  this.currentContext = context;

  // Update context indicator
  const iconEl = document.getElementById('context-icon');
  const titleEl = document.getElementById('context-title');
  const detailsEl = document.getElementById('context-details');

  if (iconEl) iconEl.textContent = context.categoryIcon || '📋';
  if (titleEl) titleEl.textContent = context.categoryLabel || 'Text Captured';
  if (detailsEl) {
    const preview = context.text ? context.text.substring(0, 60).trim() + '...' : '';
    detailsEl.textContent = preview;
  }

  if (this.contextIndicator) {
    this.contextIndicator.classList.remove('hidden');
  }

  // Update quick actions visibility
  this.updateQuickActions(context);
}

hideContextIndicator() {
  if (this.contextIndicator) {
    this.contextIndicator.classList.add('hidden');
  }
}
```

### 5.6 Update `assistant.js` — Replace `updateQuickActions()`

**File:** `src/renderer/js/assistant.js`

Replace `updateQuickActions()` (line ~494):

```javascript
updateQuickActions(context) {
  const availableActions = context.availableActions || 
    ['summarize', 'translate', 'improve', 'fixGrammar'];

  // Show/hide contextual action buttons
  this.actionButtons.forEach(btn => {
    const action = btn.dataset.action;
    const isContextual = btn.classList.contains('contextual-action');

    if (isContextual) {
      // Show only if in available actions list
      btn.style.display = availableActions.includes(action) ? '' : 'none';
    }

    // Enable all visible buttons (text is available)
    const hasText = context.text && context.text.trim().length > 0;
    btn.disabled = !hasText;
    btn.style.opacity = hasText ? '1' : '0.5';
  });
}
```

### 5.7 Update `assistant.js` — Modify `handleQuickAction()`

**File:** `src/renderer/js/assistant.js`

Update the `handleQuickAction()` method (line ~514) to handle new actions and use universal context:

```javascript
async handleQuickAction(action) {
  if (this.isProcessing) return;

  let prompt = '';
  let textToProcess = '';

  try {
    // Get text from current context
    if (this.currentContext && this.currentContext.text) {
      textToProcess = this.currentContext.text;
    } else if (window.systemAPI) {
      textToProcess = await window.systemAPI.getSelectedText() ||
                      await window.systemAPI.readClipboard() || '';
    }

    // Generate prompt based on action
    switch (action) {
      case 'summarize':
        if (this.currentContext?.source === 'mail' && this.currentContext?.sender) {
          prompt = `Please summarize this email from ${this.currentContext.sender}:`;
        } else {
          prompt = this.settings.promptSummarize || 
            'Please summarize this text concisely, highlighting the key points:';
        }
        break;
      case 'translate':
        prompt = this.settings.promptTranslate || 
          'Please translate this text to English (or if already in English, ask which language):';
        break;
      case 'improve':
        prompt = this.settings.promptImprove || 
          'Please improve this text for clarity, tone, and professionalism:';
        break;
      case 'fixGrammar':
        prompt = this.settings.promptFixGrammar || 
          'Please fix grammar, spelling, and punctuation in this text. Keep the original meaning and tone:';
        break;
      case 'reply':
        if (this.currentContext?.source === 'mail') {
          prompt = 'Based on this email, help me draft a professional reply:';
        } else {
          prompt = 'Help me draft a reply to this message:';
        }
        break;
      case 'explain':
        prompt = this.settings.promptExplain || 
          'Please explain this text in simple terms:';
        break;
      case 'makeShorter':
        prompt = this.settings.promptMakeShorter || 
          'Please make this text shorter while keeping the key information:';
        break;
      case 'makeLonger':
        prompt = this.settings.promptMakeLonger || 
          'Please expand this text with more detail and explanation:';
        break;
    }

    if (!textToProcess.trim()) {
      this.showError('No text available. Select text in any app and press Cmd+Option+L.');
      return;
    }

    // Store text and set prompt for user to edit before processing
    this.storedText = textToProcess;
    if (this.userInput) {
      this.userInput.value = prompt;
      this.userInput.focus();
    }
  } catch (error) {
    console.error('Quick action failed:', error);
    this.showError('Failed to perform quick action. Please try again.');
  }
}
```

### 5.8 Update `assistant.js` — Modify `resetOnShow()`

**File:** `src/renderer/js/assistant.js`

Replace `resetOnShow()` (line ~800):

```javascript
resetOnShow() {
  // Clear all UI state
  this.clearAll();

  // Clear context indicator
  this.hideContextIndicator();

  // Capture fresh context from frontmost app
  this.loadContext();

  // Clear stored text
  this.storedText = null;

  // Clear results content
  if (this.resultsContent) {
    this.resultsContent.innerHTML = '';
  }

  console.log('Assistant state reset on window show');
}
```

### 5.9 Update `assistant.js` — Modify `processRequest()`

**File:** `src/renderer/js/assistant.js`

Update `processRequest()` (line ~644) to use universal context:

```javascript
async processRequest() {
  if (this.isProcessing || !this.userInput) return;

  const prompt = this.userInput.value.trim();
  if (!prompt) {
    this.showError('Please enter a description of what you need.');
    return;
  }

  let textToProcess = '';
  try {
    if (this.storedText) {
      textToProcess = this.storedText;
    } else if (this.currentContext && this.currentContext.text) {
      textToProcess = this.currentContext.text;
    } else if (window.systemAPI) {
      textToProcess = await window.systemAPI.getSelectedText() ||
                      await window.systemAPI.readClipboard() || '';
    }
  } catch (error) {
    console.log('Could not get text context:', error);
  }

  await this.processWithText(textToProcess, prompt);
  this.storedText = null;
}
```

### 5.10 Update `assistant.js` — Modify constructor

**File:** `src/renderer/js/assistant.js`

In the constructor (line ~1), replace `this.checkMailContext()` with `this.loadContext()`:

```javascript
constructor() {
  this.currentContext = null;
  this.isProcessing = false;
  this.settings = {};
  this.availableWindows = [];  // Keep for backward compat, may remove later
  this.selectedWindowIndex = null;

  this.initializeElements();
  this.bindEvents();
  this.loadAvailableModels();
  this.loadSettings();
  this.updateTheme();
  this.loadContext();  // ← Changed from checkMailContext()

  this.nativeModulesAvailable = false;
  this.checkNativeModules();

  this.hideLoadingOverlay();
}
```

### 5.11 Update `assistant.js` — Modify `initializeElements()`

**File:** `src/renderer/js/assistant.js`

Update element references for renamed IDs:

```javascript
// In initializeElements(), update:
this.contextIcon = document.getElementById('context-icon');
this.contextTitle = document.getElementById('context-title');
this.contextDetails = document.getElementById('context-details');  // was 'context-details' class
this.refreshContextBtn = document.getElementById('refresh-context-btn');  // was 'refresh-selection-btn'
```

### 5.12 Update `assistant.js` — Modify `bindEvents()`

**File:** `src/renderer/js/assistant.js`

Update the refresh button binding:

```javascript
// Replace refresh-selection-btn binding with:
if (this.refreshContextBtn) {
  this.refreshContextBtn.addEventListener('click', () => this.loadContext());
}
```

### 5.13 Update `assistant.css` — Minor adjustments

**File:** `src/renderer/css/assistant.css`

No major CSS changes needed. The existing `.context-indicator`, `.quick-actions`, and `.action-btn` styles work for the universal version. Minor additions:

```css
/* Contextual action buttons — smooth show/hide */
.contextual-action {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* Text preview in context details */
.context-details {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

### 5.14 Files changed in Phase 3

| File | Change Type | What |
|------|-------------|------|
| `src/renderer/assistant.html` | Modify | Universal context indicator, dynamic quick actions, hide mail selector |
| `src/renderer/js/assistant.js` | Modify | Replace mail-specific methods with universal ones |
| `src/renderer/css/assistant.css` | Modify | Minor additions for contextual actions |

### 5.15 Testing Phase 3

1. Trigger from Mail.app → verify 📧 icon, "Email: [subject]" label, Draft Reply visible
2. Trigger from Safari with text selected → verify 🌐 icon, "Text from Safari", no Draft Reply
3. Trigger from VS Code → verify 💻 icon, "Text from Visual Studio Code", Explain visible
4. Trigger with clipboard only → verify 📎 icon, "Clipboard" label
5. Trigger with no text → verify context indicator hidden, actions disabled
6. Click "Recapture text" button → verify context refreshes
7. Quick actions: test Summarize, Translate, Improve, Fix Grammar with generic text
8. Quick actions: test Draft Reply only appears for email/messaging contexts
9. Verify edit-before-process workflow still works (prompt appears in textarea)
10. Verify Process button works end-to-end with universal context

---

## 6. Phase 4 — Apply-Back Mechanism

**Goal:** Implement the "Apply" button to insert AI-generated results back into the source application. This replaces the current placeholder `applyResult()` method.

**Can be implemented independently:** Partially (needs Phase 1 for source app tracking)
**Depends on:** Phase 1 (context object with appName), Phase 3 (universal context in renderer)
**Estimated scope:** ~120 lines new/modified code

### 6.1 Strategy

Three-tier approach for applying results:

1. **Native text insertion** (best) — Use accessibility module's `insertTextAtCursor()` to type text directly into the source app. Requires Accessibility permissions.
2. **Clipboard + paste simulation** (fallback) — Write result to clipboard, switch to source app, simulate Cmd+V. Works without special permissions but overwrites clipboard.
3. **Clipboard only** (safe fallback) — Just copy to clipboard and notify user. Always works.

### 6.2 New IPC handler: `apply-to-source`

**File:** `src/main/main.js`
**Location:** Add after `insert-text-at-cursor` handler

```javascript
ipcMain.handle('apply-to-source', async (event, text, sourceAppName) => {
  try {
    // Step 1: Try native text insertion
    if (nativeModulesReady && nativeModules.accessibility) {
      // Activate the source app first
      await activateApp(sourceAppName);
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for app to focus
      
      const inserted = await nativeModules.accessibility.insertTextAtCursor(text);
      if (inserted) {
        return { success: true, method: 'native' };
      }
    }

    // Step 2: Clipboard + paste fallback
    if (sourceAppName) {
      clipboard.writeText(text);
      await activateApp(sourceAppName);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Simulate Cmd+V
      const pasteScript = `
        tell application "System Events"
          keystroke "v" using command down
        end tell
      `;
      await executeAppleScript(pasteScript);
      return { success: true, method: 'paste' };
    }

    // Step 3: Clipboard only
    clipboard.writeText(text);
    return { success: true, method: 'clipboard' };

  } catch (error) {
    console.error('Apply to source failed:', error);
    // Always fall back to clipboard
    clipboard.writeText(text);
    return { success: true, method: 'clipboard', error: error.message };
  }
});
```

### 6.3 Helper function: `activateApp()`

**File:** `src/main/main.js`
**Location:** Add after `captureSelectedText()`

```javascript
async function activateApp(appName) {
  if (!appName || appName === 'Unknown') return;
  
  try {
    const script = `
      tell application "${appName}"
        activate
      end tell
    `;
    await executeAppleScript(script);
  } catch (error) {
    console.error('Failed to activate app:', error);
  }
}
```

### 6.4 Update preload bridge

**File:** `src/preload/preload.js`

Add to `electronAPI`:
```javascript
applyToSource: (text, sourceAppName) => ipcRenderer.invoke('apply-to-source', text, sourceAppName),
```

### 6.5 Update `assistant.js` — Implement `applyResult()`

**File:** `src/renderer/js/assistant.js`

Replace the placeholder `applyResult()` (line ~777):

```javascript
async applyResult() {
  try {
    if (!this.resultsContent || !window.electronAPI) return;

    const text = this.resultsContent.textContent;
    if (!text) return;

    const sourceApp = this.currentContext?.appName || null;
    const result = await window.electronAPI.applyToSource(text, sourceApp);

    // Show feedback based on method used
    if (this.applyResultBtn) {
      let feedback = '✓';
      if (result.method === 'clipboard') {
        feedback = '📋'; // Indicate it was copied, not inserted
      }
      const originalText = this.applyResultBtn.textContent;
      this.applyResultBtn.textContent = feedback;
      setTimeout(() => {
        this.applyResultBtn.textContent = originalText;
      }, 1500);
    }

    // If clipboard-only, show notification
    if (result.method === 'clipboard' && window.systemAPI) {
      await window.systemAPI.showNotification(
        'Copied to Clipboard',
        'Result copied. Paste it into your target app with Cmd+V.'
      );
    }
  } catch (error) {
    console.error('Failed to apply result:', error);
    // Fallback: just copy
    await this.copyResult();
  }
}
```

### 6.6 Files changed in Phase 4

| File | Change Type | What |
|------|-------------|------|
| `src/main/main.js` | Add | `activateApp()` function |
| `src/main/main.js` | Add | `apply-to-source` IPC handler |
| `src/preload/preload.js` | Add | `applyToSource` to electronAPI |
| `src/renderer/js/assistant.js` | Modify | Implement `applyResult()` |

### 6.7 Testing Phase 4

1. Process text from Safari → click Apply → verify text is pasted into Safari
2. Process text from Notes → click Apply → verify text appears in Notes
3. Process text from Mail compose → click Apply → verify text inserted in compose window
4. Test with Accessibility permissions denied → verify clipboard fallback works
5. Test with unknown source app → verify clipboard-only with notification
6. Verify clipboard content is correct after apply
7. Verify the assistant panel hides or stays based on user preference after apply

### 6.8 Known limitations

- Native text insertion requires Accessibility permissions
- Clipboard + paste overwrites the user's clipboard content
- Some apps (e.g., Electron apps) may not respond to simulated keystrokes
- There's a brief visual flash when switching to the source app and back
- Mail.app compose windows may need special handling (AppleScript `set content`)

---

## 7. Phase 5 — Settings & Prompts Expansion

**Goal:** Add settings UI for new quick actions (Fix Grammar, Explain, Make Shorter, Make Longer) and update the system prompt logic to be context-aware beyond just Mail.

**Can be implemented independently:** Partially (UI works standalone, prompt logic needs Phase 2)
**Depends on:** Phase 2 (app categories for prompt context), Phase 3 (new action buttons)
**Estimated scope:** ~100 lines modified

### 7.1 Update `assistant.html` — Settings panel

**File:** `src/renderer/assistant.html`

Add new prompt settings after the existing ones (inside `.settings-content`):

```html
<div style="margin-top: 0.5rem;">
    <label for="prompt-fix-grammar" style="font-size: 0.9rem;">Fix Grammar Prompt:</label>
    <input type="text" id="prompt-fix-grammar" 
           placeholder="Fix grammar, spelling, and punctuation. Keep original meaning and tone:">
</div>

<div style="margin-top: 0.5rem;">
    <label for="prompt-explain" style="font-size: 0.9rem;">Explain Prompt:</label>
    <input type="text" id="prompt-explain" 
           placeholder="Explain this text in simple terms:">
</div>

<div style="margin-top: 0.5rem;">
    <label for="prompt-make-shorter" style="font-size: 0.9rem;">Make Shorter Prompt:</label>
    <input type="text" id="prompt-make-shorter" 
           placeholder="Make this text shorter while keeping key information:">
</div>

<div style="margin-top: 0.5rem;">
    <label for="prompt-make-longer" style="font-size: 0.9rem;">Make Longer Prompt:</label>
    <input type="text" id="prompt-make-longer" 
           placeholder="Expand this text with more detail and explanation:">
</div>
```

### 7.2 Update `assistant.js` — `loadSettings()` and `saveSettings()`

**File:** `src/renderer/js/assistant.js`

Add the new prompt keys to `loadSettings()`:

```javascript
// Add to loadSettings() alongside existing prompt loading:
this.settings.promptFixGrammar = await window.electronAPI.getConfig('prompt-fix-grammar') || '';
this.settings.promptExplain = await window.electronAPI.getConfig('prompt-explain') || '';
this.settings.promptMakeShorter = await window.electronAPI.getConfig('prompt-make-shorter') || '';
this.settings.promptMakeLonger = await window.electronAPI.getConfig('prompt-make-longer') || '';
```

Add to `saveSettings()`:
```javascript
// Add to saveSettings() alongside existing prompt saving:
await window.electronAPI.setConfig('prompt-fix-grammar', document.getElementById('prompt-fix-grammar')?.value || '');
await window.electronAPI.setConfig('prompt-explain', document.getElementById('prompt-explain')?.value || '');
await window.electronAPI.setConfig('prompt-make-shorter', document.getElementById('prompt-make-shorter')?.value || '');
await window.electronAPI.setConfig('prompt-make-longer', document.getElementById('prompt-make-longer')?.value || '');
```

### 7.3 Update `main.js` — Context-aware system prompt

**File:** `src/main/main.js`

Update the system prompt building in the `process-ai` handler (around line 490):

**Current:**
```javascript
if (context && context.type === 'compose') {
  systemPrompt += ' ' + composeAddition;
} else if (context && context.type === 'mailbox') {
  systemPrompt += ' ' + mailboxAddition;
}
```

**New:**
```javascript
if (context) {
  if (context.source === 'mail' && context.type === 'compose') {
    const composeAddition = store.get('prompt-compose', 
      'The user is composing an email. Provide concise, professional assistance.');
    systemPrompt += ' ' + composeAddition;
  } else if (context.source === 'mail') {
    const mailboxAddition = store.get('prompt-mailbox', 
      'The user is working with email threads. Help them understand and respond.');
    systemPrompt += ' ' + mailboxAddition;
  } else if (context.category === 'code') {
    systemPrompt += ' The user is working with code. Be precise and technical.';
  } else if (context.category === 'messaging') {
    systemPrompt += ' The user is working with a chat message. Keep responses conversational.';
  }
  // For browser, editor, unknown — the base system prompt is sufficient
}
```

### 7.4 Files changed in Phase 5

| File | Change Type | What |
|------|-------------|------|
| `src/renderer/assistant.html` | Modify | Add new prompt settings inputs |
| `src/renderer/js/assistant.js` | Modify | Load/save new prompt settings |
| `src/main/main.js` | Modify | Context-aware system prompt building |

### 7.5 Testing Phase 5

1. Open Settings → verify new prompt fields appear (Fix Grammar, Explain, Shorter, Longer)
2. Enter custom prompts → Save → reopen Settings → verify they persist
3. Process text from a code editor → verify system prompt includes code context
4. Process text from messaging app → verify conversational context
5. Process text from Mail → verify existing compose/mailbox prompts still work
6. Use Fix Grammar action → verify correct prompt is used
7. Use Explain action → verify correct prompt is used

---

## 8. Phase 6 — Documentation & Release

**Goal:** Update all documentation to reflect the universal text processing capability. Update ARCHITECTURE.md, README.md, create release notes.

**Can be implemented independently:** Yes (after all other phases are done)
**Depends on:** All previous phases completed
**Estimated scope:** Documentation only

### 8.1 Update `ARCHITECTURE.md`

Key sections to update:
- Section 2 (High-Level Overview): Update description from "email assistance" to "text processing assistance"
- Section 2 diagram: Add "Any App" → text selection path (already partially shown)
- Section 4.1 (Renderer): Document universal context indicator, dynamic quick actions
- Section 4.2 (Main Process): Document `contextDetector.js`, `capture-context` handler
- Section 5 (Data Flow): Add "Universal Text Capture Flow" diagram
- Section 7 (Stability Zones): Update zones for new components
- Section 3 (Repository Structure): Add `contextDetector.js`

### 8.2 Update `README.md`

Key sections to update:
- Title/description: "AI-powered assistant for text processing" (not just email)
- Features section: Add "Universal Text Processing" feature block
- Usage section: Add "Any App" workflow alongside Mail.app workflow
- Quick Actions: Document new actions (Fix Grammar, Explain, Shorter, Longer)
- Keyboard shortcuts: Same (Cmd+Option+L works universally now)
- Roadmap: Mark "Multi-App Support" and "Apply Button" as completed

### 8.3 Create `change_tracker/Release_v2.0.0.md`

Document all changes across phases with:
- Overview of the universal text processing feature
- New files created
- Modified files with line references
- New IPC channels
- New quick actions
- Breaking changes (if any)
- Migration notes

### 8.4 Update `AI.md` or create `AI_UNIVERSAL.md`

Consider adding rules specific to the universal text handling:
- Context object format must be maintained
- New quick actions must follow the action registration pattern
- App categories in `contextDetector.js` should be extended, not replaced
- AppleScript for app activation must follow existing escaping rules

### 8.5 Files changed in Phase 6

| File | Change Type | What |
|------|-------------|------|
| `ARCHITECTURE.md` | Modify | Update for universal architecture |
| `README.md` | Modify | Update features, usage, roadmap |
| `change_tracker/Release_v2.0.0.md` | New file | Release notes |
| `package.json` | Modify | Version bump to 2.0.0 |

---

## 9. Cross-Phase Dependencies

```
Phase 1 (Core Text Capture)
  ↓
Phase 2 (App Context Detection)  ← can start in parallel with Phase 1
  ↓
Phase 3 (UI Refactoring)         ← needs Phase 1 + Phase 2
  ↓
Phase 4 (Apply-Back)             ← needs Phase 1, benefits from Phase 3
  ↓
Phase 5 (Settings & Prompts)     ← needs Phase 2 + Phase 3
  ↓
Phase 6 (Documentation)          ← needs all phases complete
```

### Recommended execution order
1. Phase 1 → Phase 2 (can be one session, they're closely related)
2. Phase 3 (separate session — largest UI change)
3. Phase 4 (separate session — independent feature)
4. Phase 5 (separate session — settings expansion)
5. Phase 6 (separate session — docs only)

### What each context window needs to know

**Phase 1 session:** Read `src/main/main.js`, `src/preload/preload.js`, `native-modules/index.js`, `AI_APPLESCRIPT.md`

**Phase 2 session:** Read `src/main/main.js` (after Phase 1 changes), this plan's Phase 2 section

**Phase 3 session:** Read `src/renderer/assistant.html`, `src/renderer/js/assistant.js`, `src/renderer/css/assistant.css`, `src/preload/preload.js` (after Phase 1), this plan's Phase 3 section

**Phase 4 session:** Read `src/main/main.js` (after Phase 1), `src/renderer/js/assistant.js` (after Phase 3), `src/preload/preload.js`, `native-modules/index.js`, `AI_APPLESCRIPT.md`

**Phase 5 session:** Read `src/renderer/assistant.html` (after Phase 3), `src/renderer/js/assistant.js` (after Phase 3), `src/main/main.js` (after Phase 1)

**Phase 6 session:** Read `ARCHITECTURE.md`, `README.md`, all changed files from previous phases

---

## 10. Testing Strategy

### Per-phase testing (see each phase section)

Each phase includes specific test cases. Run them before moving to the next phase.

### Integration testing (after all phases)

| Test | Steps | Expected |
|------|-------|----------|
| Mail.app full flow | Select email → Cmd+Opt+L → Summarize → Process → Apply | Email summary inserted |
| Safari full flow | Select text → Cmd+Opt+L → Translate → Process → Copy | Translation in clipboard |
| Notes full flow | Select text → Cmd+Opt+L → Improve → Process → Apply | Improved text in Notes |
| VS Code full flow | Select code → Cmd+Opt+L → Explain → Process → Copy | Explanation in clipboard |
| No text flow | No selection → Cmd+Opt+L → type manually → Process | Works with manual input |
| Clipboard flow | Copy text → deselect → Cmd+Opt+L → Summarize | Uses clipboard content |
| Privacy filter | Select text with API key → Cmd+Opt+L → Process | Key filtered before API |
| Settings persist | Change prompts → restart app → verify | Prompts preserved |
| Permissions denied | Revoke Accessibility → test all flows | Fallbacks work |
| Multiple monitors | Test on external display | Panel positions correctly |

### Regression testing

All existing Mail.app functionality must continue to work:
- Mail context detection (compose, viewer, mailbox)
- Window enumeration (multiple Mail windows)
- Draft Reply action
- Email-specific prompts
- Privacy filtering on email content

---

## Appendix: File Change Summary

| File | Phase(s) | Type |
|------|----------|------|
| `src/main/main.js` | 1, 4, 5 | Modify |
| `src/main/contextDetector.js` | 2 | New |
| `src/preload/preload.js` | 1, 4 | Modify |
| `src/renderer/assistant.html` | 3, 5 | Modify |
| `src/renderer/js/assistant.js` | 3, 5 | Modify |
| `src/renderer/css/assistant.css` | 3 | Modify |
| `ARCHITECTURE.md` | 6 | Modify |
| `README.md` | 6 | Modify |
| `package.json` | 6 | Modify |
| `change_tracker/Release_v2.0.0.md` | 6 | New |
