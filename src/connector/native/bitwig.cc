#include "bitwig.h"
#include "string.h"
#include "events.h"

Napi::Value IsActiveApplication(const Napi::CallbackInfo &info);
Napi::Value IsPluginWindowActive(const Napi::CallbackInfo &info);
Napi::Value MakeMainWindowActive(const Napi::CallbackInfo &info);
Napi::Value CloseFloatingWindows(const Napi::CallbackInfo &info);
Napi::Value AccessibilityEnabled(const Napi::CallbackInfo &info);
Napi::Value GetPluginWindowsPosition(const Napi::CallbackInfo &info);
Napi::Value SetPluginWindowsPosition(const Napi::CallbackInfo &info);
Napi::Value FocusPluginWindow(const Napi::CallbackInfo &info);
Napi::Value GetPluginWindowsCount(const Napi::CallbackInfo &info);
Napi::Value GetAudioEnginePid(const Napi::CallbackInfo &info);
Napi::Value GetPid(const Napi::CallbackInfo &info);

Napi::Value InitBitwig(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);

    #if defined(IS_MACOS)
    addEventListener(EventListenerSpec{
        "mouseup",
        [](JSEvent* event) -> void {
            activeAppDirty = true;
        },
        nullptr,
        nullptr
    });

    addEventListener(EventListenerSpec{
        "keyup",
        [](JSEvent* event) -> void {
            activeAppDirty = true;
        },
        nullptr,
        nullptr
    });
    #endif

    obj.Set("isActiveApplication", Napi::Function::New(env, IsActiveApplication));
    obj.Set("isPluginWindowActive", Napi::Function::New(env, IsPluginWindowActive));
    obj.Set("makeMainWindowActive", Napi::Function::New(env, MakeMainWindowActive));
    obj.Set("closeFloatingWindows", Napi::Function::New(env, CloseFloatingWindows));
    obj.Set("isAccessibilityEnabled", Napi::Function::New(env, AccessibilityEnabled));
    obj.Set("getPluginWindowsPosition", Napi::Function::New(env, GetPluginWindowsPosition));
    obj.Set("setPluginWindowsPosition", Napi::Function::New(env, SetPluginWindowsPosition));
    obj.Set("focusPluginWindow", Napi::Function::New(env, FocusPluginWindow));
    obj.Set("getPluginWindowsCount", Napi::Function::New(env, GetPluginWindowsCount));
    obj.Set("getAudioEnginePid", Napi::Function::New(env, GetAudioEnginePid));
    obj.Set("getPid", Napi::Function::New(env, GetPid));
    exports.Set("Bitwig", obj);
    return exports;
}