# Test Plan — Universal Text Processing (v2.0.1)

Collected from code reviews and implementation phases. No test infrastructure exists yet.
When tests are implemented, use this as the specification.

---

## 1. Unit Tests: `src/main/contextDetector.js` ✅ IMPLEMENTED

Pure functions, no mocking needed. All tests passing (66 total across contextDetector + modelManager).

### `isMail(appName)`
| Input | Expected |
|-------|----------|
| `'Mail'` | `true` |
| `'Safari'` | `false` |
| `'mail'` (lowercase) | `false` |
| `null` | `false` |
| `undefined` | `false` |
| `''` | `false` |

### `getContextIcon(context)`
| `context.source` | Expected |
|-------------------|----------|
| `'mail'` | `'📧'` |
| `'clipboard'` | `'📎'` |
| `'manual'` | `'✏️'` |
| `'app'` | `'📋'` |
| any other value | `'📋'` |

### `getContextLabel(context)`
| `context` | Expected |
|-----------|----------|
| `{ source: 'mail', type: 'compose' }` | `'Composing email'` |
| `{ source: 'mail', type: 'viewer', subject: 'Hello World' }` | `'Email: Hello World'` |
| `{ source: 'mail', type: 'viewer', subject: null }` | `'Email: '` |
| `{ source: 'mail', type: 'viewer', subject: 'A'.repeat(50) }` | Truncated to 40 chars |
| `{ source: 'mail', type: 'mailbox' }` | `'Mail'` |
| `{ source: 'clipboard' }` | `'Clipboard'` |
| `{ source: 'manual' }` | `'Manual input'` |
| `{ source: 'app', appName: 'Safari' }` | `'Text from Safari'` |
| `{ source: 'app', appName: null }` | `'Text from Unknown app'` |

### `shouldShowDraftReply(context)`
| `context` | Expected |
|-----------|----------|
| `{ source: 'mail', type: 'viewer' }` | `true` |
| `{ source: 'mail', type: 'mailbox' }` | `true` |
| `{ source: 'mail', type: 'compose' }` | `false` |
| `{ source: 'app', type: 'selection' }` | `false` |
| `{ source: 'clipboard', type: 'clipboard' }` | `false` |

---

## 2. Integration Tests: `capture-context` IPC Handler

Requires mocking: native modules, AppleScript execution, clipboard.

### Mail.app paths
| Scenario | Mock setup | Expected context |
|----------|-----------|-----------------|
| Mail compose window | `detectFrontmostApp` → `{ name: 'Mail' }`, `captureMailContext` → `{ type: 'compose', subject: 'Test', content: 'Draft...' }` | `source: 'mail', type: 'compose', text: 'Draft...'` |
| Mail viewer with email | `detectFrontmostApp` → `{ name: 'Mail' }`, `captureMailContext` → `{ type: 'viewer', subject: 'Re: Hello', content: 'Body...', sender: 'a@b.com' }` | `source: 'mail', type: 'viewer', sender: 'a@b.com'` |
| Mail mailbox (no email selected) | `detectFrontmostApp` → `{ name: 'Mail' }`, `captureMailContext` → `{ type: 'mailbox' }` | Falls through to selection/clipboard |

### Non-Mail selection path
| Scenario | Mock setup | Expected context |
|----------|-----------|-----------------|
| Safari with text selected | `detectFrontmostApp` → `{ name: 'Safari' }`, `captureSelectedText` → `'Selected text'` | `source: 'app', type: 'selection', appName: 'Safari'` |
| Notes with text selected | `detectFrontmostApp` → `{ name: 'Notes' }`, `captureSelectedText` → `'Note content'` | `source: 'app', type: 'selection', appName: 'Notes'` |

### Clipboard fallback path
| Scenario | Mock setup | Expected context |
|----------|-----------|-----------------|
| No selection, clipboard has text | `captureSelectedText` → `null`, `clipboard.readText` → `'Clipboard text'` | `source: 'clipboard', type: 'clipboard'` |
| No selection, empty clipboard | `captureSelectedText` → `null`, `clipboard.readText` → `''` | `source: 'manual', type: 'manual', text: ''` |

