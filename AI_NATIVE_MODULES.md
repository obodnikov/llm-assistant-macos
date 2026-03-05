# AI Guidelines: Native C++/Objective-C Modules

Rules for the three native `.node` addons in this project.
Derived from build fixes in `Docs/integration_guide.md` and `binding.gyp`.

---

## Build Targeting

Native modules must be compiled against **Electron's Node.js headers**, not the
system Node.js. The system Node version (v24.x) differs from Electron 28's
internal Node (v18.x) — MODULE_VERSION mismatch causes runtime crashes.

```bash
# CORRECT — target Electron headers
node-gyp rebuild --target=28.3.3 --arch=arm64 \
  --dist-url=https://electronjs.org/headers

# WRONG — builds against system Node
node-gyp rebuild
```

When Electron version changes in `package.json`, the `--target` must be updated
to match. Always rebuild after Electron upgrades:

```bash
npm run clean-native && npm run build-native
```

---

## C++ Standard and macOS Target

Required in `binding.gyp` for all targets:

| Setting | Value | Why |
|---------|-------|-----|
| `CLANG_CXX_LANGUAGE_STANDARD` | `c++20` | Required by Node.js v18+ headers |
| `MACOSX_DEPLOYMENT_TARGET` | `11.0` | Match Electron's minimum macOS version |
| `GCC_ENABLE_CPP_EXCEPTIONS` | `YES` | NAN uses exceptions internally |
| `CLANG_CXX_LIBRARY` | `libc++` | Standard on modern macOS |

Do not downgrade to C++11 or C++17 — NAN headers require C++20 features with
Electron 28's Node.js.

---

## V8 API Compatibility

These patterns caused real build failures and were fixed:

### Boolean namespace conflict
```cpp
// WRONG — "Boolean" conflicts with macOS Carbon headers
Boolean::New(isolate, value)

// CORRECT — fully qualify the V8 namespace
v8::Boolean::New(isolate, value)
```

### Initialize function signature
```cpp
// WRONG — missing parameters
void Initialize(Local<Object> exports)

// CORRECT — full NAN-compatible signature
void Initialize(Local<Object> exports, Local<Value> module, void* priv)
```

### Persistent callbacks
```cpp
// WRONG — Local handle goes out of scope
static Local<Function> callback;

// CORRECT — use Global for persistent storage
static Global<Function> callback;
Local<Function> cb = callback.Get(isolate);
```

### AXValue type casting
```cpp
// WRONG — implicit conversion fails on some SDK versions
AXValueGetValue(value, kAXValueCGPointType, &point)

// CORRECT — explicit cast
AXValueGetValue(value, (AXValueType)kAXValueCGPointType, &point)
```

### Event type constants
```cpp
// WRONG — kCGEventMouseUp doesn't exist
kCGEventMouseUp

// CORRECT — use specific button events
kCGEventLeftMouseUp | kCGEventRightMouseUp
```

---

## Fallback Requirement

**Every native module feature must have a JavaScript/AppleScript fallback.**
The app must be fully functional (in degraded mode) without compiled `.node` files.

| Module | Fallback |
|--------|----------|
| `text_selection.node` | AppleScript clipboard copy trick |
| `context_menu.node` | Feature disabled, no error shown |
| `accessibility.node` | AppleScript `keystroke` for text insertion |

The wrapper in `native-modules/index.js` handles this:
- `initializeNativeModules()` catches `require()` failures
- Each manager class checks `this.hasNativeModule` before calling native code
- Fallback methods are `async` and use `child_process.exec` with `osascript`

When adding new native functionality, always implement the fallback first,
then add the native optimization.

---

## macOS Permissions

All three modules require **Accessibility permissions** (`AXIsProcessTrusted()`).

- Check permissions at startup via `accessibility.checkAccessibilityPermissions()`
- If denied: log warning, set `nativeModulesReady = false`, continue in fallback mode
- Never block app startup waiting for permissions
- Show a macOS `Notification` suggesting the user grant permissions

The permission check itself does not require permissions — only the actual
AX API calls do.

---

## Frameworks

All native modules link against:
- `Cocoa.framework` — NSMenu, NSWindow, NSWorkspace
- `ApplicationServices.framework` — AX API, CGEvent

These are specified in `binding.gyp` → `libraries`. Do not add frameworks
that aren't actually used — it increases build time and binary size.

---

## Module Structure

Each module follows the same pattern:

```
native-modules/<name>/
  └── <name>.mm          # Objective-C++ source (single file per module)
```

The `.mm` extension enables mixed C++/Objective-C. Do not use `.cpp` — the
Cocoa and AX APIs require Objective-C runtime.

JS wrapper in `native-modules/index.js` exports manager classes that:
1. Check if the `.node` file loaded successfully
2. Wrap each native call with error handling
3. Provide fallback implementations
4. Expose a clean async API to the main process

---

## Checklist for Native Module Changes

- [ ] Building against Electron headers (`--target` matches Electron version)
- [ ] C++20 standard set in `binding.gyp`
- [ ] `MACOSX_DEPLOYMENT_TARGET` matches Electron minimum (11.0)
- [ ] V8 types fully qualified (`v8::Boolean`, not `Boolean`)
- [ ] `Initialize` has full 3-parameter signature
- [ ] Persistent callbacks use `Global<Function>`, not `Local<Function>`
- [ ] Fallback implementation exists in `native-modules/index.js`
- [ ] App starts and works without the `.node` file present
- [ ] Tested after `npm run clean-native && npm run build-native`