# Universal Text Processing — Implementation Plan

**Version:** 2.0.1 (target)
**Previous Version:** 1.1.0
**Goal:** Transform the Mail.app-focused LLM Assistant into a universal text processing tool that works with any selected text or clipboard content from any macOS application, while preserving Mail.app as a premium integration.

**UX Principles (agreed):**
- One app, one hotkey, one panel — like Spotlight
- Mail.app = premium integration (rich context, Draft Reply)
- Everything else = solid generic flow (same actions, same UI)
- Restraint: no per-app deep integrations beyond Mail unless clear need
- Apply button works universally — paste result back into any source app
- Keep existing 4 quick actions; only hide Draft Reply when not Mail

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Target Architecture](#2-target-architecture)
3. [Phase 1 — Core Text Capture Engine](#3-phase-1--core-text-capture-engine)
4. [Phase 2 — Source App Context Detection](#4-phase-2--source-app-context-detection)
5. [Phase 3 — UI Refactoring](#5-phase-3--ui-refactoring)
6. [Phase 4 — Apply-Back Mechanism](#6-phase-4--apply-back-mechanism)
7. [Phase 5 — Prompts & Settings Update](#7-phase-5--prompts--settings-update)
8. [Phase 6 — Documentation & Release](#8-phase-6--documentation--release)
9. [Future Feature Phases](#9-future-feature-phases)
10. [Cross-Phase Dependencies](#10-cross-phase-dependencies)
11. [Testing Strategy](#11-testing-strategy)

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
- Configurable prompts for quick actions (stored in electron-store, editable in Settings UI)

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
- Action prompts: Summarize, Translate, Improve — already generic, work on any text

### What is Mail.app-specific (needs refactoring)
- `checkMailContext()` in assistant.js — called on every panel show
- `loadCurrentSelection()` — calls `getMailWindowContext` directly
- `updateMailContext()` — only handles compose/viewer/mailbox types
- Context indicator UI — hardcoded 📧 icon and "Mail Context Detected"
- Quick actions — "Draft Reply" only enabled for mail contexts
- `handleQuickAction()` — prompt generation assumes email content
- `resetOnShow()` — only refreshes mail context
- `toggleAssistant()` in main.js — no text capture on show
- System prompt additions — only compose/mailbox context types, checked via `context.type` alone

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
    → Step 4: Show panel, renderer fetches context via IPC
    → Step 5: Renderer displays context-aware UI
```

### Context object (new unified format)
```javascript
{
  source: 'mail' | 'app' | 'clipboard' | 'manual',
  appName: 'Mail' | 'Safari' | 'Notes' | ...,
  appBundleId: 'com.apple.mail' | 'com.apple.Safari' | ...,
  type: 'compose' | 'viewer' | 'mailbox' | 'selection' | 'clipboard' | 'manual',
  text: '...',
  // Mail-specific fields (only when source === 'mail')
  subject: '...',
  sender: '...',
  // Metadata
  capturedAt: Date.now(),
  textLength: 123
}
```

### Quick actions (v2.0.1 — minimal change)
```
Keep existing 4 buttons exactly as they are:
  📝 Summarize    — always visible, works on any text
  🌐 Translate    — always visible, works on any text
  ✨ Improve      — always visible, works on any text
  ↩️ Draft Reply  — visible only when source === 'mail', hidden otherwise
```

### Prompt system (v2.0.1 — minimal change)
```
Existing prompts in Settings UI stay exactly as they are.
No new settings fields needed.

Changes:
1. Base system prompt default updated: "You are a helpful AI assistant for text processing."
   (was: "...for email and text processing.")
2. Compose/Mailbox context additions only fire when source === 'mail'
   (was: checked via context.type alone, which could match non-mail contexts)
3. Non-mail sources: base system prompt only, no additions
```

---

## 3. Phase 1 — Core Text Capture Engine ✅ DONE

**Status:** Implemented and reviewed. Sentinel-based clipboard safety, JS-level restore guarantee.

**Goal:** Add a universal text capture mechanism in the main process that runs when the renderer requests context. This is the foundation everything else builds on.

**Can be implemented independently:** Yes
**Depends on:** Nothing
**Estimated scope:** ~150 lines new/modified code

### 3.1 New IPC handler: `capture-context`

**File:** `src/main/main.js`
**Location:** Add after the existing `get-selected-text` handler (around line 600)

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

    // Step 2: Route based on app — Mail gets rich integration, everything else is generic
    if (frontApp.name === 'Mail') {
      const mailContext = await captureMailContext();
      if (mailContext && mailContext.type !== 'error') {
        context.source = 'mail';
        context.type = mailContext.type;
        context.text = mailContext.content || '';
        context.subject = mailContext.subject || null;
        context.sender = mailContext.sender || null;
      }
    }

    // Step 3: If no text yet (non-Mail app, or Mail had no content), try generic selection
    if (!context.text) {
      const selectedText = await captureSelectedText();
      if (selectedText) {
        context.source = context.appName === 'Mail' ? 'mail' : 'app';
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
        set oldClipboard to the clipboard
        keystroke "c" using command down
        delay 0.1
        set selectedText to the clipboard
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

Extracted from the existing `get-mail-window-context` IPC handler into a reusable function:

```javascript
async function captureMailContext() {
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

```javascript
// Universal context capture
captureContext: () => ipcRenderer.invoke('capture-context'),
```

### 3.6 Refactor existing `get-mail-window-context` handler

**File:** `src/main/main.js`

Refactor the existing handler to use the new `captureMailContext()` function (avoid code duplication):

```javascript
ipcMain.handle('get-mail-window-context', async (event, windowIndex, windowTitle) => {
  return await captureMailContext();
});
```

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

## 4. Phase 2 — Source App Context Detection ✅ DONE

**Status:** Implemented and reviewed. Simplified to Mail vs generic with `isMail()` consistency.

**Goal:** Simple helper to determine if the source is Mail or not, and provide appropriate icon/label for the UI. No per-app categories — just Mail vs generic.

**Can be implemented independently:** Yes (but Phase 1 should be done first)
**Depends on:** Phase 1 (uses context object)
**Estimated scope:** ~30 lines new code

### 4.1 New module: `src/main/contextDetector.js`

Minimal module — just Mail detection and UI label/icon helpers:

```javascript
/**
 * Context Detector — determines if source is Mail (premium) or generic.
 * Provides icon and label for the UI context indicator.
 */

function isMail(appName) {
  return appName === 'Mail';
}

function getContextIcon(context) {
  if (context.source === 'mail') return '📧';
  if (context.source === 'clipboard') return '📎';
  if (context.source === 'manual') return '✏️';
  return '📋';  // generic app selection
}

function getContextLabel(context) {
  if (context.source === 'mail') {
    if (context.type === 'compose') return 'Composing email';
    if (context.type === 'viewer') {
      return `Email: ${(context.subject || '').substring(0, 40)}`;
    }
    return 'Mail';
  }
  if (context.source === 'clipboard') return 'Clipboard';
  if (context.source === 'manual') return 'Manual input';
  return `Text from ${context.appName || 'Unknown app'}`;
}

function shouldShowDraftReply(context) {
  return context.source === 'mail' && 
    (context.type === 'viewer' || context.type === 'mailbox');
}

module.exports = {
  isMail,
  getContextIcon,
  getContextLabel,
  shouldShowDraftReply
};
```

### 4.2 Integrate with `capture-context` handler

**File:** `src/main/main.js`

Add to the `capture-context` IPC handler (from Phase 1), before return:

```javascript
const { getContextIcon, getContextLabel, shouldShowDraftReply } = require('./contextDetector');

// ... inside capture-context handler, before return:
context.icon = getContextIcon(context);
context.label = getContextLabel(context);
context.showDraftReply = shouldShowDraftReply(context);
```

### 4.3 Files changed in Phase 2

| File | Change Type | What |
|------|-------------|------|
| `src/main/contextDetector.js` | New file | Simple Mail vs generic detection |
| `src/main/main.js` | Modify | Import contextDetector, enrich capture-context response |

### 4.4 Testing Phase 2

1. Trigger from Mail.app → verify `icon: '📧'`, `showDraftReply: true`
2. Trigger from Safari → verify `icon: '📋'`, `label: 'Text from Safari'`, `showDraftReply: false`
3. Trigger from any non-Mail app → verify `icon: '📋'`, `showDraftReply: false`
4. Clipboard fallback → verify `icon: '📎'`, `label: 'Clipboard'`
5. No text → verify `icon: '✏️'`, `label: 'Manual input'`

---

## 5. Phase 3 — UI Refactoring ✅ DONE

**Status:** Implemented and reviewed. Universal context indicator, Draft Reply visibility gating, loadContext/updateContext replacing Mail-only methods.

**Goal:** Update the renderer (HTML + JS) to use the new universal context system. Replace the Mail-only context indicator with a universal one. Keep existing 4 quick action buttons, only hide Draft Reply when not Mail.

**Can be implemented independently:** No
**Depends on:** Phase 1 (capture-context IPC), Phase 2 (context enrichment)
**Estimated scope:** ~150 lines modified across HTML, JS, CSS

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

### 5.2 Update `assistant.html` — Quick actions stay the same

**No changes to the quick action buttons HTML.** Keep the existing 4 buttons exactly as they are. The Draft Reply button visibility will be controlled by JS only.

### 5.3 Update `assistant.html` — Hide Mail window selector

**File:** `src/renderer/assistant.html`

Add `style="display:none"` to the window selector block (lines ~95-105). It's Mail-specific and not needed in the universal flow. Can be re-enabled later if needed.

### 5.4 Update `assistant.js` — Replace `checkMailContext()` with `loadContext()`

**File:** `src/renderer/js/assistant.js`

Replace the `checkMailContext()` method:

```javascript
async loadContext() {
  try {
    if (!window.electronAPI || !window.electronAPI.captureContext) {
      // Fallback: try legacy mail context for backward compat
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

  if (iconEl) iconEl.textContent = context.icon || '📋';
  if (titleEl) titleEl.textContent = context.label || 'Text Captured';
  if (detailsEl) {
    const preview = context.text ? context.text.substring(0, 60).trim() + '...' : '';
    detailsEl.textContent = preview;
  }

  if (this.contextIndicator) {
    this.contextIndicator.classList.remove('hidden');
  }

  // Show/hide Draft Reply based on context
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

Simplified — only controls Draft Reply visibility:

```javascript
updateQuickActions(context) {
  const hasText = context.text && context.text.trim().length > 0;

  this.actionButtons.forEach(btn => {
    const action = btn.dataset.action;

    if (action === 'reply') {
      // Draft Reply: only visible for Mail contexts
      btn.style.display = context.showDraftReply ? '' : 'none';
    }

    // Enable/disable based on whether text is available
    btn.disabled = !hasText;
    btn.style.opacity = hasText ? '1' : '0.5';
  });
}
```

### 5.7 Update `assistant.js` — Modify `handleQuickAction()`

**File:** `src/renderer/js/assistant.js`

Update to use universal context. Same 4 actions, just smarter about where text comes from:

```javascript
async handleQuickAction(action) {
  if (this.isProcessing) return;

  let prompt = '';
  let textToProcess = '';

  try {
    // Get text from current context (universal)
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
      case 'reply':
        if (this.currentContext?.source === 'mail') {
          prompt = 'Based on this email, help me draft a professional reply:';
          textToProcess = this.currentContext.text || '';
        } else {
          prompt = this.settings.promptReply || 
            'Help me draft a professional email reply to this:';
        }
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

```javascript
resetOnShow() {
  this.clearAll();
  this.hideContextIndicator();
  this.loadContext();  // ← Universal context capture instead of checkMailContext()
  this.storedText = null;
  if (this.resultsContent) {
    this.resultsContent.innerHTML = '';
  }
  console.log('Assistant state reset on window show');
}
```

### 5.9 Update `assistant.js` — Modify `processRequest()`

**File:** `src/renderer/js/assistant.js`

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

Replace `this.checkMailContext()` with `this.loadContext()`.

### 5.11 Update `assistant.js` — Modify `initializeElements()` and `bindEvents()`

Update element references for renamed IDs:
- `refresh-selection-btn` → `refresh-context-btn`
- Add `context-icon`, `context-title`, `context-details` by ID

Update refresh button binding to call `this.loadContext()`.

### 5.12 Files changed in Phase 3

| File | Change Type | What |
|------|-------------|------|
| `src/renderer/assistant.html` | Modify | Universal context indicator, hide mail window selector |
| `src/renderer/js/assistant.js` | Modify | Replace mail-specific methods with universal ones |
| `src/renderer/css/assistant.css` | Modify | Minor: text-overflow for context details |

### 5.13 Testing Phase 3

1. Trigger from Mail.app → verify 📧 icon, "Email: [subject]" label, Draft Reply visible
2. Trigger from Safari with text selected → verify 📋 icon, "Text from Safari", Draft Reply hidden
3. Trigger from any non-Mail app → verify 📋 icon, Draft Reply hidden, other 3 actions visible
4. Trigger with clipboard only → verify 📎 icon, "Clipboard" label
5. Trigger with no text → verify context indicator hidden, actions disabled
6. Click "Recapture text" button → verify context refreshes
7. Quick actions: test Summarize, Translate, Improve with generic text
8. Verify edit-before-process workflow still works
9. Verify Process button works end-to-end with universal context

---

## 6. Phase 4 — Apply-Back Mechanism ✅ DONE

**Status:** Implemented and reviewed. Three-tier fallback (native/paste/clipboard), sanitizeAppName for injection prevention, waitForAppFrontmost polling, isAppRunning validation.

**Goal:** Implement the "Apply" button to insert AI-generated results back into the source application. Universal — works with any app, not just Mail.

**Can be implemented independently:** Partially (needs Phase 1 for source app tracking)
**Depends on:** Phase 1 (context object with appName), Phase 3 (universal context in renderer)
**Estimated scope:** ~120 lines new/modified code

### 6.1 Strategy

Three-tier approach:

1. **Native text insertion** (best) — Use accessibility module's `insertTextAtCursor()`. Requires Accessibility permissions.
2. **Clipboard + paste simulation** (fallback) — Write to clipboard, switch to source app, simulate Cmd+V.
3. **Clipboard only** (safe fallback) — Copy to clipboard and notify user. Always works.

### 6.2 New IPC handler: `apply-to-source`

**File:** `src/main/main.js`

```javascript
ipcMain.handle('apply-to-source', async (event, text, sourceAppName) => {
  try {
    // Step 1: Try native text insertion
    if (nativeModulesReady && nativeModules.accessibility) {
      await activateApp(sourceAppName);
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
    clipboard.writeText(text);
    return { success: true, method: 'clipboard', error: error.message };
  }
});
```

### 6.3 Helper function: `activateApp()`

**File:** `src/main/main.js`

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

Replace the placeholder:

```javascript
async applyResult() {
  try {
    if (!this.resultsContent || !window.electronAPI) return;

    const text = this.resultsContent.textContent;
    if (!text) return;

    const sourceApp = this.currentContext?.appName || null;
    const result = await window.electronAPI.applyToSource(text, sourceApp);

    // Show feedback
    if (this.applyResultBtn) {
      let feedback = result.method === 'clipboard' ? '📋' : '✓';
      const originalText = this.applyResultBtn.textContent;
      this.applyResultBtn.textContent = feedback;
      setTimeout(() => {
        this.applyResultBtn.textContent = originalText;
      }, 1500);
    }

    // Clipboard-only: notify user
    if (result.method === 'clipboard' && window.systemAPI) {
      await window.systemAPI.showNotification(
        'Copied to Clipboard',
        'Result copied. Paste with Cmd+V.'
      );
    }
  } catch (error) {
    console.error('Failed to apply result:', error);
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

1. Process text from Safari → click Apply → verify text pasted into Safari
2. Process text from Notes → click Apply → verify text appears in Notes
3. Process text from Mail compose → click Apply → verify text inserted
4. Accessibility permissions denied → verify clipboard fallback with notification
5. Unknown source app → verify clipboard-only with notification
6. Verify clipboard content is correct after apply

### 6.8 Known limitations

- Native text insertion requires Accessibility permissions
- Clipboard + paste overwrites user's clipboard
- Some Electron apps may not respond to simulated keystrokes
- Brief visual flash when switching to source app
- Mail.app compose may need special AppleScript handling (future improvement)

---

## 7. Phase 5 — Prompts & Settings Update ✅ DONE

**Status:** Implemented and reviewed. System prompt gated by context.source === 'mail', default updated to "text processing".

**Goal:** Update the system prompt logic so Mail-specific prompt additions only fire for Mail contexts. Update the base system prompt default. No new settings fields — existing Settings UI stays exactly as it is.

**Can be implemented independently:** Partially (prompt logic needs Phase 1 context object)
**Depends on:** Phase 1 (context object with `source` field)
**Estimated scope:** ~15 lines modified

### 7.1 Current prompt system (no changes to Settings UI)

The Settings UI already has these configurable prompts (stored in electron-store):
- **System Prompt (Base):** Base personality for all requests
- **Compose Context Addition:** Appended when composing email
- **Mailbox Context Addition:** Appended when viewing email threads
- **Summarize Prompt:** Template for summarize action
- **Translate Prompt:** Template for translate action
- **Improve Prompt:** Template for improve action
- **Reply Prompt:** Template for reply action

All action prompts (Summarize, Translate, Improve) are already generic and work on any text. No changes needed to the Settings UI or to how action prompts are stored/loaded.

### 7.2 Update `main.js` — System prompt building

**File:** `src/main/main.js`
**Location:** `process-ai` handler, system prompt section (around line 480)

**Current code:**
```javascript
let systemPrompt = store.get('prompt-system', 'You are a helpful AI assistant for email and text processing.');

if (context && context.type === 'compose') {
  const composeAddition = store.get('prompt-compose', 'The user is composing an email. Provide concise, professional assistance.');
  systemPrompt += ' ' + composeAddition;
} else if (context && context.type === 'mailbox') {
  const mailboxAddition = store.get('prompt-mailbox', 'The user is working with email threads. Help them understand and respond to conversations.');
  systemPrompt += ' ' + mailboxAddition;
}
```

**New code:**
```javascript
let systemPrompt = store.get('prompt-system', 'You are a helpful AI assistant for text processing.');

// Mail-specific prompt additions — only when source is explicitly Mail
if (context && context.source === 'mail') {
  if (context.type === 'compose') {
    const composeAddition = store.get('prompt-compose', 'The user is composing an email. Provide concise, professional assistance.');
    systemPrompt += ' ' + composeAddition;
  } else if (context.type === 'viewer' || context.type === 'mailbox') {
    const mailboxAddition = store.get('prompt-mailbox', 'The user is working with email threads. Help them understand and respond to conversations.');
    systemPrompt += ' ' + mailboxAddition;
  }
}
// Non-mail sources: base system prompt is sufficient, no additions needed
```

**Key changes:**
1. Default base prompt: `"...for text processing."` instead of `"...for email and text processing."`
2. Compose/Mailbox additions gated by `context.source === 'mail'` (not just `context.type`)
3. Non-mail contexts use the base prompt only — it's already generic enough

### 7.3 Note on existing user settings

Users who have already customized their base system prompt will keep their custom value (electron-store preserves it). The new default only applies to fresh installs or if the user resets settings. This is the correct behavior — we don't overwrite user customizations.

### 7.4 Files changed in Phase 5

| File | Change Type | What |
|------|-------------|------|
| `src/main/main.js` | Modify | System prompt gating by `context.source`, updated default |

### 7.5 Testing Phase 5

1. Process text from Mail compose → verify compose addition is appended to system prompt
2. Process text from Mail viewer → verify mailbox addition is appended
3. Process text from Safari → verify only base system prompt, no additions
4. Process text from clipboard → verify only base system prompt
5. Fresh install: verify new default "text processing" (not "email and text processing")
6. Existing install with custom base prompt: verify custom prompt preserved

---

## 8. Phase 6 — Documentation & Release

**Goal:** Update all documentation to reflect universal text processing. Create release notes.

**Can be implemented independently:** Yes (after all other phases)
**Depends on:** All previous phases completed
**Estimated scope:** Documentation only

### 8.1 Update `ARCHITECTURE.md`

- Section 2: Update description from "email assistance" to "text processing assistance"
- Section 2 diagram: Already shows "Any App" path — verify accuracy
- Section 3: Add `src/main/contextDetector.js` to repo structure
- Section 4.1: Document universal context indicator, Draft Reply visibility logic
- Section 4.2: Document `capture-context` handler, `captureMailContext()`, `detectFrontmostApp()`
- Section 5: Add "Universal Text Capture Flow" diagram
- Section 7: Add stability zones for new components

### 8.2 Update `README.md`

- Title/description: "AI-powered assistant for text processing" (not just email)
- Features: Add "Universal Text Processing" section
- Usage: Add "Any App" workflow alongside Mail.app workflow
- Roadmap: Mark "Multi-App Support" and "Apply Button" as completed
- Version badge: 2.0.1

### 8.3 Create `change_tracker/Release_v2.0.1.md`

Document:
- Universal text capture from any app
- Apply-back mechanism
- Simplified context detection (Mail vs generic)
- Updated system prompt defaults
- New files: `contextDetector.js`
- Modified files with descriptions
- No breaking changes (Mail.app flow preserved)

### 8.4 Files changed in Phase 6

| File | Change Type | What |
|------|-------------|------|
| `ARCHITECTURE.md` | Modify | Update for universal architecture |
| `README.md` | Modify | Update features, usage, roadmap |
| `change_tracker/Release_v2.0.1.md` | New file | Release notes |
| `package.json` | Modify | Version bump to 2.0.1 |

---

## 9. Future Feature Phases

These features were discussed during planning but deferred from v2.0.1 to keep the initial release minimal and focused. They can be implemented in future versions when there's a clear need.

### 9.1 Contextual Quick Actions (v2.1+)

**Concept:** Show/hide additional quick action buttons based on the source app category.

Potential actions:
- **Fix Grammar** — universal, could replace or complement Improve
- **Explain** — useful for code and technical text
- **Make Shorter / Make Longer** — useful for documents
- **Explain Code** — specific to code editors

**Why deferred:** The "Improve" button already covers grammar fixes. Adding more buttons risks cluttering the panel. Wait for user feedback on what's actually needed.

**Implementation notes:**
- Add buttons to HTML with `class="contextual-action"` and `style="display:none"`
- Expand `contextDetector.js` with app categories if needed
- Add corresponding prompts to Settings UI
- Follow the same pattern as Draft Reply visibility

### 9.2 Per-Category System Prompts (v2.1+)

**Concept:** Adjust the AI's system prompt based on the source app category (code editor → technical tone, messaging → conversational tone).

**Why deferred:** The base system prompt is generic enough for all contexts. Per-category prompts add complexity without proven benefit. Wait for user feedback.

**Implementation notes:**
- Add new configurable prompt fields to Settings UI (e.g., "Code Context Addition")
- Store in electron-store alongside existing prompts
- Gate in `process-ai` handler by `context.category`
- Requires expanding `contextDetector.js` with full app categorization

### 9.3 Full App Categorization System (v2.1+)

**Concept:** Expand `contextDetector.js` from simple Mail/generic detection to full categories: email, browser, editor, code, messaging.

**Why deferred:** v2.0.1 only needs to know "is it Mail or not?" Full categorization is infrastructure for features that don't exist yet (contextual actions, per-category prompts).

**Implementation notes:**
- Add `APP_CATEGORIES` object with app names, bundle IDs, icons, labels
- Add `categorizeApp(appName, bundleId)` function
- Return category info in `capture-context` response
- UI can use category for icon differentiation (💻 for code, 💬 for messaging, etc.)

### 9.4 Deep App Integrations (v2.2+)

**Concept:** Rich integrations with specific apps beyond Mail (e.g., Safari reading mode, Notes structured content, Slack thread context).

**Why deferred:** Contradicts the restraint principle. Each deep integration adds maintenance burden and AppleScript fragility. Only build when there's clear user demand for a specific app.

### 9.5 Conversation History (v2.x)

**Concept:** Save and retrieve previous AI interactions for reference.

**Why deferred:** Already on the roadmap as a separate feature. Not related to universal text processing.

---

## 10. Cross-Phase Dependencies

```
Phase 1 (Core Text Capture)
  ↓
Phase 2 (Context Detection)     ← can be done in same session as Phase 1
  ↓
Phase 3 (UI Refactoring)        ← needs Phase 1 + Phase 2
  ↓
Phase 4 (Apply-Back)            ← needs Phase 1, benefits from Phase 3
  ↓
Phase 5 (Prompts Update)        ← needs Phase 1 (context.source field)
  ↓
Phase 6 (Documentation)         ← needs all phases complete
```

### Recommended execution order
1. **Session 1:** Phase 1 + Phase 2 (closely related, ~180 lines total)
2. **Session 2:** Phase 3 (largest UI change, ~150 lines)
3. **Session 3:** Phase 4 (independent feature, ~120 lines)
4. **Session 4:** Phase 5 (minimal, ~15 lines — can combine with Phase 4)
5. **Session 5:** Phase 6 (docs only)

### What each context window needs to read

**Session 1 (Phase 1+2):**
- This plan: Phase 1 + Phase 2 sections
- `src/main/main.js` — full file
- `src/preload/preload.js` — full file
- `native-modules/index.js` — understand available native APIs
- `AI_APPLESCRIPT.md` — AppleScript rules (variable naming, error handling)

**Session 2 (Phase 3):**
- This plan: Phase 3 section
- `src/renderer/assistant.html` — full file
- `src/renderer/js/assistant.js` — full file
- `src/renderer/css/assistant.css` — full file
- `src/preload/preload.js` — verify `captureContext` exists (from Phase 1)

**Session 3 (Phase 4):**
- This plan: Phase 4 section
- `src/main/main.js` — after Phase 1+2 changes
- `src/renderer/js/assistant.js` — after Phase 3 changes (applyResult method)
- `src/preload/preload.js` — after Phase 1 changes
- `native-modules/index.js` — accessibility module APIs
- `AI_APPLESCRIPT.md` — AppleScript rules for app activation

**Session 4 (Phase 5):**
- This plan: Phase 5 section
- `src/main/main.js` — process-ai handler section only

**Session 5 (Phase 6):**
- This plan: Phase 6 section
- `ARCHITECTURE.md`, `README.md` — full files
- All changed files from previous phases (for accurate release notes)

---

## 11. Testing Strategy

### Per-phase testing

See each phase section for specific test cases. Run them before moving to the next phase.

### Integration testing (after all phases)

| Test | Steps | Expected |
|------|-------|----------|
| Mail.app full flow | Select email → Cmd+Opt+L → Summarize → Process → Apply | Summary inserted into Mail |
| Safari full flow | Select text → Cmd+Opt+L → Translate → Process → Apply | Translation pasted into Safari |
| Notes full flow | Select text → Cmd+Opt+L → Improve → Process → Apply | Improved text in Notes |
| No text flow | No selection → Cmd+Opt+L → type manually → Process | Works with manual input |
| Clipboard flow | Copy text → deselect → Cmd+Opt+L → Summarize | Uses clipboard content |
| Draft Reply visibility | Trigger from Mail → Reply visible; from Safari → Reply hidden | Correct visibility |
| Privacy filter | Select text with API key → Cmd+Opt+L → Process | Key filtered before API |
| Settings persist | Change prompts → restart app → verify | Prompts preserved |
| Permissions denied | Revoke Accessibility → test all flows | Fallbacks work |
| Multiple monitors | Test on external display | Panel positions correctly |

### Regression testing

All existing Mail.app functionality must continue to work:
- Mail context detection (compose, viewer, mailbox)
- Window enumeration (existing `get-all-mail-windows` handler)
- Draft Reply action with email context
- Email-specific prompts (compose/mailbox additions)
- Privacy filtering on email content
- Existing `get-mail-context` and `get-mail-window-context` IPC handlers (backward compat)

---

## Appendix: File Change Summary

| File | Phase(s) | Type |
|------|----------|------|
| `src/main/main.js` | 1, 2, 4, 5 | Modify |
| `src/main/contextDetector.js` | 2 | New |
| `src/preload/preload.js` | 1, 4 | Modify |
| `src/renderer/assistant.html` | 3 | Modify |
| `src/renderer/js/assistant.js` | 3, 4 | Modify |
| `src/renderer/css/assistant.css` | 3 | Modify (minor) |
| `ARCHITECTURE.md` | 6 | Modify |
| `README.md` | 6 | Modify |
| `package.json` | 6 | Modify |
| `change_tracker/Release_v2.0.1.md` | 6 | New |