### Failure paths
| Scenario | Mock setup | Expected context |
|----------|-----------|-----------------|
| Native module failure + AppleScript fallback | `nativeModulesReady: false`, AppleScript returns text | `source: 'app', type: 'selection'` |
| All capture methods fail | All throw/return null | `source: 'manual', type: 'manual', text: ''` |
| `detectFrontmostApp` fails | Throws error | `appName: 'Unknown'`, graceful degradation |

### Text size cap
| Scenario | Expected |
|----------|----------|
| Text < 50000 chars | `truncated: false`, full text, `originalTextLength === text.length` |
| Text = 60000 chars | `truncated: true`, `text.length === 50000`, `originalTextLength === 60000` |

---

## 3. `captureSelectedText()` AppleScript Fallback

Critical: sentinel-based validation must prevent stale clipboard leaks.
Clipboard safety: JS owns save/restore via Electron clipboard API. AppleScript only does Cmd+C and read.

| Scenario | Expected |
|----------|----------|
| Text selected, Cmd+C succeeds | Returns selected text, original clipboard restored via JS finally |
| No text selected, Cmd+C is no-op | Sentinel unchanged, returns `null`, clipboard restored via JS finally |
| App blocks Cmd+C (e.g. Terminal) | Sentinel unchanged after retry, returns `null`, clipboard restored |
| First attempt fails, second succeeds | Returns text from second attempt, clipboard restored |
| AppleScript execution fails entirely | Returns `null`, clipboard restored via JS finally (no sentinel leak) |
| Automation permission denied mid-script | JS catch runs, finally restores clipboard, no sentinel leak |
| Native module available and works | AppleScript fallback never runs, clipboard untouched |

---

## 4. `captureMailContext()` Parsing

| AppleScript output | Expected parsed result |
|---|---|
| `'compose\|\|\|SEP\|\|\|Test Subject\|\|\|SEP\|\|\|Draft body'` | `{ type: 'compose', subject: 'Test Subject', content: 'Draft body' }` |
| `'viewer\|\|\|SEP\|\|\|Re: Hello\|\|\|SEP\|\|\|Email body\|\|\|SEP\|\|\|sender@test.com'` | `{ type: 'viewer', subject: 'Re: Hello', content: 'Email body', sender: 'sender@test.com' }` |
| `'mailbox\|\|\|SEP\|\|\|No email selected\|\|\|SEP\|\|\|'` | `{ type: 'mailbox' }` |
| Empty string | `{ type: 'error' }` or graceful handling |
| Content containing `\|\|\|SEP\|\|\|` | Known limitation — delimiter collision corrupts parsing |
| AppleScript throws error | `{ type: 'error', error: '...' }` |

---

## 5. Backward Compatibility

| Test | Expected |
|------|----------|
| `get-mail-context` IPC still works | Returns same format as before |
| `get-all-mail-windows` IPC still works | Returns window list |
| `get-mail-window-context` IPC still works | Delegates to `captureMailContext()`, same return format |
| `get-mail-window-context` called with args | Args ignored, no error |
| Existing renderer code calling legacy APIs | No breakage |

---

## 6. Context Enrichment (contextDetector integration)

| Context state | Expected enrichment |
|---------------|-------------------|
| `source: 'mail', type: 'viewer'` | `icon: '📧', showDraftReply: true` |
| `source: 'app', appName: 'Safari'` | `icon: '📋', label: 'Text from Safari', showDraftReply: false` |
| `source: 'clipboard'` | `icon: '📎', label: 'Clipboard', showDraftReply: false` |
| `source: 'manual'` | `icon: '✏️', label: 'Manual input', showDraftReply: false` |

---

## 7. Test Infrastructure ✅ IMPLEMENTED

### Framework & Configuration

