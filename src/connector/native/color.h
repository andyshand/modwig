#pragma once

#include "napi.h"

class BESColor : public Napi::ObjectWrap<BESColor>
{
public:
    int _r, _g, _b;   
    static Napi::FunctionReference constructor;
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "BESColor", {
            InstanceAccessor<&BESColor::GetR>("r"),
            InstanceAccessor<&BESColor::GetG>("g"),
            InstanceAccessor<&BESColor::GetB>("b"),
        });
        // Napi::FunctionReference *constructor = new Napi::FunctionReference();
        BESColor::constructor = Napi::Persistent(func);
        BESColor::constructor.SuppressDestruct();
        exports.Set("BESColor", func);
        // env.SetInstanceData<Napi::FunctionReference>(BESColor::constructor);
        return exports;
    }
    BESColor(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BESColor>(info) {
        _r = info[0].As<Napi::Number>();
        _g = info[1].As<Napi::Number>();
        _b = info[2].As<Napi::Number>();
    }
    Napi::Value GetR(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, _r);
    }
    Napi::Value GetG(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, _g);
    }
    Napi::Value GetB(const Napi::CallbackInfo &info) {
        Napi::Env env = info.Env();
        return Napi::Number::New(env, _b);
    }
};