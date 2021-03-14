#pragma once
#include <string>

#if defined(IS_MACOS)
    #include <CoreGraphics/CoreGraphics.h>
    std::string CFStringToString(CFStringRef cfString);
#endif

