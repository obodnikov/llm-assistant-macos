#include <node.h>
#include <uv.h>
#include <v8.h>

#import <Cocoa/Cocoa.h>
#import <ApplicationServices/ApplicationServices.h>

using namespace v8;

// Custom NSMenuItem that stores action data
@interface LLMMenuItem : NSMenuItem
@property (nonatomic, strong) NSString* actionId;
@end

@implementation LLMMenuItem
@end

// Target-action for menu items
@interface MenuActionTarget : NSObject
- (void)menuAction:(id)sender;
@end

namespace context_menu {

// Global variables
static Global<Function> menuCallback;
static NSMenu* contextMenu = nullptr;
static std::string lastSelectedText = "";

// Menu action handler
void HandleMenuAction(NSString* actionId, NSString* selectedText) {
    if (menuCallback.IsEmpty()) return;

    Isolate* isolate = Isolate::GetCurrent();
    HandleScope scope(isolate);
    Local<Context> context = isolate->GetCurrentContext();

    Local<Object> result = Object::New(isolate);
    result->Set(context, String::NewFromUtf8(isolate, "action").ToLocalChecked(),
               String::NewFromUtf8(isolate, [actionId UTF8String]).ToLocalChecked());
    result->Set(context, String::NewFromUtf8(isolate, "text").ToLocalChecked(),
               String::NewFromUtf8(isolate, [selectedText UTF8String]).ToLocalChecked());

    Local<Value> argv[] = { result };
    Local<Function> callback = menuCallback.Get(isolate);
    callback->Call(context, Null(isolate), 1, argv);
}

} // end namespace for forward declaration

@implementation MenuActionTarget
- (void)menuAction:(id)sender {
    if ([sender isKindOfClass:[LLMMenuItem class]]) {
        LLMMenuItem* item = (LLMMenuItem*)sender;
        NSString* selectedText = [NSString stringWithUTF8String:context_menu::lastSelectedText.c_str()];
        context_menu::HandleMenuAction(item.actionId, selectedText);
    }
}
@end

namespace context_menu {

static MenuActionTarget* menuTarget = nullptr;

// Event tap callback for right-click detection
CGEventRef RightClickCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void* refcon) {
    if (type == kCGEventRightMouseDown) {
        // Get current selection when right-clicking
        dispatch_async(dispatch_get_main_queue(), ^{
            // Small delay to ensure selection is available
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.1 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
                // Get selected text
                AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
                AXUIElementRef focusedApp = nullptr;
                AXUIElementRef focusedElement = nullptr;
                
                AXError error = AXUIElementCopyAttributeValue(systemWideElement, kAXFocusedApplicationAttribute, (CFTypeRef*)&focusedApp);
                if (error == kAXErrorSuccess && focusedApp) {
                    error = AXUIElementCopyAttributeValue(focusedApp, kAXFocusedUIElementAttribute, (CFTypeRef*)&focusedElement);
                    
                    if (error == kAXErrorSuccess && focusedElement) {
                        CFStringRef selectedText = nullptr;
                        error = AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextAttribute, (CFTypeRef*)&selectedText);
                        
                        if (error == kAXErrorSuccess && selectedText) {
                            const char* textCString = CFStringGetCStringPtr(selectedText, kCFStringEncodingUTF8);
                            if (textCString && strlen(textCString) > 0) {
                                lastSelectedText = std::string(textCString);
                                
                                // Show context menu if we have text
                                CGPoint mouseLocation = CGEventGetLocation(event);
                                NSPoint nsPoint = NSMakePoint(mouseLocation.x, CGDisplayPixelsHigh(kCGDirectMainDisplay) - mouseLocation.y);
                                
                                [contextMenu popUpMenuPositioningItem:nil atLocation:nsPoint inView:nil];
                            }
                            CFRelease(selectedText);
                        }
                        CFRelease(focusedElement);
                    }
                    CFRelease(focusedApp);
                }
                CFRelease(systemWideElement);
            });
        });
    }
    
    return event;
}

static CFMachPortRef rightClickTap = nullptr;
static bool isListening = false;

