# Architecture Overview

## 1. Purpose of This Document

Single source of truth for the **system architecture** of LLM Assistant for macOS.

- **Does**: describe components, data flows, stability zones, and where to find rules
- **Does NOT**: define coding rules, formatting standards, or stack-specific practices
- **Audience**: AI coding assistants, new contributors, future-you after a break
- **Coding rules live in**: `AI.md`, `AI_ELECTRON.md`, `CLAUDE.md` (see Section 8)

---

## 2. High-Level System Overview

macOS-only Electron desktop app providing AI-powered text processing assistance via
global hotkey (`Cmd+Option+L`). Works with any macOS application — captures selected
text or clipboard content universally. Mail.app is a premium integration with rich
context (subject, sender, Draft Reply). Single-user, background app (no dock icon),
always-on-top floating panel, macOS 11.0+, ARM64/x64.

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 28.3.3 (Node.js v18 internally) |
| Native modules | C++20 / Objective-C via node-gyp + NAN |
| Mail automation | AppleScript (osascript) |
| AI provider | OpenAI API (GPT-5.x / GPT-4.x series) |
| Config storage | electron-store (macOS Keychain-backed) |
| Model config | JSON files with user override merging |
| Build/package | electron-builder → DMG |

```
┌───────────────────────────────────────────────┐
│                 macOS System                   │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐  │
│  │Mail.app │  │ Any App │  │Accessibility │  │
│  └───┬─────┘  └───┬─────┘  └──────┬───────┘  │
│      │AppleScript  │text sel.      │native    │
│  ┌───┴─────────────┴───────────────┴───────┐  │
│  │        Main Process (Node.js)           │  │
│  │ main.js · contextDetector · modelMgr   │  │
│  └──────────────┬──────────────────────────┘  │
│          IPC (contextBridge)                   │
│  ┌──────────────┴──────────────────────────┐  │
│  │      Renderer Process (Chromium)        │  │
│  │ assistant.html · assistant.js/css       │  │
│  └─────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────┘
                │ HTTPS
        ┌───────┴───────┐
        │  OpenAI API   │
        └───────────────┘
```

---

## 3. Repository Structure

```
llm-assistant-macos/
├── src/
│   ├── main/main.js             # Entry point, IPC, text capture, apply-back
│   ├── main/contextDetector.js  # Mail vs generic detection, icon/label helpers
│   ├── main/modelManager.js     # Model config loading, merging, CRUD
│   ├── preload/preload.js       # contextBridge (electronAPI, systemAPI, nativeModulesAPI)
│   └── renderer/
│       ├── assistant.html       # Panel markup (universal context indicator)
│       ├── css/assistant.css    # macOS-native styling
│       └── js/assistant.js      # UI logic, universal context, quick actions
├── native-modules/
│   ├── index.js                 # JS wrapper with fallback logic
│   ├── text-selection/          # Global text selection monitoring
│   ├── context-menu/            # System-wide right-click menus
│   └── accessibility/           # AX API: text insertion, window info
├── config/models.json           # Default model + API settings (ships with app)
├── build/Release/               # Compiled .node binaries (gitignored)
├── scripts/                     # Build, setup, permission-check scripts
├── Docs/                        # User-facing docs + Docs/chats/ history
├── change_tracker/              # Per-release change logs
├── AI.md                        # Global AI coding rules
├── AI_ELECTRON.md               # Electron stack-specific rules
├── CLAUDE.md                    # AI behavioral contract
├── tests/                       # Jest unit tests (100 passing)
│   ├── __mocks__/               # Shared mocks (electron, electron-store)
│   └── unit/                    # contextDetector, modelManager, mainHandlers
└── package.json                 # v2.0.1, entry: src/main/main.js
```

**Critical paths**: entry → `src/main/main.js`, IPC bridge → `src/preload/preload.js`,
UI → `src/renderer/assistant.html`, model config → `config/models.json` +
`~/Library/Application Support/llm-assistant-macos/models-override.json`,
native build → `binding.gyp` → `build/Release/*.node`

---

## 4. Core Components

### 4.1 Renderer (UI)

Single floating panel (`assistant.html`): universal context indicator (dynamic icon
and label based on source app), quick actions (Summarize/Translate/Improve always
visible; Draft Reply only for Mail), editable prompt with "edit-before-process"
workflow, results display with Apply button, settings panel. No framework — vanilla
HTML/CSS/JS with macOS vibrancy + system fonts.

### 4.2 Main Process

