#include "point.h"
#include "keyboard.h"

Napi::Object BESKeyboard::Init(Napi::Env env, Napi::Object exports)
{
    // This method is used to hook the accessor and method callbacks
    Napi::Function func = DefineClass(env, "BESKeyboard", {
       
    });

    // Napi::FunctionReference *constructor = new Napi::FunctionReference();
    // BESKeyboard::*constructor = Napi::Persistent(func);
    exports.Set("BESKeyboard", func);
    // env.SetInstanceData<Napi::FunctionReference>(constructor);
    return exports;
}

BESKeyboard::BESKeyboard(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BESKeyboard>(info) {}