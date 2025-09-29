#include <node.h>
#include <uv.h>
#include <v8.h>

#import <Cocoa/Cocoa.h>
#import <ApplicationServices/ApplicationServices.h>

using namespace v8;

namespace accessibility {

// Helper function to convert CFStringRef to std::string
std::string CFStringToString(CFStringRef cfString) {
    if (!cfString) return "";
    
    const char* cString = CFStringGetCStringPtr(cfString, kCFStringEncodingUTF8);
    if (cString) {
        return std::string(cString);
    }
    
    CFIndex length = CFStringGetLength(cfString);
    CFIndex maxSize = CFStringGetMaximumSizeForEncoding(length, kCFStringEncodingUTF8) + 1;
    char* buffer = new char[maxSize];
    bool success = CFStringGetCString(cfString, buffer, maxSize, kCFStringEncodingUTF8);
    std::string result = success ? std::string(buffer) : "";
    delete[] buffer;
    return result;
}

// Check if process has accessibility permissions
void CheckAccessibilityPermissions(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    bool hasPermissions = AXIsProcessTrusted();
    args.GetReturnValue().Set(Boolean::New(isolate, hasPermissions));
}

// Request accessibility permissions
void RequestAccessibilityPermissions(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    const void* keys[] = { kAXTrustedCheckOptionPrompt };
    const void* values[] = { kCFBooleanTrue };
    CFDictionaryRef options = CFDictionaryCreate(nullptr, keys, values, 1, nullptr, nullptr);
    bool hasPermissions = AXIsProcessTrustedWithOptions(options);
    CFRelease(options);
    
    args.GetReturnValue().Set(Boolean::New(isolate, hasPermissions));
}

// Get frontmost application info
void GetFrontmostApplication(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    NSRunningApplication* frontApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
    
    Local<Object> result = Object::New(isolate);
    
    if (frontApp) {
        result->Set(context, String::NewFromUtf8(isolate, "name").ToLocalChecked(),
                   String::NewFromUtf8(isolate, [[frontApp localizedName] UTF8String]).ToLocalChecked());
        result->Set(context, String::NewFromUtf8(isolate, "bundleId").ToLocalChecked(),
                   String::NewFromUtf8(isolate, [[frontApp bundleIdentifier] UTF8String]).ToLocalChecked());
        result->Set(context, String::NewFromUtf8(isolate, "pid").ToLocalChecked(),
                   Number::New(isolate, [frontApp processIdentifier]));
    }
    
    args.GetReturnValue().Set(result);
}

// Get window information for a specific application
void GetApplicationWindows(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    if (args.Length() != 1 || !args[0]->IsNumber()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected process ID").ToLocalChecked()));
        return;
    }
    
    if (!AXIsProcessTrusted()) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    pid_t pid = args[0]->Int32Value(context).FromMaybe(0);
    
    AXUIElementRef appElement = AXUIElementCreateApplication(pid);
    CFArrayRef windows = nullptr;
    
    AXError error = AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute, (CFTypeRef*)&windows);
    
    Local<Array> windowsArray = Array::New(isolate);
    
