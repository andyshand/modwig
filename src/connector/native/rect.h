#pragma once
#include <napi.h>

#if defined(IS_MACOS)
    #include <CoreGraphics/CoreGraphics.h>
#endif

class BESRect : public Napi::ObjectWrap<BESRect>
{
public:
    #if defined(IS_MACOS)
        CGFloat _x, _y, _w, _h;   
    #elif defined(IS_WINDOWS)
        float _x, _y, _w, _h;
    #endif
    
    static Napi::FunctionReference constructor;
    Napi::Value GetX(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, _x);
    }
    Napi::Value GetY(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, _y);
    }
    Napi::Value GetW(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, _w);
    }
    Napi::Value GetH(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, _h);
    }
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    BESRect(const Napi::CallbackInfo &info);

    #if defined(IS_MACOS)
        static Napi::Object FromCGRect(const Napi::Env env, CGRect cgRect);
        CGRect asCGRect() {
            return CGRectMake(_x, _y, _w, _h);
        }
    #endif
};