Window management (always-on-top, all Spaces), global shortcut, OpenAI API calls
(timeout/retry via `process-ai` handler), universal text capture (`capture-context`
handler orchestrates app detection → text selection → clipboard fallback),
Mail.app AppleScript integration (`captureMailContext()`, `get-all-mail-windows`),
apply-back mechanism (`apply-to-source` handler with native/paste/clipboard tiers),
local privacy filtering (regex), context detection via `contextDetector.js`,
model config via `modelManager.js` (singleton), native module lifecycle,
persistent settings via `electron-store`.

**Key pattern**: `modelManager.js` and `electron-store` use lazy initialization
to avoid circular dependency with Electron's `app` module. Fixed in v1.0.0 —
do not move initialization back to module load time.

### 4.3 Native Modules (C++/Objective-C)

Three `.node` addons built via `node-gyp` targeting Electron 28 headers:

| Module | Purpose | Fallback |
|--------|---------|----------|
| `text_selection.node` | System-wide text selection | AppleScript clipboard trick |
| `context_menu.node` | Right-click menu integration | Feature disabled |
| `accessibility.node` | AX API: permissions, text insert | AppleScript keystroke |

All require macOS Accessibility permissions. App works without them in degraded mode.

### 4.4 External Integrations

| Integration | Method | Notes |
|------------|--------|-------|
| OpenAI API | `openai` npm package | GPT-5: `max_completion_tokens`; GPT-4: `max_tokens` |
| Mail.app | AppleScript via `osascript` | Window enumeration, content extraction |
| macOS Keychain | via `electron-store` | API key storage |
| macOS Accessibility | via native modules | Permissions checked at startup |

---

## 5. Data Flow & Runtime Model

### AI Processing Flow
```
Quick Action click → storedText saved → user edits prompt → "Process"
  → IPC "process-ai" → privacy filter (local) → parse model ID
  → select API params (GPT-5 vs GPT-4) → Promise.race(api, timeout)
  → success: display result | failure: enhanced error message
```

### Mail.app Context Detection
```
Cmd+Option+L → get-all-mail-windows (AppleScript enumerates visible windows)
  → 0 windows: "Mail not active"
  → 1 window: auto-select, load context
  → N windows: show dropdown → user selects → get-mail-window-context
      → Compose: draft content | Viewer: body+subject+sender | Mailbox: label
```

**Known gotcha**: AppleScript variable names must not collide with Mail.app
property names (use `msgContent` not `content` — caused error -10006).

### Universal Text Capture Flow (v2.0.1)
```
Cmd+Option+L → renderer calls captureContext() via IPC
  → Step 1: detectFrontmostApp() (native module or AppleScript)
  → Step 2: Route by app:
      Mail.app → captureMailContext() (rich: compose/viewer/mailbox)
      Any other → captureSelectedText() (native or Cmd+C trick)
  → Step 3: If no text → clipboard.readText() fallback
  → Step 4: If still nothing → source: 'manual', empty text
  → Step 5: Enrich via contextDetector (icon, label, showDraftReply)
  → Return unified context object to renderer
```

### Apply-Back Flow (v2.0.1)
```
User clicks Apply → renderer calls applyToSource(text, appName) via IPC
  → Validate: sanitizeAppName(), isAppRunning(), lastCapturedAppName match
  → Tier 1: Native insertTextAtCursor() (requires Accessibility)
  → Tier 2: clipboard + activateApp() + waitForAppFrontmost() + Cmd+V
  → Tier 3: clipboard.writeText() + notification (always works)
  → Return { success, method, fallback } to renderer for UI feedback
```

### Configuration Loading
```
Startup → modelManager.loadConfig()
  → 1. Read config/models.json (default)
  → 2. Read models-override.json (user overrides)
  → 3. Deep merge: providers, preferences, apiSettings
  → loadApiSettings() + initializeOpenAI() use merged config
```
Priority: user override > default config > hardcoded fallbacks.

---

## 6. Configuration & Environment Assumptions

| Config | Location | Purpose |
|--------|----------|---------|
| `config/models.json` | Repo (ships with app) | Default models, API settings |
| `models-override.json` | `~/Library/Application Support/llm-assistant-macos/` | User overrides |
| `electron-store` | macOS Keychain-backed | API key, model, privacy prefs, prompts |

**Environment**: macOS 11.0+, ARM64/x64, Xcode CLT (for native builds),
internet for OpenAI, Node ≥18 via Electron (not system Node).

**Permissions**: Accessibility (native modules), Automation → Mail.app (email
context), Screen Recording (optional, context menu positioning).

No `.env` files — secrets in electron-store, config in JSON files.

---

## 7. Stability Zones

