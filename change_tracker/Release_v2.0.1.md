# Release v2.0.1 — MR Code Review Fixes

## Bug Fixes

### [HIGH] Fixed potential runtime error in capture-context when no text exists
- `context.text.length` was unconditional; if `context.text` was undefined/null (plausible in "no selection" paths inside try/catch), it would throw
- Added defensive guard: `const safeText = context.text || ''` before `.length` access
- **File**: `src/main/main.js` — `capture-context` IPC handler (text processing block)

### [LOW] Context preview always appended `...` even for short text
- `updateContext` in renderer added ellipsis unconditionally
- Now only appends `...` when text exceeds 60 characters
- **File**: `src/renderer/js/assistant.js` — `updateContext()` method

## Security Improvements

### [MEDIUM] apply-to-source now validates renderer-provided app name
- Previously, renderer could request activating/pasting into arbitrary running apps by name
- Added `lastCapturedAppName` module-level variable, set during `capture-context`
- `apply-to-source` now validates `sourceAppName` matches last captured context; mismatches fall back to clipboard-only
- Also added input validation: empty/non-string text returns clipboard fallback immediately
- **File**: `src/main/main.js` — `apply-to-source` IPC handler, module-level variable

### [MEDIUM] Clipboard save/restore in apply-to-source paste fallback
- Paste fallback path overwrote clipboard without restoring previous contents
- Now saves clipboard before overwrite and restores (best-effort, 1.5s delay) after paste
- **File**: `src/main/main.js` — `apply-to-source` IPC handler, Step 2

## Backward Compatibility

### [LOW] Mail prompt enrichment for legacy callers
- `process-ai` gated Mail prompt additions on `context.source === 'mail'`
- Legacy callers sending only `context.type` (without `source`) silently lost Mail-specific prompt enrichment
- Added backward-compatible condition: `source === 'mail' || (!source && type in ['compose','viewer','mailbox'])`
- **File**: `src/main/main.js` — `process-ai` IPC handler, prompt composition block

## Observability

- Added `console.log` / `console.warn` for each fallback transition in `apply-to-source` (native → paste → clipboard) to aid permission/frontmost failure diagnosis

## Tests Added

### New file: `tests/unit/mainHandlers.test.js` (38 tests)

- **sanitizeAppName** (16 tests): valid names (spaces, dots, parens, ampersand, apostrophe), rejection cases (quotes, backslash, backtick, semicolon, control chars, newline, null, undefined, empty, number, pipe, dollar)
- **capture-context textLength safety** (6 tests): undefined text, null text, empty string, normal text, truncation beyond max, exact max boundary
- **process-ai prompt composition** (10 tests): mail source + compose/viewer/mailbox, non-mail source, clipboard source, null context, legacy context without source (compose/viewer/non-mail types), prompt suffix validation

## Files Changed

| File | Lines Changed | Change Type |
|------|--------------|-------------|
| `src/main/main.js` | ~40 | Bug fix, security, backward compat |
| `src/renderer/js/assistant.js` | 2 | UX fix |
| `tests/unit/mainHandlers.test.js` | 228 (new) | Test coverage |
| `change_tracker/Release_v2.0.1.md` | — (new) | Release notes |
