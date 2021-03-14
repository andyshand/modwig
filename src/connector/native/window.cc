#include <napi.h>
#include <iostream>
#include <string>
#include "point.h"
#include "window.h"
#include "rect.h"
#include "string.h"

#if defined(IS_MACOS)
    #include <CoreGraphics/CoreGraphics.h>
#elif defined(IS_WINDOWS)

#endif

Napi::Value GetMainScreen(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto obj = Napi::Object::New(env);

    #if defined(IS_MACOS)
        auto mainDisplayId = CGMainDisplayID();
        CGFloat screenWidth = CGDisplayPixelsWide(mainDisplayId);
        CGFloat screenHeight = CGDisplayPixelsHigh(mainDisplayId);
        
        obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, screenWidth));
        obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, screenHeight));
    #endif
    return obj;
}

Napi::Value InitWindow(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "getMainScreen"), Napi::Function::New(env, GetMainScreen));
    exports.Set("MainWindow", obj);
    return exports;
}