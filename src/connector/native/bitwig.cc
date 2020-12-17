#include "bitwig.h"
#include "string.h"
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <iostream>
#include <string>
#include <cstddef>
#include <map>
#include <vector>
using namespace std::string_literals;

AXUIElementRef cachedBitwigRef;
AXUIElementRef cachedPluginHostRef;
pid_t pluginHostPID = -1;
pid_t bitwigPID = -1;
struct AppData {
    AXUIElementRef ref;
    pid_t pid;
};
std::map<std::string,AppData> appDataByProcessName = {};

bool pidIsAlive(pid_t pid)  {
    return 0 == kill(pid, 0);
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

AXUIElementRef findAXUIElementByName(std::string name) {
    if (!appDataByProcessName.count(name)) {
        auto pid = GetPID(name);
        if (pid == -1) {
            return NULL;
        }
        auto ref = AXUIElementCreateApplication(pid);
        appDataByProcessName[name] = AppData({
            ref,
            pid
        });
        return ref;
    } else {
        auto data = appDataByProcessName[name];
        if (!pidIsAlive(data.pid)) {
            appDataByProcessName.erase(name);
            // Try again
            return findAXUIElementByName(name);
        }
        return data.ref;
    }
}

AXUIElementRef GetBitwigAXUIElement() {
    if (bitwigPID == -1 || !pidIsAlive(bitwigPID)) {
        if (cachedPluginHostRef != NULL) {
            CFRelease(cachedBitwigRef);
            cachedBitwigRef = NULL;
        }
        bitwigPID = GetPID("Bitwig Studio");
        if (bitwigPID != -1) {
            cachedBitwigRef = AXUIElementCreateApplication(bitwigPID);
        }
    }
    return cachedBitwigRef;
}

Napi::Value AccessibilityEnabled(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    bool notify = info[0].As<Napi::Boolean>();
    auto dict = CFDictionaryCreate(NULL, 
        (const void **)&kAXTrustedCheckOptionPrompt, 
        (const void **)(notify ? &kCFBooleanTrue : &kCFBooleanFalse), 
        1, 
        &kCFTypeDictionaryKeyCallBacks, 
        &kCFTypeDictionaryValueCallBacks
    );
    bool trusted = AXIsProcessTrustedWithOptions(dict);
    CFRelease(dict);

    return Napi::Boolean::New(
        env, 
        trusted
    );
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

AXUIElementRef GetPluginAXUIElement() {
    if (pluginHostPID == -1 || !pidIsAlive(pluginHostPID)) {
        if (cachedPluginHostRef != NULL) {
            CFRelease(cachedPluginHostRef);
            cachedPluginHostRef = NULL;
        }
        pluginHostPID = GetPID("Bitwig Plug-in Host 64");
        if (pluginHostPID == -1) {
            pluginHostPID = GetPID("Bitwig Studio Engine");
        }
        if (pluginHostPID != -1) {
            cachedPluginHostRef = AXUIElementCreateApplication(pluginHostPID);
        }
    }
    return cachedPluginHostRef;
}

Napi::Value GetPluginWindowsPosition(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto elementRef = GetPluginAXUIElement();
    Napi::Object outObj = Napi::Object::New(env);
    if (elementRef != NULL) {
        CFArrayRef windowArray = nil;
        AXUIElementCopyAttributeValue(elementRef, kAXWindowsAttribute, (CFTypeRef*)&windowArray);
        if (windowArray != nil) { 
            CFIndex nItems = CFArrayGetCount(windowArray);
            for (int i = 0; i < nItems; i++) {
                AXUIElementRef itemRef = (AXUIElementRef) CFArrayGetValueAtIndex(windowArray, i);
                CFTypeRef position;
                CFTypeRef size;
                CGPoint positionPoint;
                CGSize sizePoint;
                CFStringRef titleRef;
                AXUIElementCopyAttributeValue(itemRef, kAXPositionAttribute, (CFTypeRef *)&position);
                AXValueGetValue((AXValueRef)position, (AXValueType)kAXValueCGPointType, &positionPoint);
                AXUIElementCopyAttributeValue(itemRef, kAXSizeAttribute, (CFTypeRef *)&size);
                AXValueGetValue((AXValueRef)size, (AXValueType)kAXValueCGSizeType, &sizePoint);
                AXUIElementCopyAttributeValue(itemRef, kAXTitleAttribute, (CFTypeRef *) &titleRef);
                auto windowTitle = CFStringToString((CFStringRef)titleRef);
                
                auto obj = Napi::Object::New(env);
                obj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, positionPoint.x));
                obj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, positionPoint.y));
                obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, sizePoint.width));
                obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, sizePoint.height));
                obj.Set(Napi::String::New(env, "id"), Napi::String::New(env, windowTitle));
                outObj.Set(Napi::String::New(env, windowTitle), obj);
            }
            CFRelease(windowArray);
            return outObj;
        }
    }
    return outObj;
}

