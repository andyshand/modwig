#include "ui.h"
#include "screen.h"
#include "keyboard.h"
#include "string.h"
#include <iostream>
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <functional>
#include <experimental/optional>

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

int DIRECTION_UP = -1;
int DIRECTION_DOWN = 1;
int DIRECTION_LEFT = -1;
int DIRECTION_RIGHT = 1;
int AXIS_X = 0;
int AXIS_Y = 1;

struct ImageDeets {
    CFDataRef imageData;
    size_t bytesPerRow;
    size_t bytesPerPixel;
    CGImageRef imageRef;
    CGBitmapInfo info;
    MWRect frame;
    size_t maxInclOffset;
    int width, height;

    ImageDeets(CGImageRef latestImage, MWRect frame) {
        this->frame = frame;
        this->imageRef = latestImage;
        CGDataProviderRef provider = CGImageGetDataProvider(latestImage);
        imageData = CGDataProviderCopyData(provider);

        bytesPerRow = CGImageGetBytesPerRow(latestImage);
        bytesPerPixel = CGImageGetBitsPerPixel(latestImage) / 8;

        info = CGImageGetBitmapInfo(latestImage);
        width = frame.w;
        height = frame.h;
        maxInclOffset = getPixelOffset(XYPoint{width - 1, height - 1});
    }

    size_t getPixelOffset(XYPoint point) {
        return point.y*bytesPerRow + point.x*bytesPerPixel;
    }

    bool isWithinBounds(XYPoint point) {
        return point.x >= 0 && point.y >= 0 && getPixelOffset(point) <= maxInclOffset;
    }

    MWColor colorAt(XYPoint point) {
        size_t offset = getPixelOffset(point);
        const UInt8* dataPtr = CFDataGetBytePtr(imageData);

        // int alpha = dataPtr[offset + 3],
        int red = dataPtr[offset + 2],
            green = dataPtr[offset + 1],
            blue = dataPtr[offset + 0];
        return MWColor{red, green, blue};
    }

    std::experimental::optional<XYPoint> seekUntilColor(
        XYPoint startPoint,
        std::function<bool(MWColor)> tester, 
        int changeAxis,
        int direction, 
        int step = 1
    ) {
        auto isYChanging = changeAxis == AXIS_Y;
        auto endChange = isYChanging ? height - 1 : width - 1;
        if (direction == DIRECTION_UP || direction == DIRECTION_LEFT) {
            endChange = 0;
        }
        int start = isYChanging ? startPoint.y : startPoint.x;
        
        for (int i = start; i != endChange; i += (direction * step)) {
            auto point = isYChanging ? XYPoint{startPoint.x, i} : XYPoint{i, startPoint.y};
            auto colorAtPoint = colorAt(point);
            auto pointMatches = tester(colorAtPoint);
            if (pointMatches) {
                if (abs(step) > 1) {
                    // Backtrack to find earliest match that we may have missed
                    for (int b = i; b != i - (direction * step); b += direction) {
                        auto point = isYChanging ? XYPoint{startPoint.x, b} : XYPoint{b, startPoint.y};
                        auto colorAtPoint = colorAt(point);
                        auto pointMatches = tester(colorAtPoint);
                        if (pointMatches) {
                            return point;
                        }
                    }
                }
                return point;
            }
        }

        return {};
    }

    ~ImageDeets() {
        CFRelease(imageRef);
        if (imageData != NULL) {
            CFRelease(imageData);
        }
    }
};

class BitwigWindow {
    int index = 0;
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

