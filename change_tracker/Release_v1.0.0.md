# Release Notes v1.0.0

**Release Date:** 2025-12-07

## Overview
This major release introduces the Mail Window Selector feature, allowing users to choose which Mail.app window to monitor when multiple windows are open. It also includes UI improvements and critical bug fixes for app initialization.

## Features

### Mail Window Selector (Major Feature)

**Problem:** When users opened multiple Mail.app windows (composer, viewer, inbox), the assistant always detected the "front window" and couldn't distinguish between them. Users couldn't select which window to work with.

**Solution:** Implemented a comprehensive window selector feature:

- **Window Enumeration:** AppleScript enumerates all open Mail.app windows
- **Window Type Detection:** Properly identifies Compose, Viewer, and Mailbox windows
- **Dropdown Selector:** When multiple windows exist, shows a dropdown to select which window to monitor
- **Auto-Select:** When only one window exists, automatically selects it without showing the dropdown

**Files Changed:**
- `src/main/main.js:503-659` - Added `get-all-mail-windows` and `get-mail-window-context` IPC handlers
- `src/preload/preload.js:22-23` - Exposed `getAllMailWindows()` and `getMailWindowContext()` APIs
- `src/renderer/assistant.html:96-108` - Added window selector UI component
- `src/renderer/css/assistant.css:695-810` - Added styling for window selector
- `src/renderer/js/assistant.js:350-494` - Implemented window selection logic

**New IPC Handlers:**
- `get-all-mail-windows` - Returns array of all Mail.app windows with index, title, type, and preview
- `get-mail-window-context` - Returns detailed context for a specific window by index

**New Preload APIs:**
- `window.electronAPI.getAllMailWindows()` - Get list of all Mail windows
- `window.electronAPI.getMailWindowContext(windowIndex)` - Get context for specific window

### UI Improvements

**Issue:** Icon buttons (refresh, etc.) were barely visible with low contrast against backgrounds

**Solution:** Enhanced `.icon-btn` styling:
- Increased size from 24px to 28px for better tap targets
- Increased font size from 11px to 14px for better icon visibility
- Changed to transparent background with 0.6 opacity
- Added hover effects: opacity increases to 1, light background, scale up (1.1x)
- Added active state: scale down effect (0.95x)

**Files Changed:**
- `src/renderer/css/assistant.css:582-606` - Updated `.icon-btn` styles

## Bug Fixes

### Circular Dependency Issues

**Issue 1: modelManager.js initialization error**
- **Problem:** `Cannot read properties of undefined (reading 'getPath')` - modelManager was calling `app.getPath()` at module load time before app was ready
- **Solution:** Implemented lazy initialization with getter that only requires electron when accessed
- **Files Changed:** `src/main/modelManager.js:12-20`

**Issue 2: electron-store initialization error**
- **Problem:** `new Store()` was called at module load time before app ready
- **Solution:** Implemented `getStore()` function for lazy initialization
- **Files Changed:** `src/main/main.js:17-23`

**Issue 3: Circular dependency corrupting electron module**
- **Problem:** main.js required modelManager which required electron, causing circular dependency
- **Solution:** Moved modelManager require after electron require, made modelManager's electron require lazy
- **Files Changed:** `src/main/main.js:1-5`, `src/main/modelManager.js:3`

### AppleScript Output Parsing

**Issue:** `TypeError: windows.forEach is not a function`
- **Problem:** AppleScript was returning a string instead of an array
- **Solution:** Changed AppleScript to build JSON-formatted strings separated by `|||` delimiter, then parse in JavaScript
- **Files Changed:** `src/main/main.js:518-592`

## Technical Details

### New Methods Added (assistant.js)
- `showWindowSelector(windows)` - Displays dropdown with all Mail windows
- `hideWindowSelector()` - Hides the window selector UI
- `refreshMailWindows()` - Refreshes the window list
- `applySelectedWindow()` - Loads context for selected window
- `loadWindowContext(index)` - Fetches context for specific window index

### New UI Components (assistant.html)
- `#window-selector` - Container for window selector
- `#window-select` - Dropdown select element
- `#refresh-windows-btn` - Refresh button for window list

### AppleScript Window Detection Logic
The AppleScript now properly detects window types:
1. **Compose windows:** Checks for `outgoing message` property
2. **Viewer windows:** Checks if window name contains email subject patterns
3. **Mailbox windows:** Default type for main inbox windows

## Testing Notes

**Test 1: Single Mail Window**
1. Open Mail.app with only one window (inbox)
2. Press Command-Option-L
3. Verify: No dropdown appears, context auto-detected

**Test 2: Multiple Mail Windows**
1. Open Mail.app inbox
2. Open a new compose window (File > New Message)
3. Open an email in a separate window (double-click)
4. Press Command-Option-L
5. Verify: Dropdown appears with all 3 windows listed
6. Select each window and verify context changes correctly

**Test 3: Window Type Detection**
1. Open multiple windows of different types
2. Verify dropdown shows correct types: "Compose:", "Viewing:", "Mailbox:"

**Test 4: Icon Button Visibility**
1. Open assistant
2. Verify refresh button is clearly visible
3. Hover over button - verify scale effect
4. Click button - verify click feedback

## Documentation Updates

### Files Updated to v1.0.0
- `package.json` - Updated version to 1.0.0
- `package-lock.json` - Updated version to 1.0.0
- `README.md` - Updated version badge and added v1.0.0 to version history
- `docs/SETUP.md` - Updated version info and date
- `docs/Model_Management_Quick_Reference.md` - Updated version info

## Migration Guide
No migration needed. Changes are backwards compatible.

## Known Issues
- Window type detection may occasionally misidentify windows with unusual titles
- AppleScript enumeration includes all windows; some system windows may appear in rare cases

## Breaking Changes
None. This is a feature release with full backwards compatibility.
