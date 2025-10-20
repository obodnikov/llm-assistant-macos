# Release Notes v0.4.0

**Release Date:** TBD

## Overview
This release focuses on improving the user experience with window management and state handling for the assistant popup.

## Bug Fixes

### Window Management

**Issue 1: Popup appears on wrong macOS Space/desktop**
- **Problem:** When pressing Command-Option-L, the assistant popup would appear on the Space/desktop where it was first opened, not the current active Space
- **Solution:** Set `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` to make the window appear on all macOS Spaces
- **Files Changed:**
  - `src/main/main.js:115` - Added workspace visibility configuration
- **Impact:** Window now appears on whichever desktop/Space the user is currently on when pressing Command-Option-L

**Issue 2: Window auto-hides when switching apps or desktops**
- **Problem:** The assistant window would automatically hide when losing focus (blur event), making it disappear when switching between applications or desktops
- **Solution:** Removed the blur event listener that was auto-hiding the window
- **Files Changed:**
  - `src/main/main.js:123-125` - Removed blur event listener (lines removed)
- **Impact:** Window now stays visible when switching between apps. Only hides when user explicitly:
  - Clicks the hide/minimize button, OR
  - Presses Command-Option-L again to toggle visibility

### State Management
- **Fixed: Assistant remembers old conversation context between invocations**
  - **Issue:** When hiding and reshowing the assistant popup, it retained previous conversation history, mail context, and results
  - **Solution:** Implemented automatic state reset when window becomes visible
  - **Files Changed:**
    - `src/preload/preload.js:32-35` - Added `onWindowShown` event handler
    - `src/main/main.js:173-174` - Send 'window-shown' event when panel becomes visible
    - `src/renderer/js/assistant.js:192-197` - Added event listener for window-shown
    - `src/renderer/js/assistant.js:704-723` - Implemented `resetOnShow()` method
  - **Impact:** Each time users open the assistant, they get a fresh state with current context

## Technical Details

### New Methods Added
- `AssistantPanel.resetOnShow()` - Resets all UI state, clears conversation history, refreshes mail context when window is shown

### New IPC Events
- `window-shown` - Event sent from main process to renderer when assistant panel becomes visible

### API Changes
- Added `window.electronAPI.onWindowShown(callback)` to preload API for renderer to listen to window visibility changes

## Testing Notes

**Test 1: Window appears on current desktop**
1. Switch to Desktop 2 (or any Space)
2. Press Command-Option-L
3. Verify window appears on Desktop 2 (current desktop), not Desktop 1

**Test 2: Window stays visible when switching apps**
1. Open assistant with Command-Option-L
2. Switch to another application (e.g., Safari, Mail)
3. Verify assistant window stays visible on top

**Test 3: Window visible across all Spaces**
1. Open assistant with Command-Option-L on Desktop 1
2. Switch to Desktop 2
3. Verify assistant window is visible on Desktop 2
4. Switch back to Desktop 1
5. Verify assistant window is still visible

**Test 4: Explicit hide/show**
1. Open assistant with Command-Option-L
2. Press Command-Option-L again - verify window hides
3. Press Command-Option-L again - verify window shows
4. Click hide button - verify window hides

**Test 5: State reset**
1. Open assistant and enter text
2. Hide the assistant with hide button or Command-Option-L
3. Reopen with Command-Option-L
4. Verify input field is cleared and no previous results are shown

## Migration Guide
No migration needed. Changes are backwards compatible.

## Known Issues
None reported for this release.
