#pragma once
#include <napi.h>
#include <CoreGraphics/CoreGraphics.h>

class Screenshot : public Napi::ObjectWrap<Screenshot>
{
public:
    CGImageRef image;
    CFDataRef dataRef;
    CGColorSpaceRef colorSpace;
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    Screenshot(const Napi::CallbackInfo &info);
    ~Screenshot();
    // Napi::Value ColorAt(const Napi::CallbackInfo &info);
};