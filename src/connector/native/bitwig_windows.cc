#include <iostream>
#include <string>
#include <cstddef>
#include <atomic>
#include <map>
#include <vector>
#include <napi.h>
#include <windows.h>

using namespace std::string_literals;

Napi::Value AccessibilityEnabled(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(
        env, 
        true
    );
}

Napi::Value GetPluginWindowsPosition(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::Object outObj = Napi::Object::New(env);
    return outObj;
}

Napi::Value GetPluginWindowsCount(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, 0);
}

Napi::Value SetPluginWindowsPosition(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto inObject = info[0].As<Napi::Object>();
    return Napi::Value();
}

Napi::Value FocusPluginWindow(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string id = info[0].As<Napi::String>();
    return Napi::Value();
}

bool isAppActive(std::string app) {
    return false;
}

bool isBitwigActive() {
    return isAppActive("Bitwig Studio");
}

bool isPluginWindowActive() {
    return isAppActive("Bitwig Plug-in Host 64") || isAppActive("Bitwig Studio Engine");
}

Napi::Value IsActiveApplication(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (info[0].IsString()) {
        return Napi::Boolean::New(
            env, 
            isAppActive(info[0].As<Napi::String>())
        );
    }
    return Napi::Boolean::New(
        env, 
        isBitwigActive() || isPluginWindowActive()
    );
}

Napi::Value MakeMainWindowActive(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(
        env, 
        false
    );
}

Napi::Value IsPluginWindowActive(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(
        env, 
        isPluginWindowActive()
    );
}

Napi::Value CloseFloatingWindows(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Boolean::New(env, true);
}

Napi::Value GetAudioEnginePid(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, -1);
}

Napi::Value GetPid(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, -1);
}