// Register context menu items
void RegisterContextMenu(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    if (args.Length() != 2 || !args[0]->IsArray() || !args[1]->IsFunction()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected array of menu items and callback function").ToLocalChecked()));
        return;
    }
    
    // Store callback
    Local<Function> callback = Local<Function>::Cast(args[1]);
    menuCallback = Global<Function>(isolate, callback);
    
    // Create menu target if needed
    if (!menuTarget) {
        menuTarget = [[MenuActionTarget alloc] init];
    }
    
    // Create context menu
    if (contextMenu) {
        [contextMenu release];
    }
    contextMenu = [[NSMenu alloc] initWithTitle:@"LLM Assistant"];
    
    // Parse menu items array
    Local<Array> menuItems = Local<Array>::Cast(args[0]);
    uint32_t length = menuItems->Length();
    
    for (uint32_t i = 0; i < length; i++) {
        Local<Value> item = menuItems->Get(context, i).ToLocalChecked();
        if (item->IsObject()) {
            Local<Object> itemObj = Local<Object>::Cast(item);
            
            Local<Value> titleVal = itemObj->Get(context, String::NewFromUtf8(isolate, "title").ToLocalChecked()).ToLocalChecked();
            Local<Value> actionVal = itemObj->Get(context, String::NewFromUtf8(isolate, "action").ToLocalChecked()).ToLocalChecked();
            Local<Value> iconVal = itemObj->Get(context, String::NewFromUtf8(isolate, "icon").ToLocalChecked()).ToLocalChecked();
            
            if (titleVal->IsString() && actionVal->IsString()) {
                String::Utf8Value title(isolate, titleVal);
                String::Utf8Value action(isolate, actionVal);
                
                NSString* titleStr = [NSString stringWithUTF8String:*title];
                NSString* actionStr = [NSString stringWithUTF8String:*action];
                
                LLMMenuItem* menuItem = [[LLMMenuItem alloc] initWithTitle:titleStr
                                                                   action:@selector(menuAction:)
                                                            keyEquivalent:@""];
                menuItem.actionId = actionStr;
                menuItem.target = menuTarget;
                
                // Add icon if provided
                if (iconVal->IsString()) {
                    String::Utf8Value icon(isolate, iconVal);
                    NSString* iconStr = [NSString stringWithUTF8String:*icon];
                    
                    // Create system image if available (macOS 11+)
                    if (@available(macOS 11.0, *)) {
                        NSImage* image = [NSImage imageWithSystemSymbolName:iconStr accessibilityDescription:nil];
                        if (image) {
                            menuItem.image = image;
                        }
                    }
                }
                
                [contextMenu addItem:menuItem];
                [menuItem release];
            }
        }
    }
    
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

// Start listening for right-clicks
void StartListening(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (isListening) {
        args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
        return;
    }
    
    // Check for accessibility permissions
    if (!AXIsProcessTrusted()) {
        const void* keys[] = { kAXTrustedCheckOptionPrompt };
        const void* values[] = { kCFBooleanTrue };
        CFDictionaryRef options = CFDictionaryCreate(nullptr, keys, values, 1, nullptr, nullptr);
        AXIsProcessTrustedWithOptions(options);
        CFRelease(options);
        
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    // Create event tap for right-click detection
    CGEventMask eventMask = CGEventMaskBit(kCGEventRightMouseDown);
    rightClickTap = CGEventTapCreate(kCGSessionEventTap, kCGHeadInsertEventTap, kCGEventTapOptionDefault,
                                    eventMask, RightClickCallback, nullptr);
    
    if (!rightClickTap) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Failed to create right-click event tap").ToLocalChecked()));
        return;
    }
    
    // Create run loop source and add to run loop
    CFRunLoopSourceRef runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, rightClickTap, 0);
    CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource, kCFRunLoopCommonModes);
    CFRelease(runLoopSource);
    
    // Enable the event tap
    CGEventTapEnable(rightClickTap, true);
    
    isListening = true;
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

// Stop listening for right-clicks
void StopListening(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (!isListening) {
        args.GetReturnValue().Set(v8::Boolean::New(isolate, false));
        return;
    }
    
    if (rightClickTap) {
        CGEventTapEnable(rightClickTap, false);
        CFRelease(rightClickTap);
        rightClickTap = nullptr;
    }
    
    if (!menuCallback.IsEmpty()) {
        menuCallback.Reset();
    }
    
    isListening = false;
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

// Show context menu at specific location
void ShowContextMenu(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    if (args.Length() < 2 || !args[0]->IsNumber() || !args[1]->IsNumber()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected x and y coordinates").ToLocalChecked()));
        return;
    }
    
    if (!contextMenu) {
        args.GetReturnValue().Set(v8::Boolean::New(isolate, false));
        return;
    }
    
    double x = args[0]->NumberValue(context).FromMaybe(0);
    double y = args[1]->NumberValue(context).FromMaybe(0);
    
    // Convert screen coordinates to macOS coordinate system
    NSPoint nsPoint = NSMakePoint(x, CGDisplayPixelsHigh(kCGDirectMainDisplay) - y);
    
    // Get selected text if provided
    if (args.Length() > 2 && args[2]->IsString()) {
        String::Utf8Value text(isolate, args[2]);
        lastSelectedText = std::string(*text);
    }
    
    dispatch_async(dispatch_get_main_queue(), ^{
        [contextMenu popUpMenuPositioningItem:nil atLocation:nsPoint inView:nil];
    });
    
    args.GetReturnValue().Set(v8::Boolean::New(isolate, true));
}

// Initialize the module
void Initialize(Local<Object> exports, Local<Value> module, void* priv) {
    NODE_SET_METHOD(exports, "registerContextMenu", RegisterContextMenu);
    NODE_SET_METHOD(exports, "startListening", StartListening);
    NODE_SET_METHOD(exports, "stopListening", StopListening);
    NODE_SET_METHOD(exports, "showContextMenu", ShowContextMenu);
}

} // namespace context_menu

NODE_MODULE(NODE_GYP_MODULE_NAME, context_menu::Initialize)