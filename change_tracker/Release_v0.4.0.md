# Release Notes v0.4.0

**Release Date:** TBD

## Overview
This release focuses on improving the user experience with window management and state handling for the assistant popup.

## Bug Fixes

### Window Management
- **Fixed: Popup appears on wrong macOS Space/desktop**
  - **Issue:** When pressing Command-Option-L, the assistant popup would appear on the Space/desktop where it was first opened, not the current active Space
  - **Solution:** Added `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` to make the window appear on all macOS Spaces
  - **Files Changed:**
    - `src/main/main.js:115` - Added workspace visibility configuration
  - **Impact:** Users can now invoke the assistant from any Space/desktop and it will appear on their current screen

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
- Test on multiple macOS Spaces to verify popup appears on current Space
- Test in fullscreen mode to verify popup appears correctly
- Test conversation state reset by:
  1. Opening assistant and entering text
  2. Hiding the assistant (click outside or use hide button)
  3. Reopening with Command-Option-L
  4. Verify input field is cleared and no previous results are shown

## Migration Guide
No migration needed. Changes are backwards compatible.

## Known Issues
None reported for this release.
