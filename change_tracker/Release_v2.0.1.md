# Release v2.0.1 — Universal Text Processing

**Release Date:** 2026-03-06
**Version:** 2.0.1
**Previous Version:** 1.1.0

## 🎯 Overview

This release transforms the Mail.app-focused LLM Assistant into a universal text processing tool that works with any selected text or clipboard content from any macOS application. Mail.app remains a premium integration with rich context (subject, sender, Draft Reply), while all other apps get a solid generic flow: same hotkey, same panel, same quick actions.

UX principles: one app, one hotkey, one panel — like Spotlight. Apply button works universally. Draft Reply hidden when not in Mail.

---

## ✨ New Features

### 1. Universal Text Capture Engine (Phase 1)

**Problem:** The assistant only worked with Mail.app. Pressing `Cmd+Option+L` from any other app did nothing useful.

**Solution:** New `capture-context` IPC handler orchestrates a multi-step text capture flow:

1. Detect frontmost app (native module or AppleScript fallback)
2. If Mail.app → use existing rich AppleScript flow (compose/viewer/mailbox detection)
3. If any other app → capture selected text (native module or AppleScript Cmd+C trick)
4. If no selection → fall back to clipboard content
5. If nothing → allow manual input

**New unified context object:**
```javascript
{
  source: 'mail' | 'app' | 'clipboard' | 'manual',
  appName: 'Mail' | 'Safari' | 'Notes' | ...,
  appBundleId: 'com.apple.mail' | 'com.apple.Safari' | ...,
  type: 'compose' | 'viewer' | 'mailbox' | 'selection' | 'clipboard' | 'manual',
  text: '...',
  subject: '...',    // Mail-only
  sender: '...',     // Mail-only
  icon: '📧' | '📋' | '📎' | '✏️',
  label: 'Email: Re: Hello' | 'Text from Safari' | 'Clipboard' | ...,
  showDraftReply: true | false,
  capturedAt: Date.now(),
  textLength: 123,
  originalTextLength: 123,
  truncated: false
}
```

**Helper functions added to `src/main/main.js`:**
- `detectFrontmostApp()` — native module with AppleScript fallback
- `captureSelectedText()` — sentinel-based clipboard safety with JS-level save/restore
- `captureMailContext()` — extracted from existing `get-mail-window-context` handler

**Text size cap:** Text exceeding 50,000 characters is truncated with `truncated: true` and `originalTextLength` preserved.

**Files Changed:**
- `src/main/main.js` — Added `detectFrontmostApp()`, `captureSelectedText()`, `captureMailContext()`, `capture-context` IPC handler
- `src/preload/preload.js` — Added `captureContext` to `electronAPI`

---

### 2. Source App Context Detection (Phase 2)

**Problem:** No way to determine if the source was Mail or another app, and no way to provide appropriate UI labels/icons.

**Solution:** New `src/main/contextDetector.js` module with pure functions:

- `isMail(appName)` — strict equality check (`'Mail'` only)
- `getContextIcon(context)` — returns emoji based on source (📧/📋/📎/✏️)
- `getContextLabel(context)` — returns human-readable label (e.g., "Text from Safari", "Composing email")
- `shouldShowDraftReply(context)` — `true` only for `source === 'mail'` with `type === 'viewer'` or `'mailbox'`

Integrated into `capture-context` handler to enrich the context object before returning to renderer.

**Files Changed:**
- `src/main/contextDetector.js` — New file
- `src/main/main.js` — Import and integrate contextDetector

---

### 3. Universal UI (Phase 3)

**Problem:** Renderer was hardcoded for Mail.app: 📧 icon, "Mail Context Detected" label, Mail window selector always visible.

**Solution:** Refactored `assistant.html` and `assistant.js` to use the universal context system:

- Context indicator now shows dynamic icon and label from contextDetector
- Draft Reply button hidden for non-Mail sources, visible for Mail viewer/mailbox
- Summarize, Translate, Improve always visible and work on any text
- Mail window selector hidden (Mail-specific, not needed in universal flow)
- `checkMailContext()` → `loadContext()` (uses `captureContext` IPC)
- `updateMailContext()` → `updateContext()` (uses enriched context object)
- `resetOnShow()` calls `loadContext()` instead of `checkMailContext()`
- Recapture button (🔄) refreshes universal context

