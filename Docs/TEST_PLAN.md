# Test Plan — Universal Text Processing (v2.0.1)

Collected from code reviews and implementation phases. No test infrastructure exists yet.
When tests are implemented, use this as the specification.

---

## 1. Unit Tests: `src/main/contextDetector.js`

Pure functions, no mocking needed.

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
| Text < 50000 chars | `truncated: false`, full text |
| Text = 60000 chars | `truncated: true`, text length = 50000, `textLength: 60000` |

---

## 3. `captureSelectedText()` AppleScript Fallback

Critical: sentinel-based validation must prevent stale clipboard leaks.

| Scenario | Expected |
|----------|----------|
| Text selected, Cmd+C succeeds | Returns selected text, original clipboard restored |
| No text selected, Cmd+C is no-op | Sentinel unchanged, returns `null`, clipboard restored |
| App blocks Cmd+C (e.g. Terminal) | Sentinel unchanged after retry, returns `null` |
| First attempt fails, second succeeds | Returns text from second attempt |
| AppleScript execution fails entirely | Returns `null`, no crash |

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