    if (error == kAXErrorSuccess && windows) {
        CFIndex windowCount = CFArrayGetCount(windows);
        
        for (CFIndex i = 0; i < windowCount; i++) {
            AXUIElementRef window = (AXUIElementRef)CFArrayGetValueAtIndex(windows, i);
            Local<Object> windowInfo = Object::New(isolate);
            
            // Get window title
            CFStringRef title = nullptr;
            if (AXUIElementCopyAttributeValue(window, kAXTitleAttribute, (CFTypeRef*)&title) == kAXErrorSuccess && title) {
                std::string titleStr = CFStringToString(title);
                windowInfo->Set(context, String::NewFromUtf8(isolate, "title").ToLocalChecked(),
                               String::NewFromUtf8(isolate, titleStr.c_str()).ToLocalChecked());
                CFRelease(title);
            }
            
            // Get window position
            CFTypeRef position = nullptr;
            if (AXUIElementCopyAttributeValue(window, kAXPositionAttribute, &position) == kAXErrorSuccess && position) {
                CGPoint point;
                if (AXValueGetValue((AXValueRef)position, kAXValueCGPointType, &point)) {
                    Local<Object> pos = Object::New(isolate);
                    pos->Set(context, String::NewFromUtf8(isolate, "x").ToLocalChecked(), Number::New(isolate, point.x));
                    pos->Set(context, String::NewFromUtf8(isolate, "y").ToLocalChecked(), Number::New(isolate, point.y));
                    windowInfo->Set(context, String::NewFromUtf8(isolate, "position").ToLocalChecked(), pos);
                }
                CFRelease(position);
            }
            
            // Get window size
            CFTypeRef size = nullptr;
            if (AXUIElementCopyAttributeValue(window, kAXSizeAttribute, &size) == kAXErrorSuccess && size) {
                CGSize cgSize;
                if (AXValueGetValue((AXValueRef)size, kAXValueCGSizeType, &cgSize)) {
                    Local<Object> sizeObj = Object::New(isolate);
                    sizeObj->Set(context, String::NewFromUtf8(isolate, "width").ToLocalChecked(), Number::New(isolate, cgSize.width));
                    sizeObj->Set(context, String::NewFromUtf8(isolate, "height").ToLocalChecked(), Number::New(isolate, cgSize.height));
                    windowInfo->Set(context, String::NewFromUtf8(isolate, "size").ToLocalChecked(), sizeObj);
                }
                CFRelease(size);
            }
            
            // Check if window is focused
            CFTypeRef focused = nullptr;
            if (AXUIElementCopyAttributeValue(window, kAXFocusedAttribute, &focused) == kAXErrorSuccess && focused) {
                Boolean isFocused = false;
                if (CFBooleanGetValue((CFBooleanRef)focused)) {
                    isFocused = true;
                }
                windowInfo->Set(context, String::NewFromUtf8(isolate, "focused").ToLocalChecked(), Boolean::New(isolate, isFocused));
                CFRelease(focused);
            }
            
            windowsArray->Set(context, i, windowInfo);
        }
        
        CFRelease(windows);
    }
    
    CFRelease(appElement);
    args.GetReturnValue().Set(windowsArray);
}

// Get focused element and its properties
void GetFocusedElement(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    if (!AXIsProcessTrusted()) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
    AXUIElementRef focusedApp = nullptr;
    AXUIElementRef focusedElement = nullptr;
    
    Local<Object> result = Object::New(isolate);
    
    // Get focused application
    AXError error = AXUIElementCopyAttributeValue(systemWideElement, kAXFocusedApplicationAttribute, (CFTypeRef*)&focusedApp);
    if (error == kAXErrorSuccess && focusedApp) {
        // Get focused element
        error = AXUIElementCopyAttributeValue(focusedApp, kAXFocusedUIElementAttribute, (CFTypeRef*)&focusedElement);
        
        if (error == kAXErrorSuccess && focusedElement) {
            // Get element role
            CFStringRef role = nullptr;
            if (AXUIElementCopyAttributeValue(focusedElement, kAXRoleAttribute, (CFTypeRef*)&role) == kAXErrorSuccess && role) {
                std::string roleStr = CFStringToString(role);
                result->Set(context, String::NewFromUtf8(isolate, "role").ToLocalChecked(),
                           String::NewFromUtf8(isolate, roleStr.c_str()).ToLocalChecked());
                CFRelease(role);
            }
            
            // Get element value (text content)
            CFStringRef value = nullptr;
            if (AXUIElementCopyAttributeValue(focusedElement, kAXValueAttribute, (CFTypeRef*)&value) == kAXErrorSuccess && value) {
                std::string valueStr = CFStringToString(value);
                result->Set(context, String::NewFromUtf8(isolate, "value").ToLocalChecked(),
                           String::NewFromUtf8(isolate, valueStr.c_str()).ToLocalChecked());
                CFRelease(value);
            }
            
            // Get selected text
            CFStringRef selectedText = nullptr;
            if (AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextAttribute, (CFTypeRef*)&selectedText) == kAXErrorSuccess && selectedText) {
                std::string selectedStr = CFStringToString(selectedText);
                result->Set(context, String::NewFromUtf8(isolate, "selectedText").ToLocalChecked(),
                           String::NewFromUtf8(isolate, selectedStr.c_str()).ToLocalChecked());
                CFRelease(selectedText);
            }
            
            // Get text range
            CFTypeRef selectedRange = nullptr;
            if (AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextRangeAttribute, &selectedRange) == kAXErrorSuccess && selectedRange) {
                CFRange range;
                if (AXValueGetValue((AXValueRef)selectedRange, kAXValueCFRangeType, &range)) {
                    Local<Object> rangeObj = Object::New(isolate);
                    rangeObj->Set(context, String::NewFromUtf8(isolate, "location").ToLocalChecked(), Number::New(isolate, range.location));
                    rangeObj->Set(context, String::NewFromUtf8(isolate, "length").ToLocalChecked(), Number::New(isolate, range.length));
                    result->Set(context, String::NewFromUtf8(isolate, "selectedRange").ToLocalChecked(), rangeObj);
                }
                CFRelease(selectedRange);
            }
            
            CFRelease(focusedElement);
        }
        CFRelease(focusedApp);
    }
    CFRelease(systemWideElement);
    
    args.GetReturnValue().Set(result);
}

