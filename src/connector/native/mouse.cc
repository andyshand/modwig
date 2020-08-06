#include "point.h"
#include "mouse.h"
#include "eventsource.h"

#include <iostream>
 
int SLEEP_TIME = 2000;
bool middleDownDragWaiting = false;
bool leftDownDragWaiting = false;
bool rightDownDragWaiting = false;

CGEventType cgEventType(int button, bool down) {
    if (button == 0) {
        return down ? kCGEventLeftMouseDown : kCGEventLeftMouseUp;
    } else if (button == 1) {
        return down ? kCGEventRightMouseDown : kCGEventRightMouseUp;
    } else {
        return down ? kCGEventOtherMouseDown : kCGEventOtherMouseUp;
    }
} 

Napi::Value GetMousePosition(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    CGEventRef event = CGEventCreate(getCGEventSource());
    CGPoint point = CGEventGetLocation(event);
    CFRelease(event);

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

    if (middleDownDragWaiting || leftDownDragWaiting || rightDownDragWaiting) {
        CGEventRef ourEvent = CGEventCreate(getCGEventSource());
        CGPoint mouseLoc = CGEventGetLocation(ourEvent); //get current mouse position
        CFRelease(ourEvent);

        // First send a dragged event at current location
        std::cout << "Middle is down, sending dragged event";
        CGEventRef drag = CGEventCreateMouseEvent(
            getCGEventSource(), 
            middleDownDragWaiting ? kCGEventOtherMouseDragged : (leftDownDragWaiting ? kCGEventLeftMouseDragged : kCGEventRightMouseDragged),
            mouseLoc,
            middleDownDragWaiting ? kCGMouseButtonCenter : (leftDownDragWaiting ? kCGMouseButtonLeft : kCGMouseButtonRight) // Ignored for mouse moved events apparently
        );
        CGEventPost(kCGSessionEventTap, drag);
        CFRelease(drag);

        middleDownDragWaiting = false;
        leftDownDragWaiting = false;
        rightDownDragWaiting = false;
        usleep(SLEEP_TIME);
    }

    CGEventRef move = CGEventCreateMouseEvent(
        getCGEventSource(), 
        middleDownDragWaiting ? kCGEventOtherMouseDragged : kCGEventMouseMoved,
        CGPointMake((CGFloat)x.DoubleValue(), (CGFloat)y.DoubleValue()),
        middleDownDragWaiting ? kCGMouseButtonCenter : kCGMouseButtonLeft // Ignored for mouse moved events apparently
    );
	CGEventPost(kCGSessionEventTap, move);
	CFRelease(move);
    usleep(SLEEP_TIME);

    return Napi::Value();
}

void mouseUpDown(const Napi::CallbackInfo &info, bool down, bool doubleClick = false) {
    CGMouseButton button = (CGMouseButton)info[0].As<Napi::Number>().Uint32Value();

    CGPoint pos = BESPoint::Unwrap(GetMousePosition(info).As<Napi::Object>())->asCGPoint();
    CGEventFlags flags = (CGEventFlags)0;
    std::cout << "Button is " << button;

    if (info[1].IsObject()) {
        // We got options
        Napi::Object options = info[1].As<Napi::Object>();
        if (options.Has("cmd")) {
            flags |= kCGEventFlagMaskCommand;
        } else if (options.Has("ctrl")) {
            flags |= kCGEventFlagMaskControl;
        } else if (options.Has("shift")) {
            flags |= kCGEventFlagMaskShift;
        } else if (options.Has("alt")) {
            flags |= kCGEventFlagMaskAlternate;
        }

        if (options.Has("x")) {
            pos.x = (CGFloat)options.Get("x").As<Napi::Number>().DoubleValue();
        }
        if (options.Has("y")) {
            pos.y = (CGFloat)options.Get("y").As<Napi::Number>().DoubleValue();
        }
    }

    // Swapped from Javascript paradigm
    if (button == 2) {
        button = (CGMouseButton)1;
        rightDownDragWaiting = down;
    } else if (button == 1) {
        middleDownDragWaiting = down;
        button = (CGMouseButton)2;
    } else {
        leftDownDragWaiting = down;
    }

	CGEventRef event = CGEventCreateMouseEvent(
        getCGEventSource(),
        cgEventType(button, down),
        pos,
        button
    );
    CGEventSetFlags(event, flags);
    if (doubleClick) {
        CGEventSetIntegerValueField(event, kCGMouseEventClickState, 2);
    }
	CGEventPost(kCGSessionEventTap, event);
	CFRelease(event);
    usleep(SLEEP_TIME);
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
    usleep(SLEEP_TIME);
    mouseUpDown(info, false);
    return Napi::Value();
}

Napi::Value DoubleClick(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true, true);
    usleep(SLEEP_TIME);
    mouseUpDown(info, false, true);
    return Napi::Value();
}

Napi::Object InitMouse(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "getPosition"), Napi::Function::New(env, GetMousePosition));
    obj.Set(Napi::String::New(env, "setPosition"), Napi::Function::New(env, SetMousePosition));
    obj.Set(Napi::String::New(env, "up"), Napi::Function::New(env, MouseUp));
    obj.Set(Napi::String::New(env, "down"), Napi::Function::New(env, MouseDown));
    obj.Set(Napi::String::New(env, "click"), Napi::Function::New(env, Click));
    obj.Set(Napi::String::New(env, "doubleClick"), Napi::Function::New(env, DoubleClick));
    exports.Set("Mouse", obj);
    return exports;
}