#include "point.h"
#include "events.h"
#include "eventsource.h"

Napi::Value on(const Napi::CallbackInfo &info);
Napi::Value off(const Napi::CallbackInfo &info);
Napi::Value isEnabled(const Napi::CallbackInfo &info);
Napi::Value keyDown(const Napi::CallbackInfo &info);
Napi::Value keyUp(const Napi::CallbackInfo &info);
Napi::Value keyPress(const Napi::CallbackInfo &info);

Napi::Value InitKeyboardOS(Napi::Env env, Napi::Object exports);

Napi::Value InitKeyboard(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "on"), Napi::Function::New(env, on));
    obj.Set(Napi::String::New(env, "off"), Napi::Function::New(env, off));
    obj.Set(Napi::String::New(env, "isEnabled"), Napi::Function::New(env, isEnabled));
    obj.Set(Napi::String::New(env, "keyDown"), Napi::Function::New(env, keyDown));
    obj.Set(Napi::String::New(env, "keyUp"), Napi::Function::New(env, keyUp));
    obj.Set(Napi::String::New(env, "keyPress"), Napi::Function::New(env, keyPress));
    InitKeyboardOS(env, exports);
    exports.Set("Keyboard", obj);
    return exports;
}