#include <windows.h>
#include <napi.h>
#include <vector>
#include <mutex>
#include <map>
#include <string>
#include <thread>
#include "events.h"

int nextId = 0;
bool threadSetup = false;
std::thread nativeThread;
std::mutex m;

std::map<std::string,std::vector<CallbackInfo*>> callbacksByEventType = {};

CallbackInfo* addEventListener(EventListenerSpec spec) {
    CallbackInfo *ourInfo = new CallbackInfo;
    ourInfo->nativeFn = spec.cb;
    ourInfo->id = nextId++;
    ourInfo->eventType = spec.eventType;
    if (spec.jsFunction != nullptr) {
        // std::cout << "Adding JS Listener";
        ourInfo->cb = Napi::ThreadSafeFunction::New(
            spec.env,
            *spec.jsFunction, // JavaScript function called asynchronously                      
            "Resource Name", // Name         
            0, // Unlimited queue                      
            1 // Initial thread count 
        );                      
    }
    if (!callbacksByEventType.count(spec.eventType)) {
        callbacksByEventType[spec.eventType] = {};
    }
    m.lock();
    callbacksByEventType[spec.eventType].push_back(ourInfo);
    m.unlock();
    return ourInfo;
}

typedef struct tagMYREC
{
    char type[80];
    UINT x;
    UINT y;
    UINT button;
} MYREC;

/// Note that mousemove events seem to get fired when mouse is clicked too - TODO investigate
Napi::Value on(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto eventType = info[0].As<Napi::String>().Utf8Value();
    auto cb = info[1].As<Napi::Function>();
    auto ourInfo = addEventListener(EventListenerSpec({
        eventType,
        nullptr,
        &cb,
        env
    }));
    return Napi::Number::New(env, ourInfo->id);
}

Napi::Value off(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int id = info[0].As<Napi::Number>();
    m.lock();
    for (auto const& [eventType, callbacks] : callbacksByEventType)
    {
        auto nonConstCbs = callbacksByEventType[eventType];
        auto removeIf = std::remove_if(nonConstCbs.begin(), nonConstCbs.end(), [=](CallbackInfo* e){ 
            bool willRemove = e->id == id;     
            if (willRemove) {
                // free it
                delete e;
            }
            return willRemove;
        });
        nonConstCbs.erase(removeIf, callbacks.end());
    }
    m.unlock();
    return Napi::Boolean::New(env, true);
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

JSEvent jsEvent;
LRESULT CALLBACK WindowProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    std::cout << "Got something" << uMsg <<  std::endl;

    if (uMsg == WM_COPYDATA) {
      std::cout << "Got a message!" << std::endl;
      auto pMyCDS = (PCOPYDATASTRUCT) lParam;
      switch( pMyCDS->dwData )
      {
          case 1:
              // Mouse event
            auto e = (MYREC*)pMyCDS->lpData;
            jsEvent.type = e->type;
            jsEvent.button = e->button;
            jsEvent.x = e->x;
            jsEvent.y = e->y;
            auto callback = []( Napi::Env env, Napi::Function jsCallback, JSEvent* value ) {
                Napi::Object obj = Napi::Object::New(env);

                obj.Set(Napi::String::New(env, "Meta"), Napi::Boolean::New(env, value->Meta));
                obj.Set(Napi::String::New(env, "Shift"), Napi::Boolean::New(env, value->Shift));
                obj.Set(Napi::String::New(env, "Control"), Napi::Boolean::New(env, value->Control));
                obj.Set(Napi::String::New(env, "Alt"), Napi::Boolean::New(env, value->Alt));
                obj.Set(Napi::String::New(env, "Fn"), Napi::Boolean::New(env, value->Fn));

                obj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, value->x));
                obj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, value->y));
                obj.Set(Napi::String::New(env, "button"), Napi::Number::New(env, value->button));

                jsCallback.Call( {obj} );
            };
            m.lock();
            if (callbacksByEventType.count(e->type)) {
                auto callbacks = callbacksByEventType[e->type];
                for (auto cb : callbacks) {
                    cb->cb.BlockingCall( &jsEvent, callback );
                }
            }
            m.unlock();
            break;
      }
    }

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