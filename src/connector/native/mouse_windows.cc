#include <napi.h>
#include <windows.h>
#include "point.h"

int SLEEP_TIME = 2000;

Napi::Value GetMousePosition(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    POINT point;
    GetCursorPos(&point);
    return BESPoint::constructor.New({  
        Napi::Number::New(env, point.x),
        Napi::Number::New(env, point.y)
    });
}

Napi::Value SetMousePosition(const Napi::CallbackInfo &info)
{
    // Napi::Env env = info.Env();
    Napi::Number x = info[0].As<Napi::Number>();
    Napi::Number y = info[1].As<Napi::Number>();
    INPUT mouseInput = {0};
    mouseInput.type = INPUT_MOUSE;
    mouseInput.mi.dx = x.LongValue();
    mouseInput.mi.dy = y.LongValue();
    mouseInput.mi.dwFlags = MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE | MOUSEEVENTF_VIRTUALDESK;
    mouseInput.mi.time = 0;
    SendInput(1, &mouseInput, sizeof(mouseInput));
    return Napi::Value();
}

void mouseUpDown(const Napi::CallbackInfo &info, bool down, bool doubleClick = false) {
    bool modwigListeners = false;
    Napi::Object options = info[1].As<Napi::Object>();
    int button = info[0].As<Napi::Number>();

    if (info[1].IsObject()) {
        // We got options
        modwigListeners = options.Has("modwigListeners") && options.Get("modwigListeners").As<Napi::Boolean>();
    }

    INPUT mouseInput;
    DWORD dwFlags;
    mouseInput.type = INPUT_MOUSE;
    // Assumed relative unless MOUSEEVENTF_ABSOLUTE in flags
    mouseInput.mi.dx = 0;
    mouseInput.mi.dy = 0;
    if (options.Has("x")) {
        mouseInput.mi.dx = (LONG)options.Get("x").As<Napi::Number>().LongValue();
        dwFlags |= MOUSEEVENTF_ABSOLUTE;
    }
    if (options.Has("y")) {
        mouseInput.mi.dy = (LONG)options.Get("y").As<Napi::Number>().LongValue();
        dwFlags |= MOUSEEVENTF_ABSOLUTE;
    }
    if (button == 0) {
        dwFlags |= down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
    } else if (button == 1) {
        dwFlags |= down ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP;
    } else if (button == 2) {
        dwFlags |= down ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
    }
    mouseInput.mi.time = 0;
    mouseInput.mi.dwExtraInfo = 0;
    mouseInput.mi.mouseData = 0;
    SendInput(1, &mouseInput, sizeof(mouseInput));
}

Napi::Value MouseDown(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true);
    return Napi::Value();
}

Napi::Value MouseUp(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, false);
    return Napi::Value();
}

Napi::Value Click(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true);
    Sleep(SLEEP_TIME);
    mouseUpDown(info, false);
    return Napi::Value();
}

Napi::Value DoubleClick(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true, true);
    Sleep(SLEEP_TIME);
    mouseUpDown(info, false, true);
    return Napi::Value();
}