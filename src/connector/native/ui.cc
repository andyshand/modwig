#include "ui.h"
#include "screen.h"
#include "keyboard.h"
#include "string.h"
#include <iostream>
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>

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
struct MWColor {
    int r, g, b;
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

struct ImageDeets {
    CFDataRef imageData;
    size_t bytesPerRow;
    size_t bytesPerPixel;
    CGImageRef imageRef;
    CGBitmapInfo info;
    MWRect frame;
    size_t maxInclOffset;

    ImageDeets(CGImageRef latestImage, MWRect frame) {
        this->frame = frame;
        this->imageRef = latestImage;
        CGDataProviderRef provider = CGImageGetDataProvider(latestImage);
        imageData = CGDataProviderCopyData(provider);

        bytesPerRow = CGImageGetBytesPerRow(latestImage);
        bytesPerPixel = CGImageGetBitsPerPixel(latestImage) / 8;

        info = CGImageGetBitmapInfo(latestImage);
        maxInclOffset = getPixelOffset(frame.w - 1, frame.h - 1);
    }

    size_t getPixelOffset(int x, int y) {
        return y*bytesPerRow + x*bytesPerPixel;
    }

    bool isWithinBounds(int x, int y) {
        return x >= 0 && y >= 0 && getPixelOffset(x, y) <= maxInclOffset;
    }

    MWColor colorAt(int x, int y) {
        size_t offset = getPixelOffset(x, y);
        const UInt8* dataPtr = CFDataGetBytePtr(imageData);

        int alpha = dataPtr[offset + 3],
            red = dataPtr[offset + 2],
            green = dataPtr[offset + 1],
            blue = dataPtr[offset + 0];
        return MWColor{red, green, blue};
    }

    ~ImageDeets() {
        CFRelease(imageRef);
        if (imageData != NULL) {
            CFRelease(imageData);
        }
    }
};

class BitwigWindow {
    int index;
    bool arrangerDirty;
    XYPoint mouseDownAt;
    int mouseDownButton;
    MWRect lastBWFrame;
    ImageDeets* latestImageDeets;

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
        if (latestImageDeets != nullptr) {
            delete latestImageDeets;
        }
        auto image = CGDisplayCreateImageForRect(CGMainDisplayID(), CGRectMake(
            lastBWFrame.x,
            lastBWFrame.y,
            lastBWFrame.w,
            lastBWFrame.h
        ));
        latestImageDeets = new ImageDeets(image, lastBWFrame);
    }

    /**
     * Each Bitwig window gets passed all mouse/keyboard events (the same ones that get passed to 
     * our JS callbacks) so it can update its internal state accordingly
     */
    void processEvent(JSEvent* event) {
        // TODO events appear to be coming through more than once, why? Investigate
        // std::cout << "Got event!" << event->type << '\n';

        if (event->type == "mousedown") {
            mouseDownAt = XYPoint({event->x, event->y});
            mouseDownButton = event->button;
        } else if (event->type == "mouseup") {
            // updateScreenshot();
            // auto frame = getFrame();
            // auto bwX = event->x - frame.x;
            // auto bwY = event->y - frame.y;
            // if (latestImageDeets->isWithinBounds(bwX, bwY)) {
            //     auto color = latestImageDeets->colorAt(bwX, bwY);
            //     std::cout << "Color is r: " << color.r << " g: " << color.g << " b: " << color.b;
            //     std::cout.flush();
            // }
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

    addEventListener(EventListenerSpec{
        "mouseup",
        [](JSEvent* event) -> void {
            mainWindow->processEvent(event);
        },
        nullptr,
        nullptr
    });

    addEventListener(EventListenerSpec{
        "keyup",
        [](JSEvent* event) -> void {
            mainWindow->processEvent(event);
        },
        nullptr,
        nullptr
    });

    // obj.Set(Napi::String::New(env, "getFrame"), Napi::Function::New(env, GetFrame));
    // obj.Set(Napi::String::New(env, "getMainScreen"), Napi::Function::New(env, GetMainScreen));
    // obj.Set(Napi::String::New(env, "closePluginWindows"), Napi::Function::New(env, ClosePluginWindows));
    exports.Set("UI", obj);
    return exports;
}

