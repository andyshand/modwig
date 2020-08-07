#include "point.h"
#include "keyboard.h"
#include "eventsource.h"

#include <CoreGraphics/CoreGraphics.h>
#include <iostream>
#include <forward_list>
#include <thread>
#include <string>

using std::forward_list;

bool threadSetup = false;
std::thread nativeThread;
CFRunLoopRef runLoop;
int nextId = 0;

struct CallbackInfo {
    Napi::ThreadSafeFunction cb;
    Napi::Function bareCb;
    CGEventMask mask;
    int id;
    CFMachPortRef tap;
    CFRunLoopSourceRef runloopsrc;

    bool operator ==(const CallbackInfo& other) const {
        return other.cb == cb;
    }

    ~CallbackInfo() {
        cb.Release();

        if (CGEventTapIsEnabled(tap)) CGEventTapEnable(tap, false);
        CFMachPortInvalidate(tap);
        CFRunLoopRemoveSource(CFRunLoopGetMain(), runloopsrc, kCFRunLoopCommonModes);
        CFRelease(runloopsrc);
        CFRelease(tap);
    }
};

struct JSEvent {
    UInt16 keyCode;
    bool cmd, shift, ctrl, alt;
    int button, x, y;
};

forward_list<CallbackInfo*> callbacks; 

CGEventRef eventtap_callback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    if (CGEventGetIntegerValueField(event, kCGEventSourceUserData) == 42) {
        // Skip our own events
        return event;
    }

    CallbackInfo* e = (CallbackInfo*) refcon;    
    
    // hammerspoon says OS X disables eventtaps if it thinks they are slow or odd or just because the moon
    // is wrong in some way... but at least it's nice enough to tell us.
    if ((type == kCGEventTapDisabledByTimeout) || (type == kCGEventTapDisabledByUserInput)) {
        CGEventTapEnable(e->tap, true);
        return event;
    }

    JSEvent *jsEvent = new JSEvent();

    CGEventFlags flags = CGEventGetFlags(event);
    if ((flags & kCGEventFlagMaskAlphaShift) != 0) {
        jsEvent->shift = true;
    } else if ((flags & kCGEventFlagMaskShift) != 0) {
        jsEvent->shift = true;
    } else if ((flags & kCGEventFlagMaskControl) != 0) {
        jsEvent->ctrl = true;
    } else if ((flags & kCGEventFlagMaskAlternate) != 0) {
        jsEvent->alt = true;
    } else if ((flags & kCGEventFlagMaskCommand) != 0) {
        jsEvent->cmd = true;
    }

    // TODO Check other thread access is 100% ok
    if (type == kCGEventKeyDown || 
        type == kCGEventKeyUp ||
        type == kCGEventFlagsChanged) {
        // Keyboard event

        auto callback = []( Napi::Env env, Napi::Function jsCallback, JSEvent* value ) {
        Napi::Object obj = Napi::Object::New(env);

            obj.Set(Napi::String::New(env, "keyCode"), Napi::Number::New(env, value->keyCode));
            obj.Set(Napi::String::New(env, "cmd"), Napi::Boolean::New(env, value->cmd));
            obj.Set(Napi::String::New(env, "shift"), Napi::Boolean::New(env, value->shift));
            obj.Set(Napi::String::New(env, "ctrl"), Napi::Boolean::New(env, value->ctrl));
            obj.Set(Napi::String::New(env, "alt"), Napi::Boolean::New(env, value->alt));

            jsCallback.Call( {obj} );

            delete value;
        };        

        jsEvent->keyCode = CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
        e->cb.BlockingCall( jsEvent, callback );  
    } else {
        // Mouse event
        CGPoint point = CGEventGetLocation(event);
        jsEvent->x = (int) point.x;
        jsEvent->y = (int) point.y;
        if (type == kCGEventMouseMoved || type == kCGEventOtherMouseDragged) {
            // Mouse movement doesn't have a button (multiple buttons could theoretically be down)
            jsEvent->button = -1;
        } else if (type == kCGEventLeftMouseUp || type == kCGEventLeftMouseDown || type == kCGEventLeftMouseDragged) {
            jsEvent->button = 0;
        } else if (type == kCGEventRightMouseUp || type == kCGEventRightMouseDown || type == kCGEventRightMouseDragged) {
            jsEvent->button = 2;
        } else {
            jsEvent->button = 1;
        }

        auto callback = []( Napi::Env env, Napi::Function jsCallback, JSEvent* value ) {
            Napi::Object obj = Napi::Object::New(env);

            obj.Set(Napi::String::New(env, "cmd"), Napi::Boolean::New(env, value->cmd));
            obj.Set(Napi::String::New(env, "shift"), Napi::Boolean::New(env, value->shift));
            obj.Set(Napi::String::New(env, "ctrl"), Napi::Boolean::New(env, value->ctrl));
            obj.Set(Napi::String::New(env, "alt"), Napi::Boolean::New(env, value->alt));

            obj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, value->x));
            obj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, value->y));
            obj.Set(Napi::String::New(env, "button"), Napi::Number::New(env, value->button));

            jsCallback.Call( {obj} );

            delete value;
        };
        e->cb.BlockingCall( jsEvent, callback );  
    }
    // can return NULL to ignore event
    return event;
}

