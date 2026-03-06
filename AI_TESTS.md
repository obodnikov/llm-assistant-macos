# AI_TESTS.md — Testing Rules

## Purpose
Rules for AI coding assistants when writing, running, and maintaining tests in this project.

---

## Framework & Commands

- **Runner**: Jest 29.7.0
- **Environment**: Node (`testEnvironment: "node"`)
- **Run all tests**: `npm test`
- **Run single file**: `npx jest tests/unit/contextDetector.test.js`
- **Config**: `jest` section in `package.json`

---

## File Structure

```
tests/
├── __mocks__/
│   ├── electron.js          # Stubs for electron module (app, BrowserWindow, ipcMain, clipboard, etc.)
│   └── electron-store.js    # In-memory key-value store with get/set/delete/clear
├── unit/
│   ├── contextDetector.test.js   # Pure function tests (isMail, getContextIcon, etc.)
│   └── modelManager.test.js      # Config loading, merging, CRUD, query methods
└── integration/
    └── (future — requires main.js refactor, see Docs/TEST_PLAN.md Section 8)
```

---

## Rules

1. **Run tests after any code change.** Before proposing a commit, run `npm test` and verify all tests pass.
2. **Do not break existing tests.** If a code change causes test failures, fix the tests or the code before proceeding.
3. **Add tests for new exported functions.** Any new module or exported function must have corresponding unit tests.
4. **Keep tests next to their spec.** Test cases should map to `Docs/TEST_PLAN.md` sections. Reference the section in a comment at the top of each test file.
5. **Unit tests go in `tests/unit/`, integration tests in `tests/integration/`.**
6. **Use `jest.isolateModules` for singleton modules.** `modelManager.js` exports a singleton — use `jest.isolateModules` to get a fresh instance per test group.
7. **Mock `fs` with `jest.mock('fs')` for file I/O tests.** Do not read/write real files in unit tests.
8. **Electron and electron-store are auto-mocked** via `moduleNameMapper` in Jest config. No manual mock setup needed in test files.
9. **Do not test `src/main/main.js` directly.** It's a monolith with unexported closures and side-effect IPC registration. See `Docs/TEST_PLAN.md` Section 8 for the planned refactor.
10. **Do not test renderer code (`assistant.js`) yet.** It's DOM-coupled and needs jsdom or Electron test harness.
11. **Do not test native modules (`.mm` files) via Jest.** Use the existing `npm run test-native` script for those.

---

## Mocking Patterns

### Electron mock (`tests/__mocks__/electron.js`)
Provides stubs for: `app`, `BrowserWindow`, `ipcMain`, `ipcRenderer`, `clipboard`, `nativeTheme`, `globalShortcut`, `nativeImage`, `contextBridge`, `Menu`, `Notification`, `screen`.

### Electron-store mock (`tests/__mocks__/electron-store.js`)
In-memory `Store` class with `get(key, default)`, `set(key, value)`, `delete(key)`, `clear()`, `has(key)`.

### fs mocking for modelManager
```javascript
const fs = require('fs');
jest.mock('fs');

// Setup per test:
fs.readFileSync.mockReturnValue(JSON.stringify(config));
fs.existsSync.mockReturnValue(false);
fs.writeFileSync.mockImplementation(() => {});
```

---

## Test Spec Reference

Detailed test cases (inputs, expected outputs, edge cases) live in `Docs/TEST_PLAN.md`.
This file defines *how* to test. The test plan defines *what* to test.
