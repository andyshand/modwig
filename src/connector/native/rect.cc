#include <napi.h>
#include "rect.h"

Napi::FunctionReference BESRect::constructor;

BESRect::BESRect(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BESRect>(info) {
    // Napi::Env env = info.Env();
    _x = info[0].As<Napi::Number>().DoubleValue();
    _y = info[1].As<Napi::Number>().DoubleValue();
    _w = info[2].As<Napi::Number>().DoubleValue();
    _h = info[3].As<Napi::Number>().DoubleValue();
}

Napi::Object BESRect::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "BESRect", {
        InstanceAccessor<&BESRect::GetX>("x"),
        InstanceAccessor<&BESRect::GetY>("y"),
        InstanceAccessor<&BESRect::GetW>("w"),
        InstanceAccessor<&BESRect::GetH>("h"),
    });
    // Napi::FunctionReference *constructor = new Napi::FunctionReference();
    BESRect::constructor = Napi::Persistent(func);
    exports.Set("BESRect", func);
    // env.SetInstanceData<Napi::FunctionReference>(BESRect::constructor);
    return exports;
}