**Files Changed:**
- `src/renderer/assistant.html` — Universal context indicator with dynamic IDs, hidden window selector
- `src/renderer/js/assistant.js` — Replaced mail-specific methods with universal ones
- `src/renderer/css/assistant.css` — Added `text-overflow: ellipsis` for context details

---

### 4. Apply-Back Mechanism (Phase 4)

**Problem:** No way to insert AI-generated results back into the source application.

**Solution:** Three-tier fallback approach:

1. **Native text insertion** (best) — Uses accessibility module's `insertTextAtCursor()`. Requires Accessibility permissions.
2. **Clipboard + paste simulation** (fallback) — Saves clipboard, writes result, activates source app, simulates Cmd+V, restores clipboard after 1.5s.
3. **Clipboard only** (safe fallback) — Copies to clipboard and notifies user. Always works.

**Security hardening:**
- `sanitizeAppName()` validates app names with strict regex allowlist before any AppleScript interpolation
- `lastCapturedAppName` module-level variable validates that `apply-to-source` requests match the last captured context
- `isAppRunning()` checks if target app is actually running before activation
- `waitForAppFrontmost()` polls up to 7 times (~2.1s) to verify app came to front before pasting
- Clipboard save/restore in paste fallback path

**UI feedback:** Apply button shows ✓ (native/paste success) or 📋 (clipboard fallback) briefly. Clipboard-only triggers a system notification.

**Files Changed:**
- `src/main/main.js` — Added `sanitizeAppName()`, `isAppRunning()`, `isAppFrontmost()`, `waitForAppFrontmost()`, `activateApp()`, `apply-to-source` IPC handler
- `src/preload/preload.js` — Added `applyToSource` to `electronAPI`
- `src/renderer/js/assistant.js` — Implemented `applyResult()` with feedback handling

---

### 5. System Prompt Gating (Phase 5)

**Problem:** Mail-specific prompt additions (compose/mailbox context) fired based on `context.type` alone, which could match non-mail contexts in the universal flow.

**Solution:**
- Prompt additions now gated by `context.source === 'mail'` (not just `context.type`)
- Default base prompt updated: `"You are a helpful AI assistant for text processing."` (was `"...for email and text processing."`)
- Backward-compatible: legacy callers sending only `context.type` (without `source`) still get Mail prompt additions if type is `compose`/`viewer`/`mailbox`
- Existing user-customized prompts preserved (electron-store keeps custom values)

**Files Changed:**
- `src/main/main.js` — Updated `process-ai` handler prompt composition block

---

## 🔒 Security Improvements

### AppleScript Injection Prevention
- `sanitizeAppName()` rejects app names containing quotes, backslashes, backticks, semicolons, control characters, pipes, dollar signs
- Allowlist regex: `[a-zA-Z0-9 .\-_(),'&+]` — covers valid macOS app names while blocking injection vectors
- Applied to `activateApp()`, `isAppRunning()`, `isAppFrontmost()` before any AppleScript interpolation

### Apply-to-Source Validation
- `lastCapturedAppName` set during `capture-context`, validated in `apply-to-source`
- Mismatched app names fall back to clipboard-only (prevents renderer from requesting activation of arbitrary apps)
- Empty/non-string text input returns clipboard fallback immediately

### Clipboard Safety
- `captureSelectedText()` uses sentinel-based validation to prevent stale clipboard leaks
- JS-level clipboard save/restore via Electron clipboard API (not AppleScript)
- `apply-to-source` paste fallback saves and restores clipboard (best-effort, 1.5s delay)

---

## 🐛 Bug Fixes

### Fixed potential runtime error in capture-context when no text exists
- `context.text.length` was unconditional; added defensive guard: `const safeText = context.text || ''`
- **File:** `src/main/main.js` — `capture-context` IPC handler

