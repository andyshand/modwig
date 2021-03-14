#include <napi.h>
#include <windows.h>
#include "point.h"

int SLEEP_TIME = 2000;

Napi::Value GetMousePosition(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    return BESPoint::constructor.New({ 
        Napi::Number::New(env, 0),
        Napi::Number::New(env, 0)
    });
}

Napi::Value SetMousePosition(const Napi::CallbackInfo &info)
{
    // Napi::Env env = info.Env();
    Napi::Number x = info[0].As<Napi::Number>();
    Napi::Number y = info[1].As<Napi::Number>();
    return Napi::Value();
}

void mouseUpDown(const Napi::CallbackInfo &info, bool down, bool doubleClick = false) {
    bool modwigListeners = false;
    
    if (info[1].IsObject()) {
        // We got options
        Napi::Object options = info[1].As<Napi::Object>();
        if (options.Has("Meta")) {
            
        }
        if (options.Has("Control")) {
            
        }
        if (options.Has("Shift")) {
            
        }
        if (options.Has("Alt")) {
            
        }
        
        if (options.Has("x")) {
            
        }
        if (options.Has("y")) {
            
        }
        modwigListeners = options.Has("modwigListeners") && options.Get("modwigListeners").As<Napi::Boolean>();
    }
}

Napi::Value MouseDown(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true);
    return Napi::Value();
}

Napi::Value MouseUp(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, false);
    return Napi::Value();
}

Napi::Value Click(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true);
    Sleep(SLEEP_TIME);
    mouseUpDown(info, false);
    return Napi::Value();
}

Napi::Value DoubleClick(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true, true);
    Sleep(SLEEP_TIME);
    mouseUpDown(info, false, true);
    return Napi::Value();
}