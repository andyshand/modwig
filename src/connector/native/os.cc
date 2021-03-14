#if defined(IS_MACOS)
#include <CoreGraphics/CoreGraphics.h>
#elif defined(IS_WINDOWS)
#include <windows.h>
#endif

void os_sleep(int time) {
    #if defined(IS_MACOS)
        usleep(time);
    #elif defined(IS_WINDOWS)
        Sleep(time);
    #endif
}