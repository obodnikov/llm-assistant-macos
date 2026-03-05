# Electron Desktop Implementation Rules

Derived from real bugs encountered during implementation.

## Dev vs Packaged Mode

The desktop app has two distinct runtime modes with different code paths. Always be
explicit about which mode a piece of code targets.

| Aspect | Dev (`npm start`) | Packaged (`npm run make`) |
|---|---|---|
| `app.isPackaged` | `false` | `true` |
| Static files root | `path.resolve(__dirname, '..')` (project root) | `process.resourcesPath` |
| Flask backend | Venv Python (auto-detected) | PyInstaller binary from `extraResource` |
| `__dirname` | `<project>/desktop/` | `Contents/Resources/app/desktop/` |

- Gate packaged-only logic behind `app.isPackaged` checks.
- Never use compiled PyInstaller binaries in dev mode — always fall through to venv Python.
- Test both modes before releasing. Dev mode working does not guarantee packaged mode works.

## Packaging & Resource Paths

- Frontend directories (`public/`, `scripts/`, `styles/`, `icons/`) live outside `desktop/`
  and are NOT automatically included by Electron Forge. They must be listed in
  `forge.config.js` → `packagerConfig.extraResource`:
  ```javascript
  extraResource: ['./build/dist/backend', '../public', '../scripts', '../styles', '../icons']
  ```
- `extraResource` items land directly in `Contents/Resources/<name>/`, NOT in a
  subdirectory like `app-resources/`. Always use `process.resourcesPath` directly.
- The Electron app source (`desktop/`) is packaged into `Contents/Resources/app/`.
- In `protocol.js`, resolve the static file root based on mode:
  ```javascript
  const root = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
  ```
- Never hardcode `path.join(process.resourcesPath, 'app-resources')` — verify the
  actual packaged layout before assuming a subdirectory exists.

## Flask Manager & Python Detection

- Electron child processes do NOT inherit the user's shell environment (venv activation,
  PATH additions, etc.). Never assume `python` or `python3` is available on PATH.
- In dev mode, resolve the venv Python as an absolute path:
  ```javascript
  const venvPython = path.join(projectRoot, 'backend', 'venv', 'bin', 'python');
  ```
  Use `path.join` with an already-absolute `projectRoot` (from `path.resolve`), not
  a relative path — `spawn()` with a relative command + different `cwd` causes ENOENT.
- Python detection priority: 1) venv Python, 2) `python3`, 3) `python`, 4) common
  system paths (`/opt/homebrew/bin/python3`, `/usr/local/bin/python3`).
- Validate each candidate with `execFileSync(candidate, ['--version'])` before using it.
- Run Flask via inline import, not `flask run`:
  ```javascript
  args: ['-c', 'from backend.app import create_app; from backend.config import Config; app = create_app(); cfg = Config(); app.run(host=cfg.BACKEND_HOST, port=cfg.BACKEND_PORT, debug=False)']
  ```
  This avoids needing `FLASK_APP`, `FLASK_RUN_PORT`, and `FLASK_RUN_HOST` env vars.
- Set `PYTHONPATH` to the project root so `from backend.app import ...` resolves correctly.
- Set `BACKEND_PORT` and `BACKEND_HOST` in the child process env — the Config class reads them.

## PyInstaller Binary (Packaged Mode Only)

- The PyInstaller entry point must be a wrapper script with absolute imports, NOT `app.py`
  directly. `app.py` uses relative imports (`from .config import Config`) which fail when
  PyInstaller runs it as `__main__`.
- Use `desktop/build/run_backend.py` as the entry point:
  ```python
  from backend.app import create_app
  from backend.config import Config
  cfg = Config()
  app = create_app()
  app.run(host=cfg.BACKEND_HOST, port=cfg.BACKEND_PORT, debug=False)
  ```
- In `backend.spec`, point Analysis to the wrapper:
  ```python
  Analysis([os.path.join(SPECPATH, 'run_backend.py')], ...)
  ```
- Only list `backend.*` prefixed hidden imports. Bare `routes.*`, `services.*`, and
  `config` entries are redundant and produce warnings.