Napi::Value addEventListener(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto eventType = info[0].As<Napi::String>().Utf8Value();
    auto cb = info[1].As<Napi::Function>();

    CGEventMask mask = kCGEventMaskForAllEvents;

    if ("keyup" == eventType) {
        mask = CGEventMaskBit(kCGEventKeyUp);
    } else if ("keydown" == eventType) {
        mask = CGEventMaskBit(kCGEventKeyDown);
    } else if ("mousemoved" == eventType) {
        mask = CGEventMaskBit(kCGEventMouseMoved) | CGEventMaskBit(kCGEventOtherMouseDragged);
    } else if ("mousedown" == eventType) {
        mask = CGEventMaskBit(kCGEventLeftMouseDown) | CGEventMaskBit(kCGEventRightMouseDown) | CGEventMaskBit(kCGEventOtherMouseDown);
    } else if ("mouseup" == eventType) {
        mask = CGEventMaskBit(kCGEventLeftMouseUp) | CGEventMaskBit(kCGEventRightMouseUp) | CGEventMaskBit(kCGEventOtherMouseUp);
    }

    // TODO FREE
    CallbackInfo *ourInfo = new CallbackInfo;
    ourInfo->bareCb = cb;
    ourInfo->id = nextId++;
    ourInfo->cb = Napi::ThreadSafeFunction::New(
      env,
      cb,                      // JavaScript function called asynchronously
      "Resource Name",         // Name
      0,                       // Unlimited queue
      1);                      // Initial thread count 

    ourInfo->tap = CGEventTapCreate(
        kCGSessionEventTap,
        kCGHeadInsertEventTap,
        kCGEventTapOptionDefault,
        mask,
        eventtap_callback,
        ourInfo);

    if (!ourInfo->tap) {
        std::cout << "Could not create event tap.";
    } else {
        CGEventTapEnable(ourInfo->tap, true);
        ourInfo->runloopsrc = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, ourInfo->tap, 0);
        if (!threadSetup) {
            threadSetup = true;
            nativeThread = std::thread( [=] {
                runLoop = CFRunLoopGetCurrent();
                CFRunLoopAddSource(runLoop, ourInfo->runloopsrc, kCFRunLoopCommonModes);
                CFRunLoopRun();
            } );
        } else {    
            CFRunLoopAddSource(runLoop, ourInfo->runloopsrc, kCFRunLoopCommonModes);
        }
    }
    callbacks.push_front(ourInfo);
    return Napi::Number::New(env, ourInfo->id);
}

Napi::Value removeEventListener(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int id = info[0].As<Napi::Number>();
    callbacks.remove_if([=](CallbackInfo *e){ 
        bool willRemove = e->id == id;     
        if (willRemove) {
            // free it
            delete e;
        }
        return willRemove;
    });
    return Napi::Boolean::New(env, true);
}

Napi::Value isEnabled(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    int id = info[0].As<Napi::Number>();

    auto it = std::find_if (callbacks.begin(), callbacks.end(), [=](CallbackInfo *e){ 
        return e->id == id;
    });
    if (it != callbacks.end()) {
        CallbackInfo* info = *it;
        return Napi::Boolean::New(env, CGEventTapIsEnabled(info->tap));
    }
    return Napi::Boolean::New(env, false);
}

Napi::Value keyPresser(const Napi::CallbackInfo &info, bool down) {
    Napi::Env env = info.Env();
    CGKeyCode keyCode = (CGKeyCode) info[0].As<Napi::Number>().Uint32Value();
    CGEventFlags flags = (CGEventFlags)0;
    if (info[1].IsObject()) {
        Napi::Object obj = info[1].As<Napi::Object>();
        if (obj.Has("cmd")) {
            flags |= kCGEventFlagMaskCommand;
        } else if (obj.Has("shift")) {
            flags |= kCGEventFlagMaskShift;
        } else if (obj.Has("alt")) {
            flags |= kCGEventFlagMaskAlternate;
        } else if (obj.Has("ctrl")) {
            flags |= kCGEventFlagMaskControl;
        }
    }
    CGEventRef keyevent = CGEventCreateKeyboardEvent(getCGEventSource(), keyCode, down);
    CGEventSetFlags(keyevent, flags);
    CGEventPost(kCGSessionEventTap, keyevent);
    CFRelease(keyevent);
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
    usleep(10000);
    return keyUp(info);
}

Napi::Value InitKeyboard(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "addEventListener"), Napi::Function::New(env, addEventListener));
    obj.Set(Napi::String::New(env, "removeEventListener"), Napi::Function::New(env, removeEventListener));
    obj.Set(Napi::String::New(env, "isEnabled"), Napi::Function::New(env, isEnabled));
    obj.Set(Napi::String::New(env, "keyDown"), Napi::Function::New(env, keyDown));
    obj.Set(Napi::String::New(env, "keyUp"), Napi::Function::New(env, keyUp));
    obj.Set(Napi::String::New(env, "keyPress"), Napi::Function::New(env, keyPress));
    exports.Set("Keyboard", obj);
    return exports;
}