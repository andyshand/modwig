#include "keyboard.h"

#include "eventsource.h"
#include "os.h"
#include "keycodes.h"

#if defined(IS_MACOSX)
#include <CoreGraphics/CoreGraphics.h>
#elif defined(IS_WINDOWS)
#include "windows.h"
#endif

#include <iostream>
#include <forward_list>
#include <thread>
#include <string>
#include <map>
#include <string>

using std::forward_list;

#if defined(IS_MACOSX)
bool threadSetup = false;
std::thread nativeThread;
CFRunLoopRef runLoop;
int nextId = 0;
#endif

struct CallbackInfo {
    Napi::ThreadSafeFunction cb;
    Napi::Function bareCb;
    int id;

    #if defined(IS_MACOSX)
    CGEventMask mask;
    CFMachPortRef tap;
    CFRunLoopSourceRef runloopsrc;
    #endif

    bool operator ==(const CallbackInfo& other) const {
        return other.cb == cb;
    }

    ~CallbackInfo() {
        cb.Release();

#if defined(IS_MACOSX)
        if (CGEventTapIsEnabled(tap)) CGEventTapEnable(tap, false);
        CFMachPortInvalidate(tap);
        CFRunLoopRemoveSource(CFRunLoopGetMain(), runloopsrc, kCFRunLoopCommonModes);
        CFRelease(runloopsrc);
        CFRelease(tap);
#endif
    }
};

struct JSEvent {
    #if defined(IS_MAC)
        UInt16 nativeKeyCode;
    #endif
    std::string lowerKey;
    bool Meta, Shift, Control, Alt, Fn;
    int button, x, y;
};

forward_list<CallbackInfo*> callbacks; 


#if defined(IS_MACOSX)
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
        jsEvent->Shift = true;
    } 
    if ((flags & kCGEventFlagMaskShift) != 0) {
        jsEvent->Shift = true;
    }
    if ((flags & kCGEventFlagMaskControl) != 0) {
        jsEvent->Control = true;
    }
    if ((flags & kCGEventFlagMaskAlternate) != 0) {
        jsEvent->Alt = true;
    }
    if ((flags & kCGEventFlagMaskCommand) != 0) {
        jsEvent->Meta = true;
    }
    if ((flags & kCGEventFlagMaskSecondaryFn) != 0) {
        jsEvent->Fn = true;
    }

    // TODO Check other thread access is 100% ok
    if (type == kCGEventKeyDown || 
        type == kCGEventKeyUp ||
        type == kCGEventFlagsChanged) {
        // Keyboard event

        auto callback = []( Napi::Env env, Napi::Function jsCallback, JSEvent* value ) {
        Napi::Object obj = Napi::Object::New(env);

            obj.Set(Napi::String::New(env, "nativeKeyCode"), Napi::Number::New(env, value->nativeKeyCode));
            obj.Set(Napi::String::New(env, "lowerKey"), Napi::String::New(env, value->lowerKey));
            obj.Set(Napi::String::New(env, "Meta"), Napi::Boolean::New(env, value->Meta));
            obj.Set(Napi::String::New(env, "Shift"), Napi::Boolean::New(env, value->Shift));
            obj.Set(Napi::String::New(env, "Control"), Napi::Boolean::New(env, value->Control));
            obj.Set(Napi::String::New(env, "Alt"), Napi::Boolean::New(env, value->Alt));
            obj.Set(Napi::String::New(env, "Fn"), Napi::Boolean::New(env, value->Fn));

            jsCallback.Call( {obj} );

            delete value;
        };        

        jsEvent->nativeKeyCode = CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
        jsEvent->lowerKey = stringForKeyCode(jsEvent->nativeKeyCode);
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

            obj.Set(Napi::String::New(env, "Meta"), Napi::Boolean::New(env, value->Meta));
            obj.Set(Napi::String::New(env, "Shift"), Napi::Boolean::New(env, value->Shift));
            obj.Set(Napi::String::New(env, "Control"), Napi::Boolean::New(env, value->Control));
            obj.Set(Napi::String::New(env, "Alt"), Napi::Boolean::New(env, value->Alt));
            obj.Set(Napi::String::New(env, "Fn"), Napi::Boolean::New(env, value->Fn));

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
#endif

/// Note that mousemove events seem to get fired when mouse is clicked too - TODO investigate
Napi::Value on(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto eventType = info[0].As<Napi::String>().Utf8Value();
    auto cb = info[1].As<Napi::Function>();
    
    #if defined(IS_MACOSX)
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
    #elif defined(IS_WINDOWS)
    // TODO
        return Napi::Number::New(env, 0);
    #endif
}

Napi::Value off(const Napi::CallbackInfo &info) {
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
        #if defined(IS_MACOSX)
            return Napi::Boolean::New(env, CGEventTapIsEnabled(info->tap));
        #elif defined(IS_WINDOWS)
            return Napi::Boolean::New(env, false); // TODO
        #endif
    }
    return Napi::Boolean::New(env, false);
}

