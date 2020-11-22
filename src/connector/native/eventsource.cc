#include "eventsource.h"

#if defined(IS_MACOSX)
CGEventSourceRef eventSource = CGEventSourceCreate(kCGEventSourceStatePrivate);
bool setup = false;
CGEventSourceRef getCGEventSource() {
    if (!setup) {
        CGEventSourceSetUserData(eventSource, 42);
        setup = true;
    }
    return eventSource;
}
#endif