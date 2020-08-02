#pragma once

#include <napi.h>
#include <CoreFoundation/CoreFoundation.h>
#include <CoreGraphics/CoreGraphics.h>

class BESPoint : public Napi::ObjectWrap<BESPoint>
{
public:
    static Napi::FunctionReference constructor;
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    BESPoint(const Napi::CallbackInfo &info);
    Napi::Value GetX(const Napi::CallbackInfo &info);
    Napi::Value GetY(const Napi::CallbackInfo &info);
    int _x, _y;
    CGPoint asCGPoint() {
        return CGPointMake((CGFloat)this->_x, (CGFloat)this->_y);
    }
};