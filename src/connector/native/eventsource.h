#pragma once

#if defined(IS_MACOS)
    #include <CoreGraphics/CoreGraphics.h>
    CGEventSourceRef getCGEventSource(bool modwigListeners = false);
#endif