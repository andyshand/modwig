#pragma once

#include <napi.h>
#if defined(IS_MACOSX)
#include <CoreFoundation/CoreFoundation.h>
#include <CoreGraphics/CoreGraphics.h>
#endif

class BESPoint : public Napi::ObjectWrap<BESPoint>
{
public:
    static Napi::FunctionReference constructor;
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    BESPoint(const Napi::CallbackInfo &info);
    Napi::Value GetX(const Napi::CallbackInfo &info);
    Napi::Value GetY(const Napi::CallbackInfo &info);
    int _x, _y;
    #if defined(IS_MACOSX)
    CGPoint asCGPoint() {
        return CGPointMake((CGFloat)this->_x, (CGFloat)this->_y);
    }
    #endif
};