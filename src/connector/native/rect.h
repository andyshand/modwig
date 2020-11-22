#pragma once
#include <napi.h>

#if defined(IS_MACOSX)
    #include <CoreGraphics/CoreGraphics.h>
#endif

class BESRect : public Napi::ObjectWrap<BESRect>
{
public:
#if defined(IS_MACOSX)
    CGFloat _x, _y, _w, _h;   
#elif defined(IS_WINDOWS)
    double _x, _y, _w, _h;
#endif
    static Napi::FunctionReference constructor;
    Napi::Value GetX(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        #if defined(IS_MACOSX)
            return Napi::Number::New(env, _x);
        #elif defined(IS_WINDOWS)
            return Napi::Number::New(env, 0);
        #endif
    }
    Napi::Value GetY(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        #if defined(IS_MACOSX)
            return Napi::Number::New(env, _y);
        #elif defined(IS_WINDOWS)
            return Napi::Number::New(env, 0);
        #endif
    }
    Napi::Value GetW(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        #if defined(IS_MACOSX)
            return Napi::Number::New(env, _w);
        #elif defined(IS_WINDOWS)
            return Napi::Number::New(env, 0);
        #endif
    }
    Napi::Value GetH(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        #if defined(IS_MACOSX)
            return Napi::Number::New(env, _h);
        #elif defined(IS_WINDOWS)
            return Napi::Number::New(env, 0);
        #endif
    }
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    BESRect(const Napi::CallbackInfo &info);
    #if defined(IS_MACOSX)
        static Napi::Object FromCGRect(const Napi::Env env, CGRect cgRect);
        CGRect asCGRect() {
            return CGRectMake(_x, _y, _w, _h);
        }
    #endif
};