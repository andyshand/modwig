#include "bitwig.h"
#include "string.h"
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>

AXUIElementRef cachedBitwigRef;
AXUIElementRef cachedPluginHostRef;

bool AccessibilityEnabled() {
    auto dict = CFDictionaryCreate(NULL, 
        (const void **)&kAXTrustedCheckOptionPrompt, 
        (const void **)&kCFBooleanTrue, 
        1, 
        &kCFTypeDictionaryKeyCallBacks, 
        &kCFTypeDictionaryValueCallBacks
    );
    bool trusted = AXIsProcessTrustedWithOptions(dict);
    CFRelease(dict);
    return trusted;
}

pid_t GetPID(std::string name) {
    // Go through all on screen windows, find BW
    CFArrayRef array = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
    CFIndex count = CFArrayGetCount(array);
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef dict = (CFDictionaryRef)CFArrayGetValueAtIndex(array, i);
        auto str = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowOwnerName));
        if (str == name) {
            CFNumberRef ownerPidRef = (CFNumberRef) CFDictionaryGetValue(dict, kCGWindowOwnerPID);
            pid_t ownerPid;
            CFNumberGetValue(ownerPidRef, kCFNumberSInt32Type, &ownerPid);
            return ownerPid;
        }
    }
    return -1;
}

AXUIElementRef GetAXUIElement(std::string name) {
    auto pid = GetPID(name);
    if (pid == -1) {
        return NULL;
    }
    return AXUIElementCreateApplication(pid);
}

bool refIsValidOrRelease(AXUIElementRef cachedRef) {
    if (cachedRef != NULL) {
        // Try to get a property so we can check if our ref is invalid
        CFBooleanRef isFrontmost;
        AXError result = AXUIElementCopyAttributeValue(cachedRef, kAXFrontmostAttribute, (CFTypeRef*) &isFrontmost);
        if (result != kAXErrorInvalidUIElement) {
            return true;
        } else {
            CFRelease(cachedRef);
            return false;
        }
    }
    return false;
}

AXUIElementRef GetBitwigAXUIElement() {
    if (!refIsValidOrRelease(cachedBitwigRef)) {
        cachedBitwigRef = GetAXUIElement("Bitwig Studio");
    }
    return cachedBitwigRef;
}

AXUIElementRef GetPluginAXUIElement() {
    if (!refIsValidOrRelease(cachedPluginHostRef)) {
        cachedPluginHostRef = GetAXUIElement("Bitwig Plug-in Host 64");
    }
    return cachedPluginHostRef;
}

void closeWindowsForAXUIElement(AXUIElementRef elementRef) {
    if (elementRef != NULL) {
        CFArrayRef windowArray = nil;
        AXUIElementCopyAttributeValue(elementRef, kAXWindowsAttribute, (CFTypeRef*)&windowArray);
        if (windowArray != nil) { 
            CFIndex nItems = CFArrayGetCount(windowArray);
            for (int i = 0; i < nItems; i++) {
                AXUIElementRef itemRef = (AXUIElementRef) CFArrayGetValueAtIndex(windowArray, i);
                AXUIElementRef buttonRef = nil;

                AXUIElementCopyAttributeValue(itemRef, kAXCloseButtonAttribute, (CFTypeRef*)&buttonRef);
                AXUIElementPerformAction(buttonRef, kAXPressAction);
                CFRelease(buttonRef);
            }

            CFRelease(windowArray);
        }
    }
}

bool isAXUIElementActiveApp(AXUIElementRef element) {
    if (!element) {
        return false;
    }
    CFBooleanRef isFrontmost;
    AXUIElementCopyAttributeValue(element, kAXFrontmostAttribute, (CFTypeRef*) &isFrontmost);
    return isFrontmost == kCFBooleanTrue;
}

Napi::Value IsActiveApplication(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(
        env, 
        isAXUIElementActiveApp(GetBitwigAXUIElement()) || isAXUIElementActiveApp(GetPluginAXUIElement())
    );
}

Napi::Value IsPluginWindowActive(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(
        env, 
        isAXUIElementActiveApp(GetPluginAXUIElement())
    );
}

Napi::Value CloseFloatingWindows(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    closeWindowsForAXUIElement(GetPluginAXUIElement());
    return Napi::Boolean::New(env, true);
}

Napi::Value InitBitwig(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "isActiveApplication"), Napi::Function::New(env, IsActiveApplication));
    obj.Set(Napi::String::New(env, "isPluginWindowActive"), Napi::Function::New(env, IsPluginWindowActive));
    obj.Set(Napi::String::New(env, "closeFloatingWindows"), Napi::Function::New(env, CloseFloatingWindows));
    exports.Set("Bitwig", obj);
    return exports;
}