# Architecture Overview

## 1. Purpose of This Document

Single source of truth for the **system architecture** of LLM Assistant for macOS.

- **Does**: describe components, data flows, stability zones, and where to find rules
- **Does NOT**: define coding rules, formatting standards, or stack-specific practices
- **Audience**: AI coding assistants, new contributors, future-you after a break
- **Coding rules live in**: `AI.md`, `AI_ELECTRON.md`, `CLAUDE.md` (see Section 8)

---

## 2. High-Level System Overview

macOS-only Electron desktop app providing AI-powered email assistance via global
hotkey (`Cmd+Option+L`). Integrates with Mail.app through AppleScript and native
C++/Obj-C modules. Single-user, background app (no dock icon), always-on-top
floating panel, macOS 11.0+, ARM64/x64.

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
│  │ main.js · modelManager · native-modules │  │
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
│   ├── main/main.js             # Entry point, IPC, Mail.app integration
│   ├── main/modelManager.js     # Model config loading, merging, CRUD
│   ├── preload/preload.js       # contextBridge (electronAPI, systemAPI, nativeModulesAPI)
│   └── renderer/
│       ├── assistant.html       # Panel markup
│       ├── css/assistant.css    # macOS-native styling
│       └── js/assistant.js      # UI logic, window selector, quick actions
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
└── package.json                 # v1.1.0, entry: src/main/main.js
```

**Critical paths**: entry → `src/main/main.js`, IPC bridge → `src/preload/preload.js`,
UI → `src/renderer/assistant.html`, model config → `config/models.json` +
`~/Library/Application Support/llm-assistant-macos/models-override.json`,
native build → `binding.gyp` → `build/Release/*.node`

---

## 4. Core Components

### 4.1 Renderer (UI)

Single floating panel (`assistant.html`): mail context indicator + window selector
dropdown, quick actions (Summarize/Translate/Improve/Draft Reply), editable prompt
with "edit-before-process" workflow, results display, settings panel. No framework —
vanilla HTML/CSS/JS with macOS vibrancy + system fonts.

### 4.2 Main Process

Window management (always-on-top, all Spaces), global shortcut, OpenAI API calls
(timeout/retry via `process-ai` handler), Mail.app AppleScript integration
(`get-mail-context`, `get-all-mail-windows`), local privacy filtering (regex),
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
| Assistant UI (HTML/CSS/JS) | 🔄 Semi-Stable | UI tweaks expected |
| Mail.app AppleScript | 🔄 Semi-Stable | Fragile (AppleScript quirks) |
| Window selector | 🔄 Semi-Stable | v1.0.0, may evolve |
| Native modules (C++/Obj-C) | ⚠️ Experimental | Rebuild on Electron upgrades |
| Context menu integration | ⚠️ Experimental | Limited adoption |
| Multi-provider (Anthropic, Ollama) | 🔮 Planned | Config exists, routing not built |
| Apply button (insert to Mail) | 🔮 Planned | Roadmap item |
| Conversation history | 🔮 Planned | No persistence yet |
| Local LLM (Ollama) | 🔮 Planned | Config placeholder only |

---

## 8. AI Coding Rules and Behavioral Contracts

**This document does NOT define coding rules.**

### Authoritative Rule Files

| File | Scope | Key Topics |
|------|-------|-----------|
| `AI.md` | Global | Process separation, security, no inline code, ~800 line limit, change tracking |
| `AI_ELECTRON.md` | Electron stack | Dev vs packaged mode, resource paths, protocol registration, window lifecycle, ESM |
| `CLAUDE.md` | AI behavior | Never code before proposing, check docs/chats, ask for approval |

**Note**: `AI_ELECTRON.md` contains rules from multiple Electron projects. Some
sections (Flask, PyInstaller, CDN ESM) don't apply today but may apply to future
features. Follow rules matching the code being modified.

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

---

## 9. Quick Start for AI Assistants

### Pre-flight Checklist

1. Read `CLAUDE.md` — behavioral contract
2. Read `AI.md` — global coding rules
3. Read `AI_ELECTRON.md` — Electron-specific rules
4. Check `Docs/chats/` — previous implementation context
5. Check `change_tracker/` — recent changes and known issues
6. **Propose solution → get approval → then implement**

### Where to Find Things

| Need | Location |
|------|----------|
| App startup | `src/main/main.js` → `app.whenReady()` |
| IPC channels | `src/preload/preload.js` |
| UI markup + logic | `src/renderer/` |
| Model config | `config/models.json` + `src/main/modelManager.js` |
| Native modules | `native-modules/index.js` + `binding.gyp` |
| Build config | `package.json` → `build` section |
| Chat history | `Docs/chats/` |
| Release history | `change_tracker/Release_v*.md` |
| Coding rules | `AI.md`, `AI_ELECTRON.md`, `CLAUDE.md` |
| Docs | `Docs/SETUP.md`, `Docs/MODEL_MANAGEMENT.md` |

### Common Pitfalls (from real bugs)

- Don't use `content` as variable name in Mail.app AppleScript
- Don't initialize `electron-store` or `modelManager` at module load time
- GPT-5 requires `max_completion_tokens` + `temperature: 1`
- Native modules must target Electron headers, not system Node.js
- Ask user which version before updating `change_tracker/`