#if defined(IS_WINDOWS)
void win32KeyEvent(MWKeyCode key, DWORD flags)
{
	int scan = MapVirtualKey(key & 0xff, MAPVK_VK_TO_VSC);

	/* Set the scan code for extended keys */
	switch (key)
	{
		case VK_RCONTROL:
		case VK_SNAPSHOT: /* Print Screen */
		case VK_RMENU: /* Right Alt / Alt Gr */
		case VK_PAUSE: /* Pause / Break */
		case VK_HOME:
		case VK_UP:
		case VK_PRIOR: /* Page up */
		case VK_LEFT:
		case VK_RIGHT:
		case VK_END:
		case VK_DOWN:
		case VK_NEXT: /* 'Page Down' */
		case VK_INSERT:
		case VK_DELETE:
		case VK_LWIN:
		case VK_RWIN:
		case VK_APPS: /* Application */
		case VK_VOLUME_MUTE:
		case VK_VOLUME_DOWN:
		case VK_VOLUME_UP:
		case VK_MEDIA_NEXT_TRACK:
		case VK_MEDIA_PREV_TRACK:
		case VK_MEDIA_STOP:
		case VK_MEDIA_PLAY_PAUSE:
		case VK_BROWSER_BACK:
		case VK_BROWSER_FORWARD:
		case VK_BROWSER_REFRESH:
		case VK_BROWSER_STOP:
		case VK_BROWSER_SEARCH:
		case VK_BROWSER_FAVORITES:
		case VK_BROWSER_HOME:
		case VK_LAUNCH_MAIL:
		{
			flags |= KEYEVENTF_EXTENDEDKEY;
			break;
		}
	}

	/* Set the scan code for keyup */
	if ( flags & KEYEVENTF_KEYUP ) {
		scan |= 0x80;
	}

	flags |= KEYEVENTF_SCANCODE;

	INPUT keyboardInput;
	keyboardInput.type = INPUT_KEYBOARD;
	keyboardInput.ki.wVk = 0;
	keyboardInput.ki.wScan = scan;
	keyboardInput.ki.dwFlags = flags;
	keyboardInput.ki.time = 0;
	keyboardInput.ki.dwExtraInfo = 0;
	SendInput(1, &keyboardInput, sizeof(keyboardInput));
}
#endif

Napi::Value keyPresser(const Napi::CallbackInfo &info, bool down) {
    Napi::Env env = info.Env();
    std::string s = info[0].As<Napi::String>();
    MWKeyCode keyCode = keyCodeForString(s);
    bool meta = false, shift = false, alt = false, control = false, fn = false;
    if (info[1].IsObject()) {
        Napi::Object obj = info[1].As<Napi::Object>();
        meta = obj.Has("Meta");
        shift = obj.Has("Shift");
        alt = obj.Has("Alt");
        control = obj.Has("Control");
        fn = obj.Has("Fn");
    }
#if defined(IS_MACOSX)
    CGEventFlags flags = (CGEventFlags)0;
    flags |= meta ? kCGEventFlagMaskCommand : flags
          || shift ? kCGEventFlagMaskShift : flags
          || alt ? kCGEventFlagMaskAlternate : flags
          || control ? kCGEventFlagMaskControl : flags
          || fn ? kCGEventFlagMaskSecondaryFn : flags;
    CGEventRef keyevent = CGEventCreateKeyboardEvent(getCGEventSource(), keyCode, down);
    CGEventSetFlags(keyevent, flags);
    CGEventPost(kCGSessionEventTap, keyevent);
    CFRelease(keyevent);
#elif defined(IS_WINDOWS)
    const DWORD dwFlags = down ? 0 : KEYEVENTF_KEYUP;

    // Modifiers come first on key down, but last on keyup for consistency
	if (!down) win32KeyEvent(keyCode, dwFlags);
	
    if (meta) win32KeyEvent(VK_LWIN, dwFlags);
    if (alt) win32KeyEvent(VK_MENU, dwFlags);
    if (control) win32KeyEvent(VK_CONTROL, dwFlags);
    if (fn) win32KeyEvent(VK_SHIFT, dwFlags);

    if (down) win32KeyEvent(keyCode, dwFlags);
#endif
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
    os_sleep(10000);
    return keyUp(info);
}

Napi::Value InitKeyboard(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "on"), Napi::Function::New(env, on));
    obj.Set(Napi::String::New(env, "off"), Napi::Function::New(env, off));
    obj.Set(Napi::String::New(env, "isEnabled"), Napi::Function::New(env, isEnabled));
    obj.Set(Napi::String::New(env, "keyDown"), Napi::Function::New(env, keyDown));
    obj.Set(Napi::String::New(env, "keyUp"), Napi::Function::New(env, keyUp));
    obj.Set(Napi::String::New(env, "keyPress"), Napi::Function::New(env, keyPress));
    exports.Set("Keyboard", obj);
    return exports;
}