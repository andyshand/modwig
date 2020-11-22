#pragma once

#if defined(IS_MACOSX)
#include <CoreGraphics/CoreGraphics.h>
#endif

#include <string>

#if defined(IS_MACOSX)
std::string CFStringToString(CFStringRef cfString);
#endif