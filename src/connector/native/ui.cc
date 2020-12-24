#include "ui.h"
#include "screen.h"
#include "keyboard.h"
#include "string.h"
#include <iostream>

struct XYPoint {
    int x, y;
};
struct UIPoint {
    int window;
    XYPoint point;
};
struct MWRect {
    int x, y, w, h;
};
struct ArrangerTrack {
    UIPoint point;
    bool selected, expanded, automationOpen;
};

bool operator==(const MWRect& lhs, const MWRect& rhs)
{
    return lhs.x == rhs.x && lhs.y == rhs.y && lhs.w == rhs.w && lhs.h == rhs.h;
}
bool operator==(const XYPoint& lhs, const XYPoint& rhs)
{
    return lhs.x == rhs.x && lhs.y == rhs.y;
}
bool operator==(const UIPoint& lhs, const UIPoint& rhs)
{
    return lhs.point == rhs.point && lhs.window == rhs.window;
}

class BitwigWindow {
    int index;
    bool arrangerDirty;
    XYPoint mouseDownAt;
    int mouseDownButton;
    MWRect lastBWFrame;
    CGImageRef latestImage;
    CFDataRef latestImageData;
    public:
    MWRect getFrame() {
        // Go through all on screen windows, find BW, get its frame
        CFArrayRef array = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
        CFIndex count = CFArrayGetCount(array);
        for (CFIndex i = 0; i < count; i++) {
            CFDictionaryRef dict = (CFDictionaryRef)CFArrayGetValueAtIndex(array, i);
            auto str = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowOwnerName));
            if (str == "Bitwig Studio") {
                CGRect windowRect;
                CGRectMakeWithDictionaryRepresentation((CFDictionaryRef)(CFDictionaryGetValue(dict, kCGWindowBounds)), &windowRect);
                if (windowRect.size.height < 100) {
                    // Bitwig opens a separate window for its tooltips, ignore this window
                    // TODO Revisit better way of only getting the main window
                    continue;
                }
                return MWRect({ 
                    (int)windowRect.origin.x, 
                    (int)windowRect.origin.y, // TODO account for menu bar?
                    (int)windowRect.size.width, 
                    (int)windowRect.size.height
                });
            }
        }
        return MWRect({0, 0, 0, 0});
    }

    void updateScreenshot() {
        this->lastBWFrame = getFrame();
        if (latestImage != NULL) {
            CFRelease(latestImage);
            if (latestImageData != NULL) {
                CFRelease(latestImageData);
            }
        }
        latestImage = CGDisplayCreateImageForRect(CGMainDisplayID(), CGRectMake(
            lastBWFrame.x,
            lastBWFrame.y,
            lastBWFrame.w,
            lastBWFrame.h
        ));
        CGDataProviderRef provider = CGImageGetDataProvider(latestImage);
        latestImageData = CGDataProviderCopyData(provider);
    }

    /**
     * Each Bitwig window gets passed all mouse/keyboard events (the same ones that get passed to 
     * our JS callbacks) so it can update its internal state accordingly
     */
    void processEvent(JSEvent* event) {
        std::cout << "Got event!";
        std::cout.flush();
        if (event->type == "mousedown") {
            mouseDownAt = XYPoint({event->x, event->y});
            mouseDownButton = event->button;
        } else if (event->type == "mouseup") {

        }
    }

    // UIPoint getInspector() {
    //     return NULL;
    // }

    // /**
    //  * Get the location of all arranger tracks on screen
    //  */
    // UIPoint[] getArrangerTracks() {
    //     return NULL;
    // }
};

BitwigWindow* mainWindow = new BitwigWindow();

Napi::Value InitUI(Napi::Env env, Napi::Object exports) {
    Napi::Object obj = Napi::Object::New(env);

    // addEventListener(EventListenerSpec({
    //     "mouseup",
    //     [](JSEvent* event) -> void {
    //         mainWindow->processEvent(event);
    //     },
    //     NULL,
    //     NULL
    // }));

    // addEventListener(EventListenerSpec({
    //     "keyup",
    //     [](JSEvent* event) -> void {
    //         mainWindow->processEvent(event);
    //     },
    //     NULL,
    //     NULL
    // }))

    // obj.Set(Napi::String::New(env, "getFrame"), Napi::Function::New(env, GetFrame));
    // obj.Set(Napi::String::New(env, "getMainScreen"), Napi::Function::New(env, GetMainScreen));
    // obj.Set(Napi::String::New(env, "closePluginWindows"), Napi::Function::New(env, ClosePluginWindows));
    exports.Set("UI", obj);
    return exports;
}