| Component | Zone | Notes |
|-----------|------|-------|
| Main process IPC handlers | ✅ Stable | Core functionality |
| Preload bridge (contextBridge) | ✅ Stable | Security boundary |
| Privacy filtering (regex) | ✅ Stable | Local-only |
| Model config system (merge) | ✅ Stable | Deep merge with overrides |
| Context detector (contextDetector.js) | ✅ Stable | Pure functions, 30 unit tests |
| Universal text capture (capture-context) | ✅ Stable | v2.0.1, multi-tier fallback |
| System prompt gating (source-based) | ✅ Stable | v2.0.1, backward-compatible |
| Assistant UI (HTML/CSS/JS) | 🔄 Semi-Stable | Universal context indicator |
| Mail.app AppleScript | 🔄 Semi-Stable | Fragile (AppleScript quirks) |
| Window selector | 🔄 Semi-Stable | v1.0.0, hidden in universal flow |
| Apply-back mechanism | 🔄 Semi-Stable | v2.0.1, three-tier fallback |
| Native modules (C++/Obj-C) | ⚠️ Experimental | Rebuild on Electron upgrades |
| Context menu integration | ⚠️ Experimental | Limited adoption |
| Multi-provider (Anthropic, Ollama) | 🔮 Planned | Config exists, routing not built |
| Conversation history | 🔮 Planned | No persistence yet |
| Local LLM (Ollama) | 🔮 Planned | Config placeholder only |
| Per-app contextual actions | 🔮 Planned | v2.1+ (see implementation plan) |

---

## 8. AI Coding Rules and Behavioral Contracts

**This document does NOT define coding rules.**

### Authoritative Rule Files

| File | Scope | Key Topics |
|------|-------|-----------|
| `AI.md` | Global | Process separation, security, no inline code, ~800 line limit, change tracking |
| `AI_ELECTRON.md` | Electron stack | Dev vs packaged mode, resource paths, protocol registration, window lifecycle, ESM |
| `AI_APPLESCRIPT.md` | AppleScript | Variable naming, delimiter output, error handling, window enumeration, Unicode |
| `AI_NATIVE_MODULES.md` | C++/Obj-C modules | Build targeting, V8 API compat, fallback requirement, permissions |
| `AI_OpenAI.md` | OpenAI API | Model family detection, GPT-5 vs GPT-4 params, token budgets, error handling |
| `AI_TESTS.md` | Testing | Jest setup, file structure, mocking patterns, rules for writing/running tests |
| `CLAUDE.md` | AI behavior | Never code before proposing, check docs/chats, ask for approval |

**Notes**:
- `AI_ELECTRON.md` contains rules from multiple Electron projects. Some sections
  (Flask, PyInstaller, CDN ESM) don't apply today but may apply to future features.
- `AI_OpenAI.md` uses Python examples (from sibling project) but rules are universal.

### Rule Precedence (highest → lowest)

1. User's explicit instruction in current conversation
2. Stack-specific rules (`AI_ELECTRON.md`)
3. Global rules (`AI.md`)
4. This document (architectural constraints only)
5. Language/framework conventions

### Conflict Resolution

**STOP → IDENTIFY → ASK → WAIT.** Do not guess.

### Key Architectural Decisions to Preserve

- `contextIsolation: true`, no `nodeIntegration` (security boundary)
- Three-process separation: main / preload / renderer
- Lazy init for `modelManager` and `electron-store` (circular dep fix)
- Native modules optional — app must work without them
- Privacy filtering local-only, before any API call
- AppleScript vars: `msgContent`/`msgSubject`/`msgSender` (not `content`/`subject`/`sender`)
- GPT-5 vs GPT-4 API parameter branching
- All changes tracked in `change_tracker/Release_vX.Y.Z.md`

### Critical Implementation Lessons (from real bugs)

These are hard-won findings from past debugging sessions documented in `Docs/chats/`.
Violating any of these will break the app. Treat as mandatory constraints.

1. **Require order in `main.js` is fragile — do NOT reorder.**
   `modelManager` requires `electron` internally; `electron-store` and
   `electron-window-state` also require `electron`. The current order works.
   Previous sessions broke the app multiple times by reordering requires,
   causing `app` to be `undefined` due to circular dependency. Add new
   requires at the END of the existing block, never before `electron`.

2. **AppleScript: no apostrophes in comments.**
   `executeAppleScript()` escapes single quotes via `'` → `'"'"'`. Comments
   containing apostrophes (e.g. `-- it's a compose window`) get mangled and
   cause syntax error -2741. Use comment phrasing without apostrophes, or
   omit comments in AppleScript strings entirely.

3. **AppleScript: variable names must not collide with app properties.**
   Using `content`, `subject`, `sender` as variable names in Mail.app
   AppleScript causes silent failures or error -10006. Always prefix:
   `msgContent`, `msgSubject`, `msgSender`. See `AI_APPLESCRIPT.md`.

