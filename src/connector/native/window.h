#pragma once
#include <napi.h>

#if defined(IS_MACOS)
    #include <CoreGraphics/CoreGraphics.h>
#elif defined(IS_WINDOWS)
#endif

Napi::Value InitWindow(Napi::Env env, Napi::Object exports);