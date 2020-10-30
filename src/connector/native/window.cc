#include "point.h"
#include "window.h"
#include "rect.h"

#include <CoreGraphics/CoreGraphics.h>
#include <napi.h>
#include <iostream>
#include <string>
#include "string.h"

Napi::Value GetFrame(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    // Go through all on screen windows, find BW, get its frame
    CFArrayRef array = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
    CFIndex count = CFArrayGetCount(array);
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef dict = (CFDictionaryRef)CFArrayGetValueAtIndex(array, i);
        auto str = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowOwnerName));
        if (str == "Bitwig Studio") {
            CGRect windowRect;
            CGRectMakeWithDictionaryRepresentation((CFDictionaryRef)(CFDictionaryGetValue(dict, kCGWindowBounds)), &windowRect);
            // TODO Lazy symbol binding fails here.. why?
            // return BESRect::FromCGRect(env, windowRect);
            if (windowRect.size.height < 100) {
                // Bitwig opens a separate window for its tooltips, ignore this window
                // TODO Revisit better way of only getting the main window
                continue;
            }
            return BESRect::constructor.New({ 
                Napi::Number::New(env, windowRect.origin.x), 
                Napi::Number::New(env, windowRect.origin.y), // TODO account for menu bar?
                Napi::Number::New(env, windowRect.size.width), 
                Napi::Number::New(env, windowRect.size.height)
            });
        }
    }
    return env.Null();
}

Napi::Value GetMainScreen(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto mainDisplayId = CGMainDisplayID();
    CGFloat screenWidth = CGDisplayPixelsWide(mainDisplayId);
    CGFloat screenHeight = CGDisplayPixelsHigh(mainDisplayId);
    
    auto obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, screenWidth));
    obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, screenHeight));
    return obj;
}

Napi::Value ClosePluginWindows(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    // Go through all on screen windows, find BW, get its frame
    CFArrayRef array = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
    CFIndex count = CFArrayGetCount(array);
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef dict = (CFDictionaryRef)CFArrayGetValueAtIndex(array, i);
        auto str = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowOwnerName));
        auto windowName = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowName));
        if (str == "Bitwig Studio") {
            
            std::cout << "window name: " << windowName << std::endl;
        }
    }
    return env.Null();
}

Napi::Value InitWindow(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "getFrame"), Napi::Function::New(env, GetFrame));
    obj.Set(Napi::String::New(env, "getMainScreen"), Napi::Function::New(env, GetMainScreen));
    obj.Set(Napi::String::New(env, "closePluginWindows"), Napi::Function::New(env, ClosePluginWindows));
    exports.Set("MainWindow", obj);
    return exports;
}