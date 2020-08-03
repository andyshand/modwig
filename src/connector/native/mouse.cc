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

void mouseUpDown(const Napi::CallbackInfo &info, int button, bool down) {
    CGPoint pos = BESPoint::Unwrap(BESMouse::GetMousePosition(info).As<Napi::Object>())->asCGPoint();
	CGEventRef event = CGEventCreateMouseEvent(
        NULL,
        cgEventType(button, down),
        pos,
        (CGMouseButton)button
    );
	CGEventPost(kCGSessionEventTap, event);
	CFRelease(event);
}


Napi::Object BESMouse::Init(Napi::Env env, Napi::Object exports)
{
    // This method is used to hook the accessor and method callbacks
    Napi::Function func = DefineClass(env, "BESMouse", {
        StaticMethod<&BESMouse::GetMousePosition>("GetMousePosition"), 
        StaticMethod<&BESMouse::SetMousePosition>("SetMousePosition"), 
        StaticMethod<&BESMouse::MouseDown>("MouseDown"), 
        StaticMethod<&BESMouse::MouseUp>("MouseUp")
    });

    // Napi::FunctionReference *constructor = new Napi::FunctionReference();
    // *constructor = Napi::Persistent(func);
    exports.Set("BESMouse", func);
    // env.SetInstanceData<Napi::FunctionReference>(constructor);
    return exports;
}

BESMouse::BESMouse(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BESMouse>(info) {}

Napi::Value BESMouse::GetMousePosition(const Napi::CallbackInfo &info)
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

Napi::Value BESMouse::SetMousePosition(const Napi::CallbackInfo &info)
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

Napi::Value BESMouse::MouseDown(const Napi::CallbackInfo &info)
{
    // Napi::Env env = info.Env();
    Napi::Number button = info[0].As<Napi::Number>();
    mouseUpDown(info, button, true);

    return Napi::Value();
}

Napi::Value BESMouse::MouseUp(const Napi::CallbackInfo &info)
{
    // Napi::Env env = info.Env();
    Napi::Number button = info[0].As<Napi::Number>();
    mouseUpDown(info, button, false);

    return Napi::Value();
}

Napi::Value BESMouse::Click(const Napi::CallbackInfo &info)
{
    // Napi::Env env = info.Env();
    Napi::Number button = info[0].As<Napi::Number>();
    mouseUpDown(info, button, false);
    mouseUpDown(info, button, true);
    
    return Napi::Value();
}