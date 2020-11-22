#pragma once
#include <napi.h>

#if defined(IS_MAC)
#include <CoreGraphics/CoreGraphics.h>
#endif

Napi::Value InitWindow(Napi::Env env, Napi::Object exports);