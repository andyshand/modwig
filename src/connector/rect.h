#pragma once
#include <napi.h>
#include <CoreGraphics/CoreGraphics.h>

class BESRect : public Napi::ObjectWrap<BESRect>
{
public:
    CGFloat _x, _y, _w, _h;   
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
    CGRect asCGRect() {
        return CGRectMake(_x, _y, _w, _h);
    }
};