- **Runner**: Jest 29.7.0 (already in devDependencies)
- **Environment**: Node (not jsdom — no renderer tests yet)
- **Shared mocks**: `electron`, `electron-store` module mocks
- **Test root**: `tests/` at project root
- **Status**: 66 tests passing (contextDetector: 30, modelManager: 36)

### File Structure

```
tests/
├── __mocks__/
│   ├── electron.js
│   └── electron-store.js
├── unit/
│   ├── contextDetector.test.js
│   └── modelManager.test.js
└── integration/
    └── (future — see Section 8)
```

### Implementation Priority

1. ~~Jest config + shared mocks~~ ✅ Done
2. ~~`contextDetector.test.js` — pure functions, Section 1 spec~~ ✅ Done (30 tests)
3. ~~`modelManager.test.js` — config loading, merging, CRUD, query methods~~ ✅ Done (36 tests)

---

## 8. Future Development: main.js Testability

### Current Limitation

`src/main/main.js` is a monolith (~1000 lines). Key functions are not exported —
they are closures inside the module, and IPC handlers are registered as side effects
at module load time. This makes the following untestable without refactoring:

- `captureMailContext()` — AppleScript result parsing (Section 4 spec)
- `detectFrontmostApp()` — app detection with native/AppleScript fallback
- `captureSelectedText()` — sentinel-based clipboard trick (Section 3 spec)
- `capture-context` IPC handler — full orchestration (Section 2 spec)
- `filter-sensitive-content` IPC handler — privacy regex filtering
- `process-ai` IPC handler — OpenAI API call, GPT-5/GPT-4 param branching, error handling
- `loadApiSettings()` / `initializeOpenAI()` — config-to-client initialization

### Recommended Refactor (when ready)

Extract testable logic into separate modules without changing behavior:

| New module | Extracted from | What it exports |
|-----------|---------------|----------------|
| `src/main/privacyFilter.js` | `sensitivePatterns` + `filter-sensitive-content` handler logic | `filterSensitiveContent(text, settings)`, `sensitivePatterns` |
| `src/main/apiParams.js` | `process-ai` handler's param selection | `buildApiParams(model, apiSettings)`, `buildSystemPrompt(context, store)` |
| `src/main/captureHelpers.js` | `captureMailContext`, `detectFrontmostApp`, `captureSelectedText` | All three functions with injectable deps |

This aligns with ARCHITECTURE.md's process separation principle and keeps `main.js`
as the orchestration layer while making business logic independently testable.

### Test Files (after refactor)

```
tests/
├── unit/
│   ├── privacyFilter.test.js    — regex patterns + filtering logic
│   └── apiParams.test.js        — GPT-5 vs GPT-4 param selection
└── integration/
    ├── captureMailContext.test.js    — Section 4 spec
    ├── captureContext.test.js       — Section 2 spec
    ├── captureSelectedText.test.js  — Section 3 spec
    └── processAi.test.js           — error handling + model routing
```

---

## 9. Universal Text Processing Tests (v2.0.1)

Tests for the new feature described in `UNIVERSAL_TEXT_IMPLEMENTATION_PLAN.md`.
These cover functionality introduced across Phases 1–5.

### 9.1 Context Capture Orchestration (Phase 1)

Extends Section 2 with universal (non-Mail) paths.

| Scenario | Expected context |
|----------|-----------------|
| Safari with text selected | `source: 'app', type: 'selection', appName: 'Safari'` |
| Notes with text selected | `source: 'app', type: 'selection', appName: 'Notes'` |
| VS Code with text selected | `source: 'app', type: 'selection', appName: 'Code'` |
| No selection, clipboard has text | `source: 'clipboard', type: 'clipboard'` |
| No selection, empty clipboard | `source: 'manual', type: 'manual', text: ''` |
| Mail compose window | `source: 'mail', type: 'compose'` (existing, must not regress) |
| Mail viewer with email | `source: 'mail', type: 'viewer'` (existing, must not regress) |
| Mail mailbox, no email selected, no text | Falls through to clipboard/manual |