// Set text in focused element
void SetFocusedElementText(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (args.Length() != 1 || !args[0]->IsString()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected text string").ToLocalChecked()));
        return;
    }
    
    if (!AXIsProcessTrusted()) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    String::Utf8Value text(isolate, args[0]);
    CFStringRef cfText = CFStringCreateWithCString(kCFAllocatorDefault, *text, kCFStringEncodingUTF8);
    
    AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
    AXUIElementRef focusedApp = nullptr;
    AXUIElementRef focusedElement = nullptr;
    
    bool success = false;
    
    AXError error = AXUIElementCopyAttributeValue(systemWideElement, kAXFocusedApplicationAttribute, (CFTypeRef*)&focusedApp);
    if (error == kAXErrorSuccess && focusedApp) {
        error = AXUIElementCopyAttributeValue(focusedApp, kAXFocusedUIElementAttribute, (CFTypeRef*)&focusedElement);
        
        if (error == kAXErrorSuccess && focusedElement) {
            // Try to set the value attribute
            error = AXUIElementSetAttributeValue(focusedElement, kAXValueAttribute, cfText);
            success = (error == kAXErrorSuccess);
            
            CFRelease(focusedElement);
        }
        CFRelease(focusedApp);
    }
    CFRelease(systemWideElement);
    CFRelease(cfText);
    
    args.GetReturnValue().Set(Boolean::New(isolate, success));
}

// Insert text at cursor position
void InsertTextAtCursor(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    
    if (args.Length() != 1 || !args[0]->IsString()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected text string").ToLocalChecked()));
        return;
    }
    
    if (!AXIsProcessTrusted()) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    String::Utf8Value text(isolate, args[0]);
    CFStringRef cfText = CFStringCreateWithCString(kCFAllocatorDefault, *text, kCFStringEncodingUTF8);
    
    AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
    AXUIElementRef focusedApp = nullptr;
    AXUIElementRef focusedElement = nullptr;
    
    bool success = false;
    
    AXError error = AXUIElementCopyAttributeValue(systemWideElement, kAXFocusedApplicationAttribute, (CFTypeRef*)&focusedApp);
    if (error == kAXErrorSuccess && focusedApp) {
        error = AXUIElementCopyAttributeValue(focusedApp, kAXFocusedUIElementAttribute, (CFTypeRef*)&focusedElement);
        
        if (error == kAXErrorSuccess && focusedElement) {
            // Get current selected range
            CFTypeRef selectedRange = nullptr;
            if (AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextRangeAttribute, &selectedRange) == kAXErrorSuccess && selectedRange) {
                // Use AXUIElementSetAttributeValue to insert text
                error = AXUIElementSetAttributeValue(focusedElement, kAXSelectedTextAttribute, cfText);
                success = (error == kAXErrorSuccess);
                CFRelease(selectedRange);
            }
            
            CFRelease(focusedElement);
        }
        CFRelease(focusedApp);
    }
    CFRelease(systemWideElement);
    CFRelease(cfText);
    
    args.GetReturnValue().Set(Boolean::New(isolate, success));
}