- Build sequence: `cd desktop/build && pyinstaller backend.spec`, then `cd .. && npm run make`.

## node_modules in Packaged App

- Do NOT add `/^\/node_modules\//` to the `ignore` array in `forge.config.js`.
  Electron Forge auto-prunes devDependencies; blanket-ignoring node_modules strips
  runtime dependencies like `electron-store` and `get-port`.
- Runtime dependencies must be in `dependencies`, not `devDependencies`.
- `electron-store` v8+ and `get-port` v7+ are ESM-only. Pin to v7/v5 respectively
  if the codebase uses CommonJS (`require()`). `get-port` v6+ is ESM-only.

## Protocol Registration

- `protocol.handle()` can only be called once per scheme. Never call `registerProtocol()`
  inside `createWindow()` — call it once in `app.whenReady()` before the first window.
- Register the scheme as privileged with `protocol.registerSchemesAsPrivileged()` before
  `app.whenReady()`, otherwise fetch/XHR from the renderer will be blocked.

## Static File Serving via Custom Protocol

- Use `net.fetch(pathToFileURL(filePath).toString())` to serve local files from
  `protocol.handle()`. Do NOT use `fs.readFileSync()` + `new Response()` — Electron
  may silently fail to apply correct MIME types or deliver the body to the renderer.
- Extract path resolution into a testable helper (e.g. `resolveStaticPath()`) and
  export it for unit testing.
- Path traversal: validate the resolved path is inside the specific allowed directory,
  not just the project root. Use `path.relative(allowedBase, filePath)` and reject if
  the result starts with `..` or is absolute.
- Restrict served directories to an explicit allowlist (e.g. `public`, `scripts`,
  `styles`, `icons`). Never serve the entire project root.

## Window & Menu Lifecycle (macOS)

- On macOS, closing all windows does not quit the app. The `activate` event recreates
  the window. Any object that holds a `BrowserWindow` reference must handle the window
  being destroyed and recreated.
- Never close over a `mainWindow` variable in menu click handlers — the reference goes
  stale after the window is closed. Use `BrowserWindow.getFocusedWindow()` or
  `BrowserWindow.getAllWindows()[0]` at click time instead.
- Call `setupMenu()` once; do not rebuild the menu on window recreate.

## External Tool Detection

- Packaged Electron apps inherit a minimal `PATH` that excludes Homebrew and user-local
  paths (e.g. `~/.local/Homebrew/bin`). Never assume system tools are on PATH.
- For Python specifically, always try the project venv first (absolute path), then
  fall back to system candidates.
- For other tools (pandoc, etc.), provide a user-configurable path setting and
  auto-detect from common install locations as fallback:
  `/usr/local/bin`, `/opt/homebrew/bin`, `/usr/bin`.
- Pass resolved binary paths as environment variables to child processes so they
  propagate through to Python services (e.g. `PANDOC_PATH`, `PYTHONPATH`).

## CDN ESM Modules in Electron

- Bare module specifiers (e.g. `import ... from '@lezer/json'`) do not resolve in
  Electron or any browser context. CDN-hosted ESM must use fully resolved URLs.
- jsdelivr `/dist/index.js` paths contain bare specifiers internally. The `/+esm`
  endpoint rewrites them but can cause duplicate instances of shared dependencies.
- Use `esm.sh` with pinned versions and `?deps=` parameter to force shared dependency
  instances. Example: `https://esm.sh/@codemirror/commands@6.10.2?deps=@codemirror/state@6.5.4`
- Pin all CodeMirror packages to exact versions to prevent `instanceof` failures from
  multiple `@codemirror/state` copies ("Unrecognized extension value" error).

## Renderer File Operations

- The browser File System Access API (`showOpenFilePicker`, `showSaveFilePicker`) may
  not work under custom `app://` protocols in Electron.
- Always check for `window.electronAPI` first and use the IPC bridge for file open/save
  when running in the desktop app. Fall back to browser APIs for web deployment.
- Define IPC handlers in main process (`ipcMain.handle`) and expose them via `preload.js`
  using `contextBridge.exposeInMainWorld`.
