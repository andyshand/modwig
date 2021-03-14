#include <iostream>
#include <string>
#include <cstddef>
#include <atomic>
#include <map>
#include <vector>
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
using namespace std::string_literals;

struct AppData {
    AXUIElementRef ref;
    pid_t pid;
};
std::map<std::string,AppData> appDataByProcessName = {};

std::string activeApp;
std::atomic<bool> activeAppDirty(true);

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
            CFRelease(array);
            return ownerPid;
        }
    }
    CFRelease(array);
    return -1;
}

AXUIElementRef findAXUIElementByName(std::string name) {
    if (!appDataByProcessName.count(name)) {
        auto pid = GetPID(name);
        if (pid == -1) {
            return NULL;
        }
        auto ref = AXUIElementCreateApplication(pid);
        if (ref != NULL) {
            appDataByProcessName[name] = AppData({
                ref,
                pid
            });
        }
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
    return findAXUIElementByName("Bitwig Studio");
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

AXUIElementRef GetPluginAXUIElement() {
    auto separateProcess = findAXUIElementByName("Bitwig Plug-in Host 64");
    return separateProcess != NULL ? separateProcess : findAXUIElementByName("Bitwig Studio Engine");
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
                CFBooleanRef isFocused;
                AXUIElementCopyAttributeValue(itemRef, kAXPositionAttribute, (CFTypeRef *)&position);
                AXValueGetValue((AXValueRef)position, (AXValueType)kAXValueCGPointType, &positionPoint);
                AXUIElementCopyAttributeValue(itemRef, kAXSizeAttribute, (CFTypeRef *)&size);
                AXValueGetValue((AXValueRef)size, (AXValueType)kAXValueCGSizeType, &sizePoint);
                AXUIElementCopyAttributeValue(itemRef, kAXTitleAttribute, (CFTypeRef *) &titleRef);
                AXUIElementCopyAttributeValue(itemRef, kAXFocusedAttribute, (CFTypeRef*) &isFocused);
                auto windowTitle = CFStringToString((CFStringRef)titleRef);
                if (outObj.Has(windowTitle)) {
                    windowTitle = windowTitle + " (duplicate)";
                }
                
                auto obj = Napi::Object::New(env);
                obj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, positionPoint.x));
                obj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, positionPoint.y));
                obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, sizePoint.width));
                obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, sizePoint.height));
                obj.Set(Napi::String::New(env, "id"), Napi::String::New(env, windowTitle));
                obj.Set(Napi::String::New(env, "focused"), Napi::Boolean::New(env, isFocused == kCFBooleanTrue));
                outObj.Set(Napi::String::New(env, windowTitle), obj);
            }
            CFRelease(windowArray);
            return outObj;
        }
    }
    return outObj;
}

Napi::Value GetPluginWindowsCount(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto inObject = info[0].As<Napi::Object>();
    auto elementRef = GetPluginAXUIElement();
    if (elementRef != NULL) {
        CFArrayRef windowArray = nil;
        AXUIElementCopyAttributeValue(elementRef, kAXWindowsAttribute, (CFTypeRef*)&windowArray);
        if (windowArray != nil) { 
            CFIndex nItems = CFArrayGetCount(windowArray);
            CFRelease(windowArray);
            return Napi::Number::New(env, nItems);
        }
    }
    return Napi::Number::New(env, 0);
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

Napi::Value FocusPluginWindow(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string id = info[0].As<Napi::String>();
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
                if (id == windowTitle) {
                    AXUIElementSetAttributeValue(elementRef, kAXFrontmostAttribute, kCFBooleanTrue);
                    AXUIElementSetAttributeValue(itemRef, kAXMainAttribute, kCFBooleanTrue);
                    break;
                }
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

bool isAppActive(std::string app) {
    if (!activeAppDirty) {
        return activeApp == app;
    }
    auto axUIEl = findAXUIElementByName(app);
    auto active = isAXUIElementActiveApp(axUIEl);
    if (active) {
        activeApp = app;
    }
    return active;
}

bool isBitwigActive() {
    return isAppActive("Bitwig Studio");
}

bool isPluginWindowActive() {
    return isAppActive("Bitwig Plug-in Host 64") || isAppActive("Bitwig Studio Engine");
}

Napi::Value IsActiveApplication(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (info[0].IsString()) {
        return Napi::Boolean::New(
            env, 
            isAppActive(info[0].As<Napi::String>())
        );
    }
    return Napi::Boolean::New(
        env, 
        isBitwigActive() || isPluginWindowActive()
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
        isPluginWindowActive()
    );
}

Napi::Value CloseFloatingWindows(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    closeWindowsForAXUIElement(GetPluginAXUIElement());
    return Napi::Boolean::New(env, true);
}

Napi::Value GetAudioEnginePid(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto pluginAXUIElement = GetPluginAXUIElement();
    if (appDataByProcessName.count("Bitwig Plug-in Host 64") == 1) {
        return Napi::Number::New(env, appDataByProcessName["Bitwig Plug-in Host 64"].pid);
    } else if (appDataByProcessName.count("Bitwig Studio Engine") == 1) {
        return Napi::Number::New(env, appDataByProcessName["Bitwig Studio Engine"].pid);
    }
    return Napi::Number::New(env, -1);
}

Napi::Value GetPid(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto pluginAXUIElement = GetBitwigAXUIElement();
    if (appDataByProcessName.count("Bitwig Studio") == 1) {
        return Napi::Number::New(env, appDataByProcessName["Bitwig Studio"].pid);
    }
    return Napi::Number::New(env, -1);
}