#pragma once
#include <napi.h>

#if defined(IS_MACOSX)
#include <CoreGraphics/CoreGraphics.h>
#endif

class Screenshot : public Napi::ObjectWrap<Screenshot>
{
public:
#if defined(IS_MACOSX)
    CGImageRef image;
    CFDataRef dataRef;
    CGColorSpaceRef colorSpace;
#endif
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    Screenshot(const Napi::CallbackInfo &info);
    ~Screenshot();
    // Napi::Value ColorAt(const Napi::CallbackInfo &info);
};