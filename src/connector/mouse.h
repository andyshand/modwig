#pragma once

class BESMouse : public Napi::ObjectWrap<BESMouse> 
{
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    BESMouse(const Napi::CallbackInfo &info);
    static Napi::Value GetMousePosition(const Napi::CallbackInfo &info);
    static Napi::Value SetMousePosition(const Napi::CallbackInfo &info);
    static Napi::Value MouseDown(const Napi::CallbackInfo &info);
    static Napi::Value MouseUp(const Napi::CallbackInfo &info);
    static Napi::Value Click(const Napi::CallbackInfo &info);
};