#include "eventsource.h"

CGEventSourceRef eventSource = CGEventSourceCreate(kCGEventSourceStatePrivate);
CGEventSourceRef getCGEventSource(bool modwigListeners) {
    CGEventSourceSetUserData(eventSource, modwigListeners ? 41 : 42);
    return eventSource;
}