### 9.2 Context Enrichment (Phase 2)

Already covered by Section 6, but verify end-to-end with real `capture-context` responses:

| Context | Expected enrichment |
|---------|-------------------|
| `source: 'app', appName: 'Safari'` | `icon: '📋', label: 'Text from Safari', showDraftReply: false` |
| `source: 'app', appName: 'Notes'` | `icon: '📋', label: 'Text from Notes', showDraftReply: false` |
| `source: 'mail', type: 'compose'` | `icon: '📧', label: 'Composing email', showDraftReply: false` |
| `source: 'mail', type: 'viewer', subject: 'Hello'` | `icon: '📧', label: 'Email: Hello', showDraftReply: true` |
| `source: 'clipboard'` | `icon: '📎', label: 'Clipboard', showDraftReply: false` |
| `source: 'manual'` | `icon: '✏️', label: 'Manual input', showDraftReply: false` |

### 9.3 UI Behavior (Phase 3) — Manual Testing

These require a running Electron app and are manual test cases:

| Test | Steps | Expected |
|------|-------|----------|
| Universal context indicator | Select text in Safari → Cmd+Opt+L | 📋 icon, "Text from Safari" label |
| Mail context indicator | Select email in Mail → Cmd+Opt+L | 📧 icon, "Email: [subject]" label |
| Clipboard indicator | Copy text, deselect → Cmd+Opt+L | 📎 icon, "Clipboard" label |
| No text indicator | Empty clipboard, no selection → Cmd+Opt+L | Context indicator hidden |
| Draft Reply visibility (Mail) | Trigger from Mail viewer | Draft Reply button visible |
| Draft Reply visibility (non-Mail) | Trigger from Safari | Draft Reply button hidden |
| Other actions always visible | Trigger from any app | Summarize, Translate, Improve visible |
| Recapture button | Click 🔄 in context indicator | Context refreshes |
| Edit-before-process | Quick action → edit prompt → Process | Works end-to-end |

### 9.4 Apply-Back Mechanism (Phase 4) — Manual Testing

| Test | Steps | Expected |
|------|-------|----------|
| Apply to Safari | Process text from Safari → Apply | Text pasted into Safari |
| Apply to Notes | Process text from Notes → Apply | Text appears in Notes |
| Apply to Mail compose | Process from Mail compose → Apply | Text inserted in compose |
| No Accessibility perms | Revoke perms → Apply | Clipboard fallback + notification |
| Unknown source app | Manual input → Process → Apply | Clipboard-only + notification |
| Apply button feedback | Click Apply | Button shows ✓ or 📋 briefly |

### 9.5 System Prompt Gating (Phase 5)

| Scenario | Expected system prompt |
|----------|----------------------|
| Text from Safari | Base prompt only ("...for text processing."), no additions |
| Text from clipboard | Base prompt only, no additions |
| Text from Mail compose | Base prompt + compose addition |
| Text from Mail viewer | Base prompt + mailbox addition |
| Text from Mail mailbox | Base prompt + mailbox addition |
| Fresh install | Default: "You are a helpful AI assistant for text processing." |
| Existing install with custom prompt | Custom prompt preserved, not overwritten |

### 9.6 Backward Compatibility

| Test | Expected |
|------|----------|
| `get-mail-context` IPC still works | Returns same format as before |
| `get-all-mail-windows` IPC still works | Returns window list |
| `get-mail-window-context` IPC still works | Delegates to `captureMailContext()` |
| Existing renderer calling legacy APIs | No breakage |
| Mail.app full flow unchanged | Compose/viewer/mailbox detection, Draft Reply, email prompts |

### 9.7 Not Testable Without Refactor

These test cases from the implementation plan require the `main.js` extraction
described in Section 8 before they can be automated:

- `apply-to-source` IPC handler (three-tier fallback logic)
- `activateApp()` helper (AppleScript app activation)
- System prompt building logic inside `process-ai` handler
- Full `capture-context` orchestration as a unit test
