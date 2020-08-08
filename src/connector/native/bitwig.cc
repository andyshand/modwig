#include "bitwig.h"
#include "string.h"
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>

AXUIElementRef cachedRef;

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

pid_t GetPID() {
    // Go through all on screen windows, find BW
    CFArrayRef array = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
    CFIndex count = CFArrayGetCount(array);
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef dict = (CFDictionaryRef)CFArrayGetValueAtIndex(array, i);
        auto str = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowOwnerName));
        if (str == "Bitwig Studio") {
            CFNumberRef ownerPidRef = (CFNumberRef) CFDictionaryGetValue(dict, kCGWindowOwnerPID);
            pid_t ownerPid;
            CFNumberGetValue(ownerPidRef, kCFNumberSInt32Type, &ownerPid);
            return ownerPid;
        }
    }
    return -1;
}

AXUIElementRef GetAXUIElement() {
    if (cachedRef != NULL) {
        // Try to get a property so we can check if our ref is invalid
        CFBooleanRef isFrontmost;
        AXError result = AXUIElementCopyAttributeValue(cachedRef, kAXFrontmostAttribute, (CFTypeRef*) &isFrontmost);
        if (result != kAXErrorInvalidUIElement) {
            return cachedRef;
        } else {
            CFRelease(cachedRef);
        }
    }

    auto pid = GetPID();
    if (pid == -1) {
        return NULL;
    }
    cachedRef = AXUIElementCreateApplication(pid);
    return cachedRef;
}

Napi::Value IsActiveApplication(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto element = GetAXUIElement();
    if (!element) {
        return Napi::Boolean::New(env, false);
    }
    CFBooleanRef isFrontmost;
    AXUIElementCopyAttributeValue(element, kAXFrontmostAttribute, (CFTypeRef*) &isFrontmost);
    return Napi::Boolean::New(env, isFrontmost == kCFBooleanTrue);
}

Napi::Value InitBitwig(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "isActiveApplication"), Napi::Function::New(env, IsActiveApplication));
    exports.Set("Bitwig", obj);
    return exports;
}