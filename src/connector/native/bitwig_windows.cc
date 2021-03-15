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
    static auto childWindowWorker = [&](HWND hWnd, LPARAM lParam) -> BOOL {
        char buff[255];
        RECT rect;
        GetWindowText(hWnd, (LPSTR) buff, 254);
        GetWindowRect(hWnd, &rect);     
        auto obj = Napi::Object::New(env);
        obj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, rect.left));
        obj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, rect.top));
        obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, rect.right - rect.left));
        obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, rect.top - rect.bottom));
        obj.Set(Napi::String::New(env, "id"), Napi::String::New(env, buff));
        outObj.Set(Napi::String::New(env, buff), obj);
        return FALSE;
    };
    EnumWindows([](HWND hWnd, LPARAM lParam) -> BOOL {
        char buff[255];
        GetWindowText(hWnd, (LPSTR) buff, 254);
        if (strcmp(buff, "BitwigPluginHost64.exe")) {
            EnumChildWindows(hWnd, [](HWND hWnd, LPARAM lParam) -> BOOL {
                return childWindowWorker(hWnd, lParam);
            }, 0);
            return FALSE;
        }
        // continue the enumeration
        return TRUE; 
    }, 0);
    return outObj;
}

Napi::Value GetPluginWindowsCount(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    return Napi::Number::New(env, 0);
}

Napi::Value SetPluginWindowsPosition(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto inObject = info[0].As<Napi::Object>();
    static auto childWindowWorker = [&](HWND hWnd, LPARAM lParam) -> BOOL {
        char buff[255];
        RECT rect;
        GetWindowText(hWnd, (LPSTR) buff, 254);
        auto posForWindow = inObject.Get(buff).As<Napi::Object>();
        GetWindowRect(hWnd, &rect);     
        SetWindowPos(hWnd, 
            HWND_NOTOPMOST, 
            posForWindow.Get("x").As<Napi::Number>(),
            posForWindow.Get("y").As<Napi::Number>(),
            rect.right - rect.left,
            rect.bottom - rect.top,
            0
        );
        return FALSE;
    };
    EnumWindows([](HWND hWnd, LPARAM lParam) -> BOOL {
        char buff[255];
        GetWindowText(hWnd, (LPSTR) buff, 254);
        if (strcmp(buff, "BitwigPluginHost64.exe")) {
            EnumChildWindows(hWnd, [](HWND hWnd, LPARAM lParam) -> BOOL {
                return childWindowWorker(hWnd, lParam);
            }, 0);
            return FALSE;
        }
        // continue the enumeration
        return TRUE; 
    }, 0);
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
    EnumWindows([](HWND hWnd, LPARAM lParam) -> BOOL {
        char buff[255];
        GetWindowText(hWnd, (LPSTR) buff, 254);
        if (strcmp(buff, "BitwigPluginHost64.exe")) {
            EnumChildWindows(hWnd, [](HWND hWnd, LPARAM lParam) -> BOOL {
                SendMessage(hWnd, WM_CLOSE, NULL, NULL);
                return FALSE;
            }, 0);
            return FALSE;
        }
        // continue the enumeration
        return TRUE; 
    }, 0);
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