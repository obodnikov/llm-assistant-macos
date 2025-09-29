#include <node.h>
#include <node_buffer.h>
#include <uv.h>
#include <v8.h>

#import <Cocoa/Cocoa.h>
#import <ApplicationServices/ApplicationServices.h>

using namespace v8;

namespace text_selection {

// Global variables for text selection monitoring
static Local<Function> selectionCallback;
static Isolate* isolate = nullptr;
static bool isMonitoring = false;
static CFMachPortRef eventTap = nullptr;

// Structure to hold selection data
struct SelectionData {
    std::string text;
    std::string appName;
    CGPoint location;
    bool hasSelection;
};

// Event tap callback for global text selection
CGEventRef EventTapCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void* refcon) {
    if (type == kCGEventMouseUp || type == kCGEventKeyUp) {
        // Get the currently selected text using Accessibility APIs
        SelectionData* data = new SelectionData();
        
        // Get frontmost application
        NSRunningApplication* frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
        data->appName = std::string([[frontApp localizedName] UTF8String]);
        
        // Get mouse location
        CGPoint mouseLocation = CGEventGetLocation(event);
        data->location = mouseLocation;
        
        // Get selected text via Accessibility API
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
                    if (textCString) {
                        data->text = std::string(textCString);
                        data->hasSelection = true;
                    } else {
                        // Fallback for when CFStringGetCStringPtr returns nullptr
                        CFIndex length = CFStringGetLength(selectedText);
                        CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
                        char* buffer = new char[maxSize];
                        if (CFStringGetCString(selectedText, buffer, maxSize, kCFStringEncodingUTF8)) {
                            data->text = std::string(buffer);
                            data->hasSelection = true;
                        }
                        delete[] buffer;
                    }
                    CFRelease(selectedText);
                } else {
                    data->hasSelection = false;
                }
                
                CFRelease(focusedElement);
            }
            CFRelease(focusedApp);
        }
        CFRelease(systemWideElement);
        
        // Schedule callback on main thread if we have text
        if (data->hasSelection && !data->text.empty()) {
            // Use libuv to schedule callback on main thread
            uv_async_t* async = new uv_async_t();
            async->data = data;
            uv_async_init(uv_default_loop(), async, [](uv_async_t* handle) {
                Isolate* isolate = Isolate::GetCurrent();
                HandleScope scope(isolate);
                
                SelectionData* data = static_cast<SelectionData*>(handle->data);
                
                if (!selectionCallback.IsEmpty()) {
                    Local<Context> context = isolate->GetCurrentContext();
                    Local<Object> result = Object::New(isolate);
                    
                    result->Set(context, String::NewFromUtf8(isolate, "text").ToLocalChecked(),
                               String::NewFromUtf8(isolate, data->text.c_str()).ToLocalChecked());
                    result->Set(context, String::NewFromUtf8(isolate, "appName").ToLocalChecked(),
                               String::NewFromUtf8(isolate, data->appName.c_str()).ToLocalChecked());
                    result->Set(context, String::NewFromUtf8(isolate, "x").ToLocalChecked(),
                               Number::New(isolate, data->location.x));
                    result->Set(context, String::NewFromUtf8(isolate, "y").ToLocalChecked(),
                               Number::New(isolate, data->location.y));
                    
                    Local<Value> argv[] = { result };
                    selectionCallback->Call(context, Null(isolate), 1, argv);
                }
                
                delete data;
                uv_close((uv_handle_t*)handle, [](uv_handle_t* handle) {
                    delete handle;
                });
            });
            uv_async_send(async);
        } else {
            delete data;
        }
    }
    
    return event;
}