### Context preview always appended `...` even for short text
- `updateContext` now only appends ellipsis when text exceeds 60 characters
- **File:** `src/renderer/js/assistant.js` — `updateContext()` method

### Mail prompt enrichment for legacy callers
- Legacy callers sending only `context.type` (without `source`) silently lost Mail-specific prompt enrichment
- Added backward-compatible condition: `source === 'mail' || (!source && type in ['compose','viewer','mailbox'])`
- **File:** `src/main/main.js` — `process-ai` handler

### Apply-to-source catch block returned success: true on failure
- Catch block now returns `success: false` with `fallback: true` so renderer shows appropriate feedback
- **File:** `src/main/main.js` — `apply-to-source` handler

---

## 🧪 Test Coverage

**100 tests passing across 3 test suites:**

| Suite | Tests | Coverage |
|-------|-------|----------|
| `contextDetector.test.js` | 30 | `isMail`, `getContextIcon`, `getContextLabel`, `shouldShowDraftReply` — all pure functions |
| `modelManager.test.js` | 36 | Config loading, merging, CRUD, query methods |
| `mainHandlers.test.js` | 34 | `sanitizeAppName` (16 cases), `capture-context` textLength safety (6 cases), `process-ai` prompt composition (10 cases), backward compat |

**Not yet testable (requires main.js extraction — see TEST_PLAN.md Section 8):**
- `capture-context` full orchestration
- `apply-to-source` three-tier fallback
- `captureSelectedText()` sentinel logic
- `captureMailContext()` AppleScript parsing
- Renderer UI behavior (requires jsdom or Electron test harness)

---

## 📦 Files Changed

### New Files
| File | Purpose |
|------|---------|
| `src/main/contextDetector.js` | Mail vs generic detection, icon/label/Draft Reply helpers |
| `tests/unit/mainHandlers.test.js` | Unit tests for main.js handler logic |

### Modified Files
| File | Changes |
|------|---------|
| `src/main/main.js` | `detectFrontmostApp()`, `captureSelectedText()`, `captureMailContext()`, `sanitizeAppName()`, `isAppRunning()`, `isAppFrontmost()`, `waitForAppFrontmost()`, `activateApp()`, `capture-context` handler, `apply-to-source` handler, prompt gating update, `lastCapturedAppName` variable |
| `src/preload/preload.js` | Added `captureContext`, `applyToSource` to `electronAPI` |
| `src/renderer/assistant.html` | Universal context indicator (dynamic IDs), hidden Mail window selector |
| `src/renderer/js/assistant.js` | `loadContext()`, `updateContext()`, `hideContextIndicator()`, `updateQuickActions()`, `handleQuickAction()`, `processRequest()`, `applyResult()`, `resetOnShow()` — all refactored for universal context |
| `src/renderer/css/assistant.css` | `text-overflow: ellipsis` for context details |

---

## ♻️ Backward Compatibility

No breaking changes. All existing functionality preserved:

- `get-mail-context` IPC handler still works (unchanged)
- `get-all-mail-windows` IPC handler still works (unchanged)
- `get-mail-window-context` IPC handler delegates to `captureMailContext()` (same return format)
- Legacy callers sending `context.type` without `source` still get Mail prompt additions
- Mail.app full flow unchanged: compose/viewer/mailbox detection, Draft Reply, email-specific prompts
- Existing user settings (custom prompts, API key, model selection) preserved
- Privacy filtering unchanged

---

## ⚠️ Known Limitations

- Native text insertion requires macOS Accessibility permissions
- Clipboard + paste fallback overwrites user clipboard (restored after 1.5s best-effort)
- Some apps may not respond to simulated Cmd+V keystrokes
- Brief visual flash when switching to source app for apply-back
- AppleScript `|||SEP|||` delimiter collision in email content corrupts parsing (pre-existing)
- Fixed polling delays in `waitForAppFrontmost` (~2.1s max) — no event-driven alternative available via AppleScript

---

## 📚 Implementation Reference

Full implementation plan: `Docs/UNIVERSAL_TEXT_IMPLEMENTATION_PLAN.md`
Test specification: `Docs/TEST_PLAN.md`
Previous session context: `Docs/chats/`