Napi::Value SetPluginWindowsPosition(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto inObject = info[0].As<Napi::Object>();
    auto elementRef = GetPluginAXUIElement();

    if (elementRef != NULL) {
        CFArrayRef windowArray = nil;
        AXUIElementCopyAttributeValue(elementRef, kAXWindowsAttribute, (CFTypeRef*)&windowArray);
        if (windowArray != nil) { 
            CFIndex nItems = CFArrayGetCount(windowArray);
            for (int i = 0; i < nItems; i++) {
                AXUIElementRef itemRef = (AXUIElementRef) CFArrayGetValueAtIndex(windowArray, i);
                CFStringRef titleRef;
                AXUIElementCopyAttributeValue(itemRef, kAXTitleAttribute, (CFTypeRef *) &titleRef);
                auto windowTitle = CFStringToString((CFStringRef)titleRef);

                auto posForWindow = inObject.Get(windowTitle).As<Napi::Object>();
                CGPoint newPoint;
                newPoint.x = posForWindow.Get("x").As<Napi::Number>();
                newPoint.y = posForWindow.Get("y").As<Napi::Number>();
                auto position = (CFTypeRef)(AXValueCreate((AXValueType)kAXValueCGPointType, (const void *)&newPoint));
                AXUIElementSetAttributeValue(itemRef, kAXPositionAttribute, position);
            }
            CFRelease(windowArray);
        }
    }
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
    if (info[0].IsString()) {
        auto axUIEl = findAXUIElementByName(info[0].As<Napi::String>());
        return Napi::Boolean::New(
            env, 
            isAXUIElementActiveApp(axUIEl)
        );
    }
    return Napi::Boolean::New(
        env, 
        isAXUIElementActiveApp(GetBitwigAXUIElement()) || isAXUIElementActiveApp(GetPluginAXUIElement())
    );
}

Napi::Value MakeMainWindowActive(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto uiEl = GetBitwigAXUIElement();
    auto success = false;
    if (uiEl != NULL) {
        AXUIElementSetAttributeValue(uiEl, kAXFrontmostAttribute, kCFBooleanTrue);
        success = true;
    }
    return Napi::Boolean::New(
        env, 
        success
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
    obj.Set(Napi::String::New(env, "makeMainWindowActive"), Napi::Function::New(env, MakeMainWindowActive));
    obj.Set(Napi::String::New(env, "closeFloatingWindows"), Napi::Function::New(env, CloseFloatingWindows));
    obj.Set(Napi::String::New(env, "isAccessibilityEnabled"), Napi::Function::New(env, AccessibilityEnabled));
    obj.Set(Napi::String::New(env, "getPluginWindowsPosition"), Napi::Function::New(env, GetPluginWindowsPosition));
    obj.Set(Napi::String::New(env, "setPluginWindowsPosition"), Napi::Function::New(env, SetPluginWindowsPosition));
    exports.Set("Bitwig", obj);
    return exports;
}