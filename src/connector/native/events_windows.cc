#include <windows.h>
#include <napi.h>
#include "events.h"

CallbackInfo* addEventListener(EventListenerSpec spec) {
    CallbackInfo *ourInfo = new CallbackInfo;
    return ourInfo;
}

/// Note that mousemove events seem to get fired when mouse is clicked too - TODO investigate
Napi::Value on(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    // auto eventType = info[0].As<Napi::String>().Utf8Value();
    // auto cb = info[1].As<Napi::Function>();
    // auto ourInfo = addEventListener(EventListenerSpec({
    //     eventType,
    //     nullptr,
    //     &cb,
    //     env
    // }));
    // return Napi::Number::New(env, ourInfo->id);
    return Napi::Number::New(env, 1);
}

Napi::Value off(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    // int id = info[0].As<Napi::Number>();
    // m.lock();
    // callbacks.remove_if([=](CallbackInfo *e){ 
    //     bool willRemove = e->id == id;     
    //     if (willRemove) {
    //         // free it
    //         delete e;
    //     }
    //     return willRemove;
    // });
    // m.unlock();
    return Napi::Boolean::New(env, true);
}

Napi::Value isEnabled(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    // int id = info[0].As<Napi::Number>();

    // auto it = std::find_if (callbacks.begin(), callbacks.end(), [=](CallbackInfo *e){ 
    //     return e->id == id;
    // });
    // if (it != callbacks.end()) {
    //     CallbackInfo* info = *it;
    //     return Napi::Boolean::New(env, CGEventTapIsEnabled(info->tap));
    // }
    return Napi::Boolean::New(env, false);
}

Napi::Value keyPresser(const Napi::CallbackInfo &info, bool down) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, true);
}

Napi::Value keyDown(const Napi::CallbackInfo &info) {
    return keyPresser(info, true);
}

Napi::Value keyUp(const Napi::CallbackInfo &info) {
    return keyPresser(info, false);
}

Napi::Value keyPress(const Napi::CallbackInfo &info) {
    keyDown(info);
    Sleep(10000);
    return keyUp(info);
}