#pragma once

class BESKeyboard : public Napi::ObjectWrap<BESKeyboard>
{
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    BESKeyboard(const Napi::CallbackInfo &info);
};