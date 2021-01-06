#include "ui.h"
#include "screen.h"
#include "keyboard.h"
#include "string.h"
#include <iostream>
#include <vector>
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <functional>
#include <experimental/optional>

float uiScale = 1;
int scale(int point) {
    return (int)round((float)point * uiScale);
}
std::string uiLayout = "Single Display (Large)";
bool isLargeTrackHeight = true;

int DIRECTION_UP = -1;
int DIRECTION_DOWN = 1;
int DIRECTION_LEFT = -1;
int DIRECTION_RIGHT = 1;
int AXIS_X = 0;
int AXIS_Y = 1;

// Includes padding between panel borders, but not the borders
int BITWIG_FOOTER_HEIGHT = 36;
int BITWIG_HEADER_HEIGHT = 82;
int ARRANGER_HEADER_HEIGHT = 42;
int ARRANGER_FOOTER_HEIGHT = 26;
int AUTOMATION_LANE_MINIMUM_HEIGHT = 53;

// These are colors for midtones 28, black level 36
MWColor trackSelectedColorActive = MWColor{141, 141, 141};
MWColor trackSelectedColorInactive = MWColor{97, 97, 97};
MWColor trackColor = MWColor{97, 97, 97};
MWColor panelBorder = MWColor{104, 104, 104};
MWColor trackDivider = MWColor{6, 6, 6};
MWColor panelBorderInactive = MWColor{68, 68, 68};
MWColor panelOpenIcon = MWColor{240, 109, 39};
MWColor panelClosedIcon = MWColor{190, 190, 190};
MWColor panelButtonHover = MWColor{255, 255, 255};

/**
 * XYPoint
 */
Napi::Object XYPoint::toJSObject(Napi::Env env) {
    auto obj = Napi::Object::New(env);
    obj.Set("x", x);
    obj.Set("y", y);
    return obj;
}
XYPoint XYPoint::fromJSObject(Napi::Object obj, Napi::Env env) {
    return XYPoint{
        obj.Get("x").As<Napi::Number>(),
        obj.Get("y").As<Napi::Number>()
    };
}

/**
 * MWRect
 */
Napi::Object MWRect::toJSObject(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, x));
    obj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, y));
    obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, w));
    obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, h));
    return obj;
};
MWRect MWRect::fromJSObject(Napi::Object obj, Napi::Env env) {
    return MWRect{
        obj.Get("x").As<Napi::Number>(),
        obj.Get("y").As<Napi::Number>(),
        obj.Get("w").As<Napi::Number>(),
        obj.Get("h").As<Napi::Number>(),
    };
};
XYPoint MWRect::fromBottomLeft(int x1, int y1) {
    return XYPoint{x + x1, y + h - y1};
}
XYPoint MWRect::fromTopLeft(int x1, int y1) {
    return XYPoint{x + x1, y + y1};
}
XYPoint MWRect::fromTopRight(int x1, int y1) {
    return XYPoint{x + w - x1, y + y1};
}
XYPoint MWRect::fromBottomRight(int x1, int y1) {
    return XYPoint{x + w - x1, y + h - y1};
}

/**
 * MWColor
 */
Napi::Object MWColor::toJSObject(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "r"), Napi::Number::New(env, r));
    obj.Set(Napi::String::New(env, "g"), Napi::Number::New(env, g));
    obj.Set(Napi::String::New(env, "b"), Napi::Number::New(env, b));
    return obj;
};
MWColor MWColor::fromJSObject(Napi::Object obj, Napi::Env env) {
    return MWColor{
        obj.Get("r").As<Napi::Number>(),
        obj.Get("g").As<Napi::Number>(),
        obj.Get("b").As<Napi::Number>()
    };
};
bool MWColor::isWithinRange(MWColor other, int amount) {
    return abs(other.r - r) < amount && abs(other.g - g) < amount && abs(other.b - b) < amount;
};

/**
 * ArrangerTrack
 */ 
