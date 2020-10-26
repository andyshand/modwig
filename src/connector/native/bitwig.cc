#include "bitwig.h"
#include "string.h"
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <iostream>
#include <string>
#include <cstddef>
#include <map>
#include <vector>

AXUIElementRef cachedBitwigRef;
AXUIElementRef cachedPluginHostRef;
pid_t pluginHostPID = -1;
pid_t bitwigPID = -1;

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

bool pidIsAlive(pid_t pid)  {
    return 0 == kill(pid, 0);
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

AXUIElementRef GetPluginAXUIElement() {
    if (pluginHostPID == -1 || !pidIsAlive(pluginHostPID)) {
        if (cachedPluginHostRef != NULL) {
            CFRelease(cachedPluginHostRef);
            cachedPluginHostRef = NULL;
        }
        pluginHostPID = GetPID("Bitwig Plug-in Host 64");
        if (pluginHostPID != -1) {
            cachedPluginHostRef = AXUIElementCreateApplication(pluginHostPID);
        }
    }
    return cachedPluginHostRef;
}

void tileWindowsForAXUIElement(AXUIElementRef elementRef) {
    if (elementRef != NULL) {
        CFArrayRef windowArray = nil;
        AXUIElementCopyAttributeValue(elementRef, kAXWindowsAttribute, (CFTypeRef*)&windowArray);
        if (windowArray != nil) { 
            CFIndex nItems = CFArrayGetCount(windowArray);
            CGFloat startX = 400;
            CGFloat x = startX, y = 153;
            CGFloat nextRowY = y;
            auto mainDisplayId = CGMainDisplayID();
            CGFloat screenWidth = CGDisplayPixelsWide(mainDisplayId);
            for (int i = 0; i < nItems; i++) {
                AXUIElementRef itemRef = (AXUIElementRef) CFArrayGetValueAtIndex(windowArray, i);

                CFTypeRef position;
                CFTypeRef size;
                CGPoint positionPoint;
                CGSize sizePoint;
                AXUIElementCopyAttributeValue(itemRef, kAXPositionAttribute, (CFTypeRef *)&position);
                AXValueGetValue((AXValueRef)position, (AXValueType)kAXValueCGPointType, &positionPoint);
                AXUIElementCopyAttributeValue(itemRef, kAXSizeAttribute, (CFTypeRef *)&size);
                AXValueGetValue((AXValueRef)size, (AXValueType)kAXValueCGSizeType, &sizePoint);

                CGPoint newPoint;
                if (x + sizePoint.width > screenWidth) {
                    // next row
                    x = startX;
                    y = nextRowY;
                }

                newPoint.x = x;
                newPoint.y = y;
                position = (CFTypeRef)(AXValueCreate((AXValueType)kAXValueCGPointType, (const void *)&newPoint));
                AXUIElementSetAttributeValue(itemRef, kAXPositionAttribute, position);

                x += sizePoint.width;
                nextRowY = fmaxf(nextRowY, y + sizePoint.height);
            }

            CFRelease(windowArray);
        }
    }
}

void smartTileWindowsForAXUIElement(AXUIElementRef elementRef, bool offscreen) {
    if (elementRef != NULL) {
        CFArrayRef windowArray = nil;
        std::map<std::string,std::vector<AXUIElementRef>> windowsByChain;
        AXUIElementCopyAttributeValue(elementRef, kAXWindowsAttribute, (CFTypeRef*)&windowArray);
        if (windowArray != nil) { 
            CFIndex nItems = CFArrayGetCount(windowArray);
            CGFloat startX = 400;
            CGFloat x = startX, y = 153;
            CGFloat nextRowY = y;
            auto mainDisplayId = CGMainDisplayID();
            std::string delimiter = "/";

            CGFloat screenWidth = CGDisplayPixelsWide(mainDisplayId);
            CGFloat screenHeight = CGDisplayPixelsHigh(mainDisplayId);
            for (int i = 0; i < nItems; i++) {
                AXUIElementRef itemRef = (AXUIElementRef) CFArrayGetValueAtIndex(windowArray, i);
                CFStringRef titleRef;
                AXUIElementCopyAttributeValue(itemRef, kAXTitleAttribute, (CFTypeRef *) &titleRef);
                auto windowTitle = CFStringToString((CFStringRef)titleRef);
              
                auto lastSeparator = windowTitle.find_last_of(delimiter);
                auto chain = windowTitle.substr(0, lastSeparator);
                if (windowsByChain.count(chain) == 0) {
                    windowsByChain[chain] = std::vector<AXUIElementRef>();
                } 
                windowsByChain[chain].push_back(itemRef);
            }
            std::map<std::string,std::vector<AXUIElementRef>>::iterator it;
            for ( it = windowsByChain.begin(); it != windowsByChain.end(); it++ )
            {
                auto windowsVector = it->second;
                std::vector<AXUIElementRef>::iterator vecIt;
                for(auto itemRef : windowsVector)  {
                    CGPoint newPoint;
                    CFTypeRef position;
                    CFTypeRef size;
                    CGPoint positionPoint;
                    CGSize sizePoint;

                    if (!offscreen) {
                        AXUIElementCopyAttributeValue(itemRef, kAXPositionAttribute, (CFTypeRef *)&position);
                        AXValueGetValue((AXValueRef)position, (AXValueType)kAXValueCGPointType, &positionPoint);
                        AXUIElementCopyAttributeValue(itemRef, kAXSizeAttribute, (CFTypeRef *)&size);
                        AXValueGetValue((AXValueRef)size, (AXValueType)kAXValueCGSizeType, &sizePoint);

                        if (x + sizePoint.width > screenWidth) {
                            // next row
                            x = startX;
                            y = nextRowY;
                        }
                    } else {
                        x = screenWidth - 1;
                        y = screenHeight - 1;
                    }
                    
                    newPoint.x = x;
                    newPoint.y = y;
                    position = (CFTypeRef)(AXValueCreate((AXValueType)kAXValueCGPointType, (const void *)&newPoint));
                    AXUIElementSetAttributeValue(itemRef, kAXPositionAttribute, position);

                    if (!offscreen) {
                        x += sizePoint.width;
                        nextRowY = fmaxf(nextRowY, y + sizePoint.height);
                    }
                }
                y = nextRowY;
                x = startX;
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

Napi::Value TileFloatingWindows(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    smartTileWindowsForAXUIElement(GetPluginAXUIElement(), false);
    return Napi::Boolean::New(env, true);
}

Napi::Value HideFloatingWindows(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    smartTileWindowsForAXUIElement(GetPluginAXUIElement(), true);
    return Napi::Boolean::New(env, true);
}

Napi::Value InitBitwig(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "isActiveApplication"), Napi::Function::New(env, IsActiveApplication));
    obj.Set(Napi::String::New(env, "isPluginWindowActive"), Napi::Function::New(env, IsPluginWindowActive));
    obj.Set(Napi::String::New(env, "makeMainWindowActive"), Napi::Function::New(env, MakeMainWindowActive));
    obj.Set(Napi::String::New(env, "closeFloatingWindows"), Napi::Function::New(env, CloseFloatingWindows));
    obj.Set(Napi::String::New(env, "tileFloatingWindows"), Napi::Function::New(env, TileFloatingWindows));
    obj.Set(Napi::String::New(env, "hideFloatingWindows"), Napi::Function::New(env, HideFloatingWindows));
    obj.Set(Napi::String::New(env, "isAccessibilityEnabled"), Napi::Function::New(env, AccessibilityEnabled));
    exports.Set("Bitwig", obj);
    return exports;
}