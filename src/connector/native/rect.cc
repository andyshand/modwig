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

static Napi::Object FromCGRect(const Napi::Env env, CGRect cgRect) {
    return BESRect::constructor.New({ 
        Napi::Number::New(env, cgRect.origin.x), 
        Napi::Number::New(env, cgRect.origin.y), 
        Napi::Number::New(env, cgRect.size.width), 
        Napi::Number::New(env, cgRect.size.height)
    });
}

Napi::Object BESRect::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "BESRect", {
        InstanceAccessor<&BESRect::GetX>("x"),
        InstanceAccessor<&BESRect::GetY>("y"),
        InstanceAccessor<&BESRect::GetW>("w"),
        InstanceAccessor<&BESRect::GetH>("h"),
    });

    BESRect::constructor = Napi::Persistent(func);
    
    // Constructor is created on stack, but we want to keep it around
    // https://github.com/nodejs/node-addon-api/issues/550
    //
    // "Simply put, the v8 engine works with reference counting for garbage collection. 
    // The Napi::Function func constructor function is created on the stack inside the Init method, 
    // but it stored statically in constructor. We need to tell the engine that we are still using 
    // this value even after Init finishes, which is why we store it in a reference.
    //
    // Classes that extend Reference have a destructor to call napi_delete_reference on themselves unless SupressDestruct() has been called."
    BESRect::constructor.SuppressDestruct();

    exports.Set("BESRect", func);
    return exports;
}