// Simulate key press
void SimulateKeyPress(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    if (args.Length() < 1 || !args[0]->IsNumber()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected key code").ToLocalChecked()));
        return;
    }
    
    CGKeyCode keyCode = args[0]->Uint32Value(context).FromMaybe(0);
    bool withCommand = args.Length() > 1 && args[1]->BooleanValue(isolate);
    bool withShift = args.Length() > 2 && args[2]->BooleanValue(isolate);
    bool withOption = args.Length() > 3 && args[3]->BooleanValue(isolate);
    bool withControl = args.Length() > 4 && args[4]->BooleanValue(isolate);
    
    CGEventFlags flags = 0;
    if (withCommand) flags |= kCGEventFlagMaskCommand;
    if (withShift) flags |= kCGEventFlagMaskShift;
    if (withOption) flags |= kCGEventFlagMaskAlternate;
    if (withControl) flags |= kCGEventFlagMaskControl;
    
    // Create key down event
    CGEventRef keyDown = CGEventCreateKeyboardEvent(nullptr, keyCode, true);
    if (flags) CGEventSetFlags(keyDown, flags);
    
    // Create key up event
    CGEventRef keyUp = CGEventCreateKeyboardEvent(nullptr, keyCode, false);
    if (flags) CGEventSetFlags(keyUp, flags);
    
    // Post events
    CGEventPost(kCGHIDEventTap, keyDown);
    CGEventPost(kCGHIDEventTap, keyUp);
    
    CFRelease(keyDown);
    CFRelease(keyUp);
    
    args.GetReturnValue().Set(Boolean::New(isolate, true));
}

// Get element at point
void GetElementAtPoint(const FunctionCallbackInfo<Value>& args) {
    Isolate* isolate = args.GetIsolate();
    Local<Context> context = isolate->GetCurrentContext();
    
    if (args.Length() != 2 || !args[0]->IsNumber() || !args[1]->IsNumber()) {
        isolate->ThrowException(Exception::TypeError(
            String::NewFromUtf8(isolate, "Expected x and y coordinates").ToLocalChecked()));
        return;
    }
    
    if (!AXIsProcessTrusted()) {
        isolate->ThrowException(Exception::Error(
            String::NewFromUtf8(isolate, "Accessibility permissions required").ToLocalChecked()));
        return;
    }
    
    double x = args[0]->NumberValue(context).FromMaybe(0);
    double y = args[1]->NumberValue(context).FromMaybe(0);
    
    AXUIElementRef systemWideElement = AXUIElementCreateSystemWide();
    AXUIElementRef elementAtPoint = nullptr;
    
    Local<Object> result = Object::New(isolate);
    
    AXError error = AXUIElementCopyElementAtPosition(systemWideElement, x, y, &elementAtPoint);
    if (error == kAXErrorSuccess && elementAtPoint) {
        // Get element role
        CFStringRef role = nullptr;
        if (AXUIElementCopyAttributeValue(elementAtPoint, kAXRoleAttribute, (CFTypeRef*)&role) == kAXErrorSuccess && role) {
            std::string roleStr = CFStringToString(role);
            result->Set(context, String::NewFromUtf8(isolate, "role").ToLocalChecked(),
                       String::NewFromUtf8(isolate, roleStr.c_str()).ToLocalChecked());
            CFRelease(role);
        }
        
        // Get element description
        CFStringRef description = nullptr;
        if (AXUIElementCopyAttributeValue(elementAtPoint, kAXDescriptionAttribute, (CFTypeRef*)&description) == kAXErrorSuccess && description) {
            std::string descStr = CFStringToString(description);
            result->Set(context, String::NewFromUtf8(isolate, "description").ToLocalChecked(),
                       String::NewFromUtf8(isolate, descStr.c_str()).ToLocalChecked());
            CFRelease(description);
        }
        
        CFRelease(elementAtPoint);
    }
    
    CFRelease(systemWideElement);
    args.GetReturnValue().Set(result);
}

// Initialize the module
void Initialize(Local<Object> exports) {
    NODE_SET_METHOD(exports, "checkAccessibilityPermissions", CheckAccessibilityPermissions);
    NODE_SET_METHOD(exports, "requestAccessibilityPermissions", RequestAccessibilityPermissions);
    NODE_SET_METHOD(exports, "getFrontmostApplication", GetFrontmostApplication);
    NODE_SET_METHOD(exports, "getApplicationWindows", GetApplicationWindows);
    NODE_SET_METHOD(exports, "getFocusedElement", GetFocusedElement);
    NODE_SET_METHOD(exports, "setFocusedElementText", SetFocusedElementText);
    NODE_SET_METHOD(exports, "insertTextAtCursor", InsertTextAtCursor);
    NODE_SET_METHOD(exports, "simulateKeyPress", SimulateKeyPress);
    NODE_SET_METHOD(exports, "getElementAtPoint", GetElementAtPoint);
}

} // namespace accessibility

NODE_MODULE(NODE_GYP_MODULE_NAME, accessibility::Initialize)