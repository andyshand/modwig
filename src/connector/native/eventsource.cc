#include "eventsource.h"

CGEventSourceRef eventSource = CGEventSourceCreate(kCGEventSourceStatePrivate);
bool setup = false;
CGEventSourceRef getCGEventSource() {
    if (!setup) {
        CGEventSourceSetUserData(eventSource, 42);
        setup = true;
    }
    return eventSource;
}