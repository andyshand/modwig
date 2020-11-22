#pragma once

#if defined(IS_MACOSX)
#include <CoreGraphics/CoreGraphics.h>
#endif

#if defined(IS_MACOSX)
CGEventSourceRef getCGEventSource();
#endif