// Start monitoring global text selection
void StartMonitoring(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (args.Length() != 1 || !args[0]->IsFunction()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected a callback function").ToLocalChecked()));
        return;
    }
    
    if (isMonitoring) {
        args.GetReturnValue().Set(Boolean::New(isolate, true));
        return;
    }
    
    // Store callback
    Local<Function> callback = Local<Function>::Cast(args[0]);
    selectionCallback = Global<Function>(isolate, callback);
    ::isolate = isolate;
    
    // Check for accessibility permissions
    if (!AXIsProcessTrusted()) {
        // Request accessibility permissions
        const void* keys[] = { kAXTrustedCheckOptionPrompt };
        const void* values[] = { kCFBooleanTrue };
        CFDictionaryRef options = CFDictionaryCreate(nullptr, keys, values, 1, nullptr, nullptr);
        AXIsProcessTrustedWithOptions(options);
        CFRelease(options);
        
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    // Create event tap
    CGEventMask eventMask = CGEventMaskBit(kCGEventMouseUp) | CGEventMaskBit(kCGEventKeyUp);
    eventTap = CGEventTapCreate(kCGSessionEventTap, kCGHeadInsertEventTap, kCGEventTapOptionDefault,
                               eventMask, EventTapCallback, nullptr);
    
    if (!eventTap) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Failed to create event tap").ToLocalChecked()));
        return;
    }
    
    // Create run loop source and add to run loop
    CFRunLoopSourceRef runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
    CFRunLoopAddSource(CFRunLoopGetMain(), runLoopSource, kCFRunLoopCommonModes);
    CFRelease(runLoopSource);
    
    // Enable the event tap
    CGEventTapEnable(eventTap, true);
    
    isMonitoring = true;
    args.GetReturnValue().Set(Boolean::New(isolate, true));
}

// Stop monitoring
void StopMonitoring(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (!isMonitoring) {
        args.GetReturnValue().Set(Boolean::New(isolate, false));
        return;
    }
    
    if (eventTap) {
        CGEventTapEnable(eventTap, false);
        CFRelease(eventTap);
        eventTap = nullptr;
    }
    
    if (!selectionCallback.IsEmpty()) {
        selectionCallback.Reset();
    }
    
    isMonitoring = false;
    args.GetReturnValue().Set(Boolean::New(isolate, true));
}

// Get currently selected text synchronously
void GetSelectedText(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    // Check accessibility permissions
    if (!AXIsProcessTrusted()) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    std::string selectedText = "";
    std::string appName = "";
    
    // Get frontmost application
    NSRunningApplication* frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
    appName = std::string([[frontApp localizedName] UTF8String]);
    
    // Get selected text via Accessibility API
    AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
    AXUIElementRef focusedApp = nullptr;
    AXUIElementRef focusedElement = nullptr;
    
    AXError error = AXUIElementCopyAttributeValue(systemWideElement, kAXFocusedApplicationAttribute, (CFTypeRef*)&focusedApp);
    if (error == kAXErrorSuccess && focusedApp) {
        error = AXUIElementCopyAttributeValue(focusedApp, kAXFocusedUIElementAttribute, (CFTypeRef*)&focusedElement);
        
        if (error == kAXErrorSuccess && focusedElement) {
            CFStringRef cfSelectedText = nullptr;
            error = AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextAttribute, (CFTypeRef*)&cfSelectedText);
            
            if (error == kAXErrorSuccess && cfSelectedText) {
                const char* textCString = CFStringGetCStringPtr(cfSelectedText, kCFStringEncodingUTF8);
                if (textCString) {
                    selectedText = std::string(textCString);
                } else {
                    CFIndex length = CFStringGetLength(cfSelectedText);
                    CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
                    char* buffer = new char[maxSize];
                    if (CFStringGetCString(cfSelectedText, buffer, maxSize, kCFStringEncodingUTF8)) {
                        selectedText = std::string(buffer);
                    }
                    delete[] buffer;
                }
                CFRelease(cfSelectedText);
            }
            CFRelease(focusedElement);
        }
        CFRelease(focusedApp);
    }
    CFRelease(systemWideElement);
    
    Local<Object> result = Object::New(isolate);
    result->Set(context, String::NewFromUtf8(isolate, "text").ToLocalChecked(),
               String::NewFromUtf8(isolate, selectedText.c_str()).ToLocalChecked());
    result->Set(context, String::NewFromUtf8(isolate, "appName").ToLocalChecked(),
               String::NewFromUtf8(isolate, appName.c_str()).ToLocalChecked());
    
    args.GetReturnValue().Set(result);
}

// Initialize the module
void Initialize(Local<Object> exports) {
    NODE_SET_METHOD(exports, "startMonitoring", StartMonitoring);
    NODE_SET_METHOD(exports, "stopMonitoring", StopMonitoring);
    NODE_SET_METHOD(exports, "getSelectedText", GetSelectedText);
}

} // namespace text_selection

NODE_MODULE(NODE_GYP_MODULE_NAME, text_selection::Initialize)