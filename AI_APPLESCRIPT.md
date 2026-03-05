# AI Guidelines: AppleScript / macOS Automation

Rules for AppleScript embedded in this Electron app's main process.
Derived from real bugs in `Docs/chats/mailapp-composer-window-detection-issue-2025-11-30.md`
and `Docs/chats/understanding-electron-llm-assistant-project-guidelines-2025-11-30.md`.

---

## Variable Naming — Critical

**Never** use variable names that collide with Mail.app (or any target app) property names.

```applescript
-- WRONG — "content" collides with Mail's message property
set content to ""
set content to content of firstMessage   -- error -10006

-- CORRECT — prefix with "msg"
set msgContent to ""
set msgContent to content of firstMessage
```

This applies to all common property names:
- `content` → `msgContent`
- `subject` → `msgSubject`
- `sender` → `msgSender`
- `name` → `winName` or `appName`

The error is silent in some macOS versions and throws `-10006` in others.

---

## Output Format — Use Delimiters, Not JSON

Building JSON strings inside AppleScript is unreliable. Escaping quotes, backslashes,
and Unicode characters breaks constantly.

```applescript
-- WRONG — JSON construction in AppleScript
set output to "{\"subject\":\"" & msgSubject & "\"}"

-- CORRECT — delimiter-based output, parse in Node.js
return msgType & "|||SEP|||" & msgSubject & "|||SEP|||" & msgContent
```

For multi-record output (e.g. window lists), use a second delimiter:

```applescript
-- Multiple records separated by "|||", fields by "|||SEP|||"
set windowList to windowJson1 & "|||" & windowJson2
```

Parse in JavaScript with `result.split('|||')` then `record.split('|||SEP|||')`.

---

## Error Handling — Always Wrap

Every `tell application` block must have `try/on error`:

```applescript
tell application "Mail"
  try
    set selectedMessages to selection
    if (count of selectedMessages) is 0 then
      return "NO_SELECTION"
    end if
    -- ... process messages
  on error errMsg
    return "ERROR: " & errMsg
  end try
end tell
```

Never let AppleScript throw unhandled — it surfaces as a cryptic `osascript` stderr
in the Node.js `exec` callback.

---

## App State Checks

Always verify the target app is running and frontmost before interacting:

```applescript
-- Check if Mail is running
tell application "System Events"
  return (name of processes) contains "Mail"
end tell

-- Check if Mail is frontmost
tell application "System Events"
  return name of first application process whose frontmost is true
end tell
```

Do NOT `tell application "Mail"` without checking — it will launch Mail.app if not running.

---

## Window Enumeration

When listing windows:
- Filter by `visible is true` — hidden/minimized windows return incomplete data
- Never assume `front window` is the user's active window when multiple exist
- Detect window type by probing properties, not by title string matching:
  - Compose: check `every outgoing message of window`
  - Viewer: check `selection` after bringing window to front
  - Mailbox: fallback if neither compose nor viewer

```applescript
-- Detect compose window
try
  set msgs to every outgoing message of currentWindow
  if (count of msgs) > 0 then
    set windowType to "Composer"
  end if
end try
```

---

## Selection Is Global

Mail.app's `selection` property is **global**, not per-window. When you call:

```applescript
set selectedMessages to selection
```

It returns whatever is selected in the currently focused mailbox, regardless of which
window you're iterating over. To get content for a specific window:

1. Bring the target window to front: `set index of targetWindow to 1`
2. Add a small delay: `delay 0.1`
3. Then read `selection`

Be aware this briefly flashes the window — there's no silent alternative in AppleScript.

---

## Unicode and Non-ASCII Content

AppleScript handles Unicode inconsistently:
- Email content with Cyrillic, CJK, or emoji may truncate or corrupt
- `as string` coercion can fail on rich text content
- Test with non-ASCII content (Russian, emoji, accented characters)

When parsing AppleScript output in Node.js, always use `stdout.trim()` and handle
encoding edge cases in the `exec` callback.

---

## Execution from Node.js

Use `child_process.exec` with `osascript -e`:

```javascript
exec(`osascript -e '${escapedScript}'`, (error, stdout, stderr) => { ... });
```

Escaping rules:
- Single quotes in the script must be escaped: `'` → `'\"'\"'`
- This is the only reliable escaping method for `osascript -e`
- For complex scripts, consider writing to a temp `.scpt` file instead

Never use `execSync` for AppleScript — Mail.app calls can hang for seconds.

---

## Performance

- AppleScript calls to Mail.app take 100ms–2s depending on mailbox size
- Never call AppleScript in a tight loop
- Cache results where possible (e.g. window list during a single assistant session)
- Use `delay 0.1` sparingly — only when needed for window focus changes

---

## Checklist for New AppleScript Code

- [ ] Variable names don't collide with target app properties
- [ ] Output uses delimiter format, not JSON construction
- [ ] All `tell application` blocks wrapped in `try/on error`
- [ ] Target app checked for running state before `tell`
- [ ] Tested with non-ASCII content (Cyrillic, emoji)
- [ ] Using async `exec`, not `execSync`
- [ ] Single quotes properly escaped for `osascript -e`