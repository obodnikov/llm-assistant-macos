
---

# 🟡 Medium Version (rules + 1 example)


# AI.md – Electron App Guidelines

## Purpose
Instructions for AI coding assistants to keep this Electron project secure and consistent.

---

## Rules
1. Keep **main process**, **renderer**, and **preload** code separated.  
2. Store CSS in `.css` files and JS in `.js`/`.ts` files (no inline).  
3. Organize folders: `main/`, `renderer/`, `preload/`, `assets/`, `config/`.  
4. Use modern JavaScript/TypeScript (ES6+).  
5. Limit JS/TS files to ~800 lines.  
6. Enforce Electron security:
   - `contextIsolation: true`
   - No `nodeIntegration` in renderer
   - Use preload for safe APIs  
7. Never hardcode secrets — use environment variables.  

---

## Example

✅ **BrowserWindow with security**

const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    preload: path.join(__dirname, "preload.js"),
  },
});
