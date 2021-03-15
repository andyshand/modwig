#include <windows.h>
#include <napi.h>
#include <thread>
#include "events.h"

bool threadSetup = false;
std::thread nativeThread;

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

LRESULT CALLBACK WindowProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    std::cout << "Got something" << uMsg <<  std::endl;

    if (uMsg == WM_COPYDATA)
      std::cout << "Got a message!" << std::endl;

    return DefWindowProc(hWnd, uMsg, wParam, lParam);
}

typedef int (__cdecl *MYPROC)(HWND); 

Napi::Value InitKeyboardOS(Napi::Env env, Napi::Object exports) {
    nativeThread = std::thread( [=] {
        HINSTANCE hInstance = GetModuleHandle(0);
        WNDCLASS windowClass = {};
        windowClass.lpfnWndProc = WindowProc;
        windowClass.lpszClassName = "FoobarMessageOnlyWindow";
        if (!RegisterClass(&windowClass)) {
            std::cout << "Failed to register window class" << std::endl;
            return 1;
        }
        HWND messageWindow = CreateWindowA("FoobarMessageOnlyWindow", 0, 0, 0, 0, 0, 0, HWND_MESSAGE, 0, 0, 0);
        if (!messageWindow) {
            std::cout << "Failed to create message-only window" << std::endl;
            return 1;
        }
        auto hinstDLL = LoadLibrary(TEXT("Y:\\Github\\modwig-windows\\src\\connector\\native\\HookDll\\x64\\Debug\\HookDll.dll")); 
        MYPROC setMyHook = (MYPROC)GetProcAddress(hinstDLL, "setMyHook"); 
        setMyHook(messageWindow);

        MSG msg;
        while (GetMessage(&msg, NULL, 0, 0) > 0) {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }

        std::cout << "Exiting Windows message thread" << std::endl;
    } );
    return exports;
}