4. **Do not rewrite working AppleScript handlers.**
   The existing `get-mail-window-context` and `get-all-mail-windows` handlers
   went through extensive debugging (quote escaping, window detection, parsing).
   When reusing their logic, extract the AppleScript verbatim into a shared
   function — do not "clean up" or rewrite the scripts.

5. **Native modules have built-in fallbacks — use the wrapper.**
   `native-modules/index.js` exports manager classes (`TextSelectionManager`,
   `AccessibilityManager`) that already include AppleScript fallbacks. Use
   `nativeModules.textSelection.getSelectedText()` and
   `nativeModules.accessibility.getFrontmostApplication()` instead of writing
   duplicate fallback logic. Only add a standalone fallback if
   `nativeModulesReady` is `false`.

6. **No JSON construction inside AppleScript.**
   Building JSON strings in AppleScript is unreliable (quote escaping, Unicode).
   Use delimiter-based output (`|||SEP|||`) and parse in JavaScript with
   `result.split('|||SEP|||')`. See `AI_APPLESCRIPT.md` for the pattern.

7. **`nativeModules` is the JS wrapper, not raw `.node` bindings.**
   The object imported from `native-modules/index.js` has `.textSelection`,
   `.accessibility`, `.contextMenu` properties — these are manager class
   instances with error handling and fallbacks. Do not try to `require()` the
   `.node` files directly.

8. **Sanitize app names before AppleScript interpolation.**
   `activateApp()`, `isAppRunning()`, and `isAppFrontmost()` interpolate app
   names into AppleScript strings. Use `sanitizeAppName()` (allowlist regex:
   `[a-zA-Z0-9 .\-_(),'&+]`) before any interpolation. Reject mismatches
   entirely — do not attempt to "fix" invalid names. Added in v2.0.1 to
   prevent AppleScript injection via renderer-supplied app names.

9. **Validate apply-to-source requests against last captured context.**
   `lastCapturedAppName` is set during `capture-context` and checked in
   `apply-to-source`. This prevents the renderer from requesting activation
   of arbitrary apps. Mismatches fall back to clipboard-only.

---

## 9. Quick Start for AI Assistants

### Pre-flight Checklist

1. Read `CLAUDE.md` — behavioral contract
2. Read `AI.md` — global coding rules
3. Read stack-specific rules matching your task:
   - `AI_ELECTRON.md` — Electron packaging, windows, protocols
   - `AI_APPLESCRIPT.md` — Mail.app automation, osascript
   - `AI_NATIVE_MODULES.md` — C++/Obj-C builds, V8 API
   - `AI_OpenAI.md` — API calls, model params, error handling
4. Check `Docs/chats/` — previous implementation context
5. Check `change_tracker/` — recent changes and known issues
6. **Propose solution → get approval → then implement**

### Where to Find Things

| Need | Location |
|------|----------|
| App startup | `src/main/main.js` → `app.whenReady()` |
| IPC channels | `src/preload/preload.js` |
| UI markup + logic | `src/renderer/` |
| Context detection | `src/main/contextDetector.js` |
| Model config | `config/models.json` + `src/main/modelManager.js` |
| Native modules | `native-modules/index.js` + `binding.gyp` |
| Build config | `package.json` → `build` section |
| Unit tests | `tests/unit/` (Jest, 100 tests) |
| Chat history | `Docs/chats/` |
| Release history | `change_tracker/Release_v*.md` |
| Coding rules | `AI.md`, `AI_ELECTRON.md`, `AI_APPLESCRIPT.md`, `AI_NATIVE_MODULES.md`, `AI_OpenAI.md`, `CLAUDE.md` |
| Docs | `Docs/SETUP.md`, `Docs/MODEL_MANAGEMENT.md` |

### Common Pitfalls (from real bugs)

See Section 8 → "Critical Implementation Lessons" for full details and rationale.

- Don't reorder `require()` statements in `main.js` — circular dependency
- Don't use apostrophes in AppleScript comments — quote escaping breaks them
- Don't use `content`/`subject`/`sender` as AppleScript variable names — use `msg` prefix
- Don't rewrite working AppleScript handlers — extract verbatim into shared functions
- Don't duplicate native module fallback logic — use the wrapper managers
- Don't construct JSON inside AppleScript — use `|||SEP|||` delimiters
- Don't initialize `electron-store` or `modelManager` at module load time
- GPT-5 requires `max_completion_tokens` + `temperature: 1`
- Native modules must target Electron headers, not system Node.js
- Ask user which version before updating `change_tracker/`
- Always use `sanitizeAppName()` before interpolating app names into AppleScript
- Validate `apply-to-source` app name against `lastCapturedAppName`