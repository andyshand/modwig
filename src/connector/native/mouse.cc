#include "point.h"
#include "mouse.h"
#include "eventsource.h"
#include <iostream>

Napi::Value GetMousePosition(const Napi::CallbackInfo &info);
Napi::Value SetMousePosition(const Napi::CallbackInfo &info);
Napi::Value MouseDown(const Napi::CallbackInfo &info);
Napi::Value MouseUp(const Napi::CallbackInfo &info);
Napi::Value Click(const Napi::CallbackInfo &info);
Napi::Value DoubleClick(const Napi::CallbackInfo &info);

Napi::Object InitMouse(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "getPosition"), Napi::Function::New(env, GetMousePosition));
    obj.Set(Napi::String::New(env, "setPosition"), Napi::Function::New(env, SetMousePosition));
    obj.Set(Napi::String::New(env, "up"), Napi::Function::New(env, MouseUp));
    obj.Set(Napi::String::New(env, "down"), Napi::Function::New(env, MouseDown));
    obj.Set(Napi::String::New(env, "click"), Napi::Function::New(env, Click));
    obj.Set(Napi::String::New(env, "doubleClick"), Napi::Function::New(env, DoubleClick));
    exports.Set("Mouse", obj);
    return exports;
}