Napi::Object ArrangerTrack::toJSObject(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("rect", rect.toJSObject(env));
    obj.Set("selected", selected);
    obj.Set("automationOpen", automationOpen);
    return obj;
}
ArrangerTrack ArrangerTrack::fromJSObject(Napi::Object obj, Napi::Env env) {
    // Unimplemented
    return ArrangerTrack{};
}

bool operator==(const MWRect& lhs, const MWRect& rhs)
{
    return lhs.x == rhs.x && lhs.y == rhs.y && lhs.w == rhs.w && lhs.h == rhs.h;
};
bool operator==(const XYPoint& lhs, const XYPoint& rhs)
{
    return lhs.x == rhs.x && lhs.y == rhs.y;
};
bool operator==(const UIPoint& lhs, const UIPoint& rhs)
{
    return lhs.point == rhs.point && lhs.window == rhs.window;
};
bool operator==(const MWColor& lhs, const MWColor& rhs)
{
    return lhs.r == rhs.r && lhs.g == rhs.g && lhs.b == rhs.b;
};

/**
 * ImageDeets
 */
ImageDeets::ImageDeets(CGImageRef latestImage, WindowInfo frame) {
    this->frame = frame;
    this->imageRef = latestImage;
    CGDataProviderRef provider = CGImageGetDataProvider(latestImage);
    imageData = CGDataProviderCopyData(provider);

    bytesPerRow = CGImageGetBytesPerRow(latestImage);
    bytesPerPixel = CGImageGetBitsPerPixel(latestImage) / 8;

    info = CGImageGetBitmapInfo(latestImage);
    width = frame.frame.w;
    height = frame.frame.h;
    maxInclOffset = getPixelOffset(XYPoint{width - 1, height - 1});
};

size_t ImageDeets::getPixelOffset(XYPoint point) {
    return (size_t)lround(point.y*bytesPerRow) + (size_t)lround(point.x*bytesPerPixel);
};

bool ImageDeets::isWithinBounds(XYPoint point) {
    return point.x >= 0 && point.y >= 0 && getPixelOffset(point) <= maxInclOffset;
};

MWColor ImageDeets::colorAt(XYPoint point) {
    size_t offset = getPixelOffset(point);
    if (offset >= maxInclOffset) {
        std::cout << "Offset outside range";
        return MWColor{0, 0, 0};
    }
    const UInt8* dataPtr = CFDataGetBytePtr(imageData);

    // int alpha = dataPtr[offset + 3],
    int red = dataPtr[offset + 2],
        green = dataPtr[offset + 1],
        blue = dataPtr[offset + 0];
    return MWColor{red, green, blue};
};

