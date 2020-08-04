#include "point.h"
#include "mouse.h"

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

    CGEventRef event = CGEventCreate(NULL);
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

    CGEventRef move = CGEventCreateMouseEvent(
        NULL, 
        kCGEventMouseMoved,
        CGPointMake((CGFloat)x.DoubleValue(), (CGFloat)y.DoubleValue()),
        kCGMouseButtonLeft
    );
	CGEventPost(kCGSessionEventTap, move);
	CFRelease(move);

    return Napi::Value();
}

void mouseUpDown(const Napi::CallbackInfo &info, bool down, bool doubleClick = false) {
    CGMouseButton button = (CGMouseButton)info[0].As<Napi::Number>().Uint32Value();

    CGPoint pos = BESPoint::Unwrap(GetMousePosition(info).As<Napi::Object>())->asCGPoint();
    CGEventFlags flags = (CGEventFlags)0;

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
	CGEventRef event = CGEventCreateMouseEvent(
        NULL,
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
    usleep(200000);
    mouseUpDown(info, false);
    return Napi::Value();
}

Napi::Value DoubleClick(const Napi::CallbackInfo &info)
{
    mouseUpDown(info, true, true);
    usleep(200000);
    mouseUpDown(info, false, true);
    return Napi::Value();
}

Napi::Object InitMouse(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "getPosition"), Napi::Function::New(env, GetMousePosition));
    obj.Set(Napi::String::New(env, "setPosition"), Napi::Function::New(env, SetMousePosition));
    obj.Set(Napi::String::New(env, "up"), Napi::Function::New(env, MouseDown));
    obj.Set(Napi::String::New(env, "down"), Napi::Function::New(env, MouseUp));
    obj.Set(Napi::String::New(env, "click"), Napi::Function::New(env, Click));
    obj.Set(Napi::String::New(env, "doubleClick"), Napi::Function::New(env, DoubleClick));
    exports.Set("Mouse", obj);
    return exports;
}