#include "string.h"

std::string CFStringToString(CFStringRef cfString) {
    CFIndex bufferSize = CFStringGetLength(cfString) + 1; // The +1 is for having space for the string to be NUL terminated
    char buffer[bufferSize];

    // CFStringGetCString is documented to return a false if the buffer is too small 
    // (which shouldn't happen in this example) or if the conversion generally fails    
    if (CFStringGetCString(cfString, buffer, bufferSize, kCFStringEncodingUTF8))
    {
        return std::string (buffer);
    }
    return "";
}