std::experimental::optional<XYPoint> ImageDeets::seekUntilColor(
    XYPoint startPoint,
    std::function<bool(MWColor)> tester, 
    int changeAxis,
    int direction, 
    int step
) {
    auto isYChanging = changeAxis == AXIS_Y;
    auto endChange = isYChanging ? height - 1 : width - 1;
    auto decreasing = direction == DIRECTION_UP || direction == DIRECTION_LEFT;
    if (decreasing) {
        endChange = 0;
    }
    int start = isYChanging ? startPoint.y : startPoint.x;
    
    for (int i = start; decreasing ? i >= endChange : i <= endChange; i += (direction * step)) {
        auto point = isYChanging ? XYPoint{startPoint.x, i} : XYPoint{i, startPoint.y};
        auto colorAtPoint = colorAt(point);
        auto pointMatches = tester(colorAtPoint);
        if (pointMatches) {
            if (abs(step) > 1 && i != start) {
                // Backtrack to find earliest match that we may have missed
                for (int b = i - direction; b != i - (direction * step); b -= direction) {
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
};

ImageDeets::~ImageDeets() {
    CFRelease(imageRef);
    if (imageData != NULL) {
        CFRelease(imageData);
    }
};

/**
 * BitwigUIComponent
 */
// Napi::FunctionReference BitwigUIComponent::constructor;
// Napi::Value BitwigUIComponent::getRect(const Napi::CallbackInfo &info) {
//     return this->rect.toJSObject(info.Env());
// }
// MWColor BitwigUIComponent::colorAt(XYPoint point) {
//     return MWColor{};
// }
// BitwigUIComponent::BitwigUIComponent(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BitwigUIComponent>(info) {
    
// }
// Napi::Object BitwigUIComponent::Init(Napi::Env env, Napi::Object exports) {
//     Napi::Function func = DefineClass(env, "BitwigWindow", {
//         InstanceAccessor<&BitwigUIComponent::getRect>("rect")
//     });
//     exports.Set("BitwigUIComponent", func);
//     BitwigUIComponent::constructor = Napi::Persistent(func);
//     BitwigUIComponent::constructor.SuppressDestruct();
// }

/**
 * BitwigUI
 */
// Napi::FunctionReference BitwigUI::constructor;
// void BitwigUI::processEvent(JSEvent* event) {};
// void BitwigUI::setFrame(MWRect frame) {
//     this->rect = frame;
// };
// void BitwigUI::ensureUpToDate() {
//     // We don't bother processing children that aren't requested, so only update
//     // children components as needed.
//     // 
//     // Store an id associated with the latest screenshot. When the ids match,
//     // The UI component can be considered up to date
// };
// Napi::Value BitwigUI::getRect(const Napi::CallbackInfo &info) {
//     return rect.toJSObject(info.Env());
// };
// BitwigUI::BitwigUI(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BitwigUI>(info) {
//     // For whatever reason our subclass doesn't run its constructor, 
//     // its ok since we currently only use BitwigWindow
//     BitwigWindow* that = (BitwigWindow*)this;
//     that->latestImageDeets = nullptr;
// }
// Napi::Object BitwigUI::Init(Napi::Env env, Napi::Object exports) {
//     Napi::Function func = DefineClass(env, "BitwigUI", {
//         InstanceAccessor<&BitwigUI::getRect>("rect")
//     });
//     BitwigUI::constructor = Napi::Persistent(func);
//     BitwigUI::constructor.SuppressDestruct();
// };



/**
 * BitwigWindow
 */
Napi::FunctionReference BitwigWindow::constructor;
MWColor BitwigWindow::colorAt(XYPoint point) {
    // TODO scaling logic here doesn't really work
    auto scaledPoint = XYPoint{
        (int)round((float)point.x * uiScale),
        (int)round((float)point.y * uiScale)
    };
    if (this->latestImageDeets == nullptr) {
        this->updateScreenshot();
    }
    auto screenshot = this->latestImageDeets;
    return screenshot->colorAt(scaledPoint);
}
Napi::Value BitwigWindow::PixelColorAt(const Napi::CallbackInfo &info) {
    auto env = info.Env();
    auto point = XYPoint::fromJSObject(info[0].As<Napi::Object>(), env);
    auto screenshot = this->updateScreenshot();
    return screenshot->colorAt(point).toJSObject(env);
}

Napi::Value BitwigWindow::GetTrackInsetAtPoint(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto point = XYPoint::fromJSObject(info[0].As<Napi::Object>(), env);
    BitwigWindow* that = (BitwigWindow*)this;
    
    auto screenshot = that->latestImageDeets;
    auto frame = that->lastBWFrame.frame;
    auto inspectorOpen = screenshot->colorAt(frame.fromBottomLeft(scale(20), scale(17))).r == panelOpenIcon.r;
    auto arrangerStartX = inspectorOpen ? 170 : 4;

    auto result = screenshot->seekUntilColor(
        XYPoint{
            scale(arrangerStartX + 1), 
            point.y
        },
        [](MWColor color) {
            return color == trackColor;
        },
        AXIS_X,
        DIRECTION_RIGHT,
        5
    ).value_or(XYPoint{-1, -1});
    return Napi::Number::New(env, result.x);
}

Napi::Value BitwigWindow::GetArrangerTracks(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    BitwigWindow* that = (BitwigWindow*)this;

    auto screenshot = that->updateScreenshot();
    auto tracks = std::vector<ArrangerTrack>();

    auto frame = that->lastBWFrame.frame;
    auto inspectorOpen = screenshot->colorAt(frame.fromBottomLeft(scale(20), scale(17))).r == panelOpenIcon.r;

    auto arrangerStartX = inspectorOpen ? 170 : 4;
    auto arrangerStartY = BITWIG_HEADER_HEIGHT;
    auto arrangerTrackStartY = 42;
    auto minimumPossibleTrackWidth = 210;
    // Includes border at top, but not bottom, since first track starts with top border

    // If we go too high here, the point will be affected by shadow from the top of arranger
    // view which alters the colours, 6 becomes 5 etc...
    auto startSearchPoint = XYPoint{
        scale(arrangerStartX + minimumPossibleTrackWidth),
        scale(arrangerStartY + arrangerTrackStartY + 15)
    };

    // Search right from minimum possible track width just a few Y pixels into first track. Of course, assumes arranger is open
    auto endOfTrackWidthPoint = screenshot->seekUntilColor(
        startSearchPoint,
        [](MWColor color) {
            return color.r == 6;
        },
        AXIS_X,
        DIRECTION_RIGHT,
        2 // skip stays the same regardless of scale, we shouldn't lose that much speed and is safer
    ).value_or(XYPoint{-1, -1});

    if (endOfTrackWidthPoint.x == -1) {
        std::cout << "Couldn't find track width";
        return env.Null();
    }

    auto trackWidthPX = endOfTrackWidthPoint.x - scale(arrangerStartX);

    std::string panelOpen = "";
    if (screenshot->colorAt(frame.fromBottomLeft(scale(271), scale(20))).isWithinRange(panelOpenIcon)) {
        panelOpen = "device";
    } else if (screenshot->colorAt(frame.fromBottomLeft(scale(309), scale(20))).isWithinRange(panelOpenIcon)) {
        panelOpen = "mixer";
    } else if (screenshot->colorAt(frame.fromBottomLeft(scale(250), scale(17))).isWithinRange(MWColor{153, 78, 32})) { 
        panelOpen = "automation"; // FIX ME
    } else if (screenshot->colorAt(frame.fromBottomLeft(scale(211), scale(14))).isWithinRange(panelOpenIcon)) {
        panelOpen = "detail";
    }

    auto arrangerViewHeightPX = frame.h - scale(arrangerStartY + BITWIG_FOOTER_HEIGHT);
    if (panelOpen != "") {
        // Find the horizontal split where the extra panel stops
        auto minimumExtraPanel = 108; // Minimum possible height of any extra panel 
        auto horizontalSplit = screenshot->seekUntilColor(
            XYPoint{
                scale(arrangerStartX + 1), 
                frame.h - scale(BITWIG_FOOTER_HEIGHT + (int)((float)minimumExtraPanel * .8)) 
            },
            [](MWColor color) {
                return color.r == panelBorder.r || color.r == panelBorderInactive.r;
            },
            AXIS_Y,
            DIRECTION_UP,
            2
        ).value_or(XYPoint{-1, -1});

        // Go up and right a bit so we can ensure we hit the flat edge of the border and not the rounded corners
        auto arrangerYBottomBorder = screenshot->seekUntilColor(
            XYPoint{horizontalSplit.x + scale(20), horizontalSplit.y - scale(3)},
            [](MWColor color) {
                return color.r == panelBorder.r || color.r == panelBorderInactive.r;
            },
            AXIS_Y,
            DIRECTION_UP,
            2
        ).value_or(XYPoint{-1, -1});
        arrangerViewHeightPX = arrangerYBottomBorder.y - scale(arrangerStartY);        
    }
    
    auto largeTrackHeightPoint = XYPoint{
        scale(arrangerStartX + 37),
        scale(arrangerStartY - 12) + arrangerViewHeightPX
    };
    isLargeTrackHeight = screenshot->colorAt(largeTrackHeightPoint).isWithinRange(panelOpenIcon);
    auto minimumTrackHeight = isLargeTrackHeight ? 45 : 25;
    auto tracksStartYPX = scale(arrangerStartY + ARRANGER_HEADER_HEIGHT);
    auto minimumTrackHeightPX = scale(minimumTrackHeight);
    auto xSearchPX = scale(arrangerStartX) + (trackWidthPX - scale(1));
    int trackI = 0;
    auto tracksEndYPX = tracksStartYPX + arrangerViewHeightPX - scale(ARRANGER_FOOTER_HEIGHT + ARRANGER_HEADER_HEIGHT);

    // Traverse down the arranger looking for pixels that are selection colour
    for (int y = tracksStartYPX; y < tracksEndYPX;) {
        auto trackBGColor = screenshot->colorAt(XYPoint{xSearchPX, y + scale(5)});
        if (trackBGColor.r == trackDivider.r && trackI != 0) {
            // Empty space, reached last track
            // Can't possibly be first track because no possible scroll position would allow for this (I don't think?)
            break;
        }
        ArrangerTrack track = ArrangerTrack{};
        track.selected = trackBGColor.r == trackSelectedColorActive.r || trackBGColor.r == trackSelectedColorInactive.r;

        auto trackEndXPX = scale(arrangerStartX) + trackWidthPX;
        auto automationTarget = XYPoint{
            trackEndXPX - scale(isLargeTrackHeight ? 21 : 36),
            y + scale(isLargeTrackHeight ? 33 : 14)
        };
        auto automationColor = screenshot->colorAt(automationTarget);
        track.automationOpen = automationColor.isWithinRange(MWColor{253, 115, 42});
        auto end = XYPoint{xSearchPX, y + minimumTrackHeightPX};
        if (track.automationOpen || screenshot->colorAt(end).r != trackDivider.r) {
            // Track height has been increased or automation is open
            end = screenshot->seekUntilColor(
                XYPoint{
                    xSearchPX, 
                    y + minimumTrackHeightPX + (track.automationOpen ? scale(AUTOMATION_LANE_MINIMUM_HEIGHT) : 0)
                },
                [](MWColor color) {
                    return color.r == trackDivider.r;
                },
                AXIS_Y,
                DIRECTION_DOWN,
                2
            ).value_or(XYPoint{-1, -1});
        }
        if (end.y == -1) {
            std::cout << "Fell off bottom edge of screen, returning";
            break;
        }
        track.rect = MWRect{
            scale(arrangerStartX),
            y,
            trackWidthPX,
            end.y - y
        };
        tracks.push_back(track);
        trackI++;
        y = end.y;
    };

    auto array = Napi::Array::New(env, tracks.size());
    for(unsigned long i = 0; i < tracks.size(); i++) {
        array[i] = tracks[i].toJSObject(env);
    }
    return array;
};

BitwigWindow::BitwigWindow(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BitwigWindow>(info) {
    // Napi::Env env = info.Env();
    this->latestImageDeets = nullptr;
}
Napi::Object BitwigWindow::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "BitwigWindow", {
        InstanceAccessor<&BitwigWindow::getRect>("rect"),
        InstanceMethod<&BitwigWindow::GetArrangerTracks>("getArrangerTracks"),
        InstanceMethod<&BitwigWindow::GetTrackInsetAtPoint>("getTrackInsetAtPoint"),
        InstanceMethod<&BitwigWindow::PixelColorAt>("pixelColorAt")
    });
    exports.Set("BitwigWindow", func);
    BitwigWindow::constructor = Napi::Persistent(func);
    BitwigWindow::constructor.SuppressDestruct();
};
Napi::Value BitwigWindow::getRect(const Napi::CallbackInfo &info) {
    return rect.toJSObject(info.Env());
};
WindowInfo BitwigWindow::getFrame() {
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
            CGWindowID windowId;
            CFNumberGetValue((CFNumberRef)CFDictionaryGetValue(dict, kCGWindowNumber), kCGWindowIDCFNumberType, &windowId);
            return WindowInfo{
                windowId,
                MWRect({ 
                    (int)windowRect.origin.x, 
                    (int)windowRect.origin.y,
                    (int)windowRect.size.width, 
                    (int)windowRect.size.height
                })
            };
        }
    }
    return WindowInfo{
        1,
        MWRect{0, 0, 0, 0}
    };
};

ImageDeets* BitwigWindow::updateScreenshot() {
    auto newFrame = getFrame();
    if (newFrame.frame.w == 0 && newFrame.frame.h == 0) {
        std::cout << "Couldn't find window, can't update screenshot";
        return latestImageDeets;
    }
    lastBWFrame = newFrame;
    if (latestImageDeets != nullptr) {
        delete latestImageDeets;
    }
    auto image = CGWindowListCreateImage(
        CGRectNull, 
        kCGWindowListOptionIncludingWindow, 
        this->lastBWFrame.windowId, 
        kCGWindowImageBoundsIgnoreFraming | kCGWindowImageNominalResolution
    );
    latestImageDeets = new ImageDeets(image, lastBWFrame);
    return latestImageDeets;
};

/**
 * Each Bitwig window gets passed all mouse/keyboard events (the same ones that get passed to 
 * our JS callbacks) so it can update its internal state accordingly
 */
// void BitwigWindow::processEvent(JSEvent* event) {
//     // TODO events appear to be coming through more than once, why? Investigate
//     // std::cout << "Got event!" << event->type << '\n';

//     if (event->type == "mousedown") {
//         mouseDownAt = XYPoint({event->x, event->y});
//         mouseDownButton = event->button;
//     } else if (event->type == "mouseup") {
//         // updateScreenshot();
//         // auto frame = getFrame();
//         // auto bwX = event->x - frame.x;
//         // auto bwY = event->y - frame.y;
//         // if (latestImageDeets->isWithinBounds(bwX, bwY)) {
//         //     auto color = latestImageDeets->colorAt(bwX, bwY);
//         //     std::cout << "Color is r: " << color.r << " g: " << color.g << " b: " << color.b;
//         //     std::cout.flush();
//         // }
//     }
// }

Napi::ObjectReference mainWindow;
// Napi::ObjectReference mainWindowRef;
// BitwigWindow* mainWindowUnwrapped;

Napi::Value updateUILayout(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto obj = info[0].As<Napi::Object>();
    if (obj.Has("scale")) {
        uiScale = obj.Get("scale").As<Napi::Number>();
    }
    if (obj.Has("layout")) {
        // TODO
    }
    return env.Null();
}

Napi::Value InitUI(Napi::Env env, Napi::Object exports) {
    Napi::Object obj = Napi::Object::New(env);

    // BitwigUI::Init(env, obj);
    BitwigWindow::Init(env, obj);

    // TODO figure out why we can't just do this?
    // mainWindow = Napi::Persistent(BitwigWindow::constructor.New({}));
    // mainWindow.SuppressDestruct();
    // mainWindowRef = Napi::Reference<Napi::Object>::New(mainWindowObj, 999);
    // mainWindowRef.SuppressDestruct();
    // auto mainWindowUnwrapped = (BitwigWindow*)BitwigWindow::Unwrap(mainWindowObj);
    // mainWindowUnwrapped->latestImageDeets = nullptr;

    // addEventListener(EventListenerSpec{
    //     "mouseup",
    //     [](JSEvent* event) -> void {
    //         mainWindow->processEvent(event);
    //     },
    //     nullptr,
    //     nullptr
    // });

    // addEventListener(EventListenerSpec{
    //     "keyup",
    //     [](JSEvent* event) -> void {
    //         mainWindow->processEvent(event);
    //     },
    //     nullptr,
    //     nullptr
    // });

    // obj.Set(Napi::String::New(env, "MainWindow"), mainWindow.Value());
    obj.Set(Napi::String::New(env, "updateUILayout"), Napi::Function::New(env, updateUILayout));
    exports.Set("UI", obj);
    return exports;
}