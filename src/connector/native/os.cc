#if defined(IS_MACOSX)
#include <CoreGraphics/CoreGraphics.h>
#elif defined(IS_WINDOWS)
#define WINVER 0x0500
#include "windows.h"
#endif

void os_sleep(int time) {
    #if defined(IS_MACOSX)
        usleep(time);
    #elif defined(IS_WINDOWS)
        Sleep(time);
    #endif
}