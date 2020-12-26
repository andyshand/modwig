#pragma once
#include <napi.h>
#include <functional>
#include <string>

struct JSEvent {
    UInt16 nativeKeyCode;
    std::string type;
    std::string lowerKey;
    bool Meta, Shift, Control, Alt, Fn;
    int button, x, y;
};

struct CallbackInfo {
    Napi::ThreadSafeFunction cb = nullptr;
    std::function<void(JSEvent*)> nativeFn = nullptr;
    CGEventMask mask;
    int id;
    CFMachPortRef tap;
    std::string eventType;
    CFRunLoopSourceRef runloopsrc;

    bool operator ==(const CallbackInfo& other) const {
        return other.cb == cb;
    }

    ~CallbackInfo() {
        if (cb != nullptr) {
            cb.Release();
        }

        if (CGEventTapIsEnabled(tap)) CGEventTapEnable(tap, false);

        CFMachPortInvalidate(tap);
        CFRunLoopRemoveSource(CFRunLoopGetMain(), runloopsrc, kCFRunLoopCommonModes);
        CFRelease(runloopsrc);
        CFRelease(tap);
    }
};

struct EventListenerSpec {
    std::string eventType;
    std::function<void(JSEvent*)> cb = nullptr;
    Napi::Function* jsFunction = nullptr;
    Napi::Env env = nullptr; 
};

CallbackInfo* addEventListener(EventListenerSpec spec);

Napi::Value InitKeyboard(Napi::Env env, Napi::Object exports);