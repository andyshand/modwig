#include "ui.h"
#include "screen.h"
#include "keyboard.h"
#include "string.h"
#include <iostream>
#include <vector>
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <experimental/optional>
#include <functional>
#include <map>
#include <algorithm>

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

std::experimental::optional<BitwigLayout> prevLayout;

// These are colors for midtones 28, black level 36
// BenQ screen
// MWColor trackSelectedColorActive = MWColor{141, 141, 141};
// MWColor trackSelectedColorInactive = MWColor{97, 97, 97};
// MWColor trackColor = MWColor{97, 97, 97};
// MWColor panelBorder = MWColor{104, 104, 104};
// MWColor trackAutomationBg = MWColor{34, 34, 34};
// MWColor trackDivider = MWColor{6, 6, 6};
// MWColor panelBorderInactive = MWColor{68, 68, 68};
// MWColor panelOpenIcon = MWColor{240, 109, 39};
// MWColor modalBgColor = MWColor{35, 35, 35};

MWColor trackSelectedColorActive = MWColor{97, 97, 97};
MWColor trackSelectedColorInactive = MWColor{97, 97, 97};
MWColor trackColor = MWColor{68, 68, 68};
MWColor panelBorder = MWColor{104, 104, 104};
MWColor trackAutomationBg = MWColor{34, 34, 34};
MWColor trackDivider = MWColor{6, 6, 6};
MWColor panelBorderInactive = MWColor{68, 68, 68};
MWColor panelOpenIcon = MWColor{236, 113, 37};
MWColor modalBgColor = MWColor{35, 35, 35};

const std::string 
    BITWIG_HEADER_HEIGHT = "BITWIG_HEADER_HEIGHT",
    BITWIG_HEADER_TOOLBAR_HEIGHT = "BITWIG_HEADER_TOOLBAR_HEIGHT",
    BITWIG_FOOTER_HEIGHT = "BITWIG_FOOTER_HEIGHT",
    INSPECTOR_WIDTH = "INSPECTOR_WIDTH",
    ARRANGER_HEADER_HEIGHT = "ARRANGER_HEADER_HEIGHT",
    ARRANGER_FOOTER_HEIGHT = "ARRANGER_FOOTER_HEIGHT",
    AUTOMATION_LANE_MINIMUM_HEIGHT = "AUTOMATION_LANE_MINIMUM_HEIGHT",
    MINIMUM_DOUBLE_TRACK_HEIGHT = "MINIMUM_DOUBLE_TRACK_HEIGHT",
    MINIMUM_TRACK_HEIGHT = "MINIMUM_TRACK_HEIGHT";
std::map<std::string, int> constants = {
    {BITWIG_HEADER_HEIGHT, 82},
    {BITWIG_HEADER_TOOLBAR_HEIGHT, 48},
    {BITWIG_FOOTER_HEIGHT, 36},
    {INSPECTOR_WIDTH, 170},
    {ARRANGER_HEADER_HEIGHT, 42},
    {ARRANGER_FOOTER_HEIGHT, 26},
    {AUTOMATION_LANE_MINIMUM_HEIGHT, 53},
    {MINIMUM_DOUBLE_TRACK_HEIGHT, 45},
    {MINIMUM_TRACK_HEIGHT, 25}
};

int getConstant(std::string key, bool scaleIt = false) {
    return scaleIt ? scale(constants[key]) : constants[key];
}

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
    obj.Set("visibleRect", visibleRect.toJSObject(env));
    obj.Set("selected", selected);
    obj.Set("automationOpen", automationOpen);
    obj.Set("isLargeTrackHeight", isLargeTrackHeight);
    return obj;
}
ArrangerTrack ArrangerTrack::fromJSObject(Napi::Object obj, Napi::Env env) {
    // Unimplemented
    return ArrangerTrack{};
}

Napi::Object EditorPanel::toJSObject(Napi::Env env) { 
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("rect", rect.toJSObject(env));
    obj.Set("type", type);
    return obj;
}

Napi::Object Inspector::toJSObject(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("rect", rect.toJSObject(env));
    return obj;
}

Napi::Object Arranger::toJSObject(Napi::Env env) { 
    Napi::Object obj = Napi::Object::New(env);
    obj.Set("rect", rect.toJSObject(env));
    return obj;
}

Napi::Object BitwigLayout::toJSObject(Napi::Env env) {
    Napi::Object obj = Napi::Object::New(env);
    if (!!this->editor) {
        obj.Set("editor", (*this->editor).toJSObject(env));
    }
    if (!!this->inspector) {
        obj.Set("inspector", (*this->inspector).toJSObject(env));
    }
    if (!!this->arranger) {
        obj.Set("arranger", (*this->arranger).toJSObject(env));
    }
    obj.Set("modalOpen", this->modalOpen);
    return obj;
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
    CFRelease(imageData);
};

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

int BitwigWindow::getMainPanelStartY() {
    auto frame = this->lastBWFrame.frame;
    auto headerHeight = getConstant(BITWIG_HEADER_HEIGHT);
    if (frame.w <= 1440) {
        // TODO check exact height of switch, but toolbar will dock down below when there's not enough room for it
        // Could be dynamic 😬  may need to do some pixel hunting
        auto toolbarHeight = getConstant(BITWIG_HEADER_TOOLBAR_HEIGHT);
        return headerHeight + toolbarHeight;
    }
    return headerHeight;
}

BitwigLayout BitwigWindow::getLayoutState() {
    if (prevLayout) {
        return *prevLayout;
    }

    auto layout = BitwigLayout();
    auto screenshot = this->updateScreenshot();
    auto tracks = std::vector<ArrangerTrack>();

    auto frame = this->lastBWFrame.frame;
    if (screenshot->colorAt(frame.fromBottomLeft(scale(2), scale(2))).r == modalBgColor.r) {
        layout.modalOpen = true;
        return layout;
    }

    auto inspectorOpen = screenshot->colorAt(frame.fromBottomLeft(scale(20), scale(17))).r == panelOpenIcon.r;
    auto arrangerStartY = this->getMainPanelStartY();
    if (inspectorOpen) {
        layout.inspector = Inspector{
            .rect = MWRect{
                0,
                scale(arrangerStartY),
                getConstant(INSPECTOR_WIDTH, true),
                frame.h - scale(arrangerStartY + getConstant(BITWIG_FOOTER_HEIGHT))
            }
        };
    }

    auto arrangerStartX = inspectorOpen ? getConstant(INSPECTOR_WIDTH) : 4;
    auto arrangerTrackStartY = 42;
    auto minimumPossibleTrackWidth = 210;

    std::string panelOpen = "";
    if (uiScale == 1) {
        if (screenshot->colorAt(frame.fromBottomLeft(scale(276), scale(20))).isWithinRange(panelOpenIcon)) {
            panelOpen = "device";
        } else if (screenshot->colorAt(frame.fromBottomLeft(scale(309), scale(20))).isWithinRange(panelOpenIcon)) {
            panelOpen = "mixer";
        } else if (screenshot->colorAt(frame.fromBottomLeft(scale(250), scale(17))).isWithinRange(MWColor{153, 78, 32})) { 
            panelOpen = "automation"; // FIX ME
        } else if (screenshot->colorAt(frame.fromBottomLeft(scale(224), scale(18))).isWithinRange(panelOpenIcon)) {
            panelOpen = "detail";
        }
    } else if (uiScale == 1.25) {
        if (screenshot->colorAt(frame.fromBottomLeft(scale(271), scale(20))).isWithinRange(panelOpenIcon)) {
            panelOpen = "device";
        } else if (screenshot->colorAt(frame.fromBottomLeft(scale(309), scale(20))).isWithinRange(panelOpenIcon)) {
            panelOpen = "mixer";
        } else if (screenshot->colorAt(frame.fromBottomLeft(scale(250), scale(17))).isWithinRange(MWColor{153, 78, 32})) { 
            panelOpen = "automation"; // FIX ME
        } else if (screenshot->colorAt(frame.fromBottomLeft(scale(211), scale(14))).isWithinRange(panelOpenIcon)) {
            panelOpen = "detail";
        }
    }

    auto arrangerViewHeightPX = frame.h - scale(arrangerStartY + getConstant(BITWIG_FOOTER_HEIGHT));
    if (panelOpen != "") {
        // Find the horizontal split where the extra panel stops
        auto minimumExtraPanel = 108; // Minimum possible height of any extra panel 
        auto horizontalSplit = screenshot->seekUntilColor(
            XYPoint{
                scale(arrangerStartX + 1), 
                frame.h - scale(getConstant(BITWIG_FOOTER_HEIGHT) + (int)((float)minimumExtraPanel * .8)) 
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

        layout.editor = EditorPanel{
            .type = panelOpen,
            .rect = MWRect{
                scale(arrangerStartX),
                arrangerYBottomBorder.y,
                frame.w - scale(arrangerStartX),
                frame.h - getConstant(BITWIG_FOOTER_HEIGHT, true) - arrangerYBottomBorder.y
            }
        };
    }

    layout.arranger = Arranger{
        MWRect{
            scale(arrangerStartX),
            scale(arrangerStartY),
            frame.w - scale(arrangerStartX),
            arrangerViewHeightPX
        }
    };

    return layout;
}

Napi::Value BitwigWindow::GetArrangerTracks(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    auto layout = getLayoutState();
    auto screenshot = this->updateScreenshot();
    auto tracks = std::vector<ArrangerTrack>();

    auto frame = this->lastBWFrame.frame;

    if (layout.modalOpen || !layout.arranger) {
        std::cout << "Settings or popup open";
        return env.Null();
    }

    auto arrangerStartX = layout.inspector ? 170 : 4;
    auto arrangerStartY = this->getMainPanelStartY();
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
            return color.r == trackDivider.r;
        },
        AXIS_X,
        DIRECTION_RIGHT,
        2 // skip stays the same regardless of scale, we shouldn't lose that much speed and is safer
    ).value_or(XYPoint{-1, -1});

    // We gotta do 2 searches cause we could land on the horizontal line, which'll stunt our search
    // Only run this is the first one comes back with the same x coord. Barely uses any extra processing
    if (endOfTrackWidthPoint.x == startSearchPoint.x) {
        auto endOfTrackWidthPoint2 = screenshot->seekUntilColor(
            XYPoint{
                startSearchPoint.x,
                startSearchPoint.y + scale(5)
            },
            [](MWColor color) {
                return color.r == trackDivider.r;
            },
            AXIS_X,
            DIRECTION_RIGHT,
            2 // skip stays the same regardless of scale, we shouldn't lose that much speed and is safer
        ).value_or(XYPoint{-1, -1});
        if (endOfTrackWidthPoint2.x > endOfTrackWidthPoint.x) {
            endOfTrackWidthPoint = endOfTrackWidthPoint2;
        }
    }

    if (endOfTrackWidthPoint.x == -1) {
        std::cout << "Couldn't find track width";
        return env.Null();
    }

    auto trackWidthPX = endOfTrackWidthPoint.x - scale(arrangerStartX);
    auto arrangerViewHeightPX = (*layout.arranger).rect.h;
    auto minimumTrackHeight = isLargeTrackHeight 
        ? getConstant(MINIMUM_DOUBLE_TRACK_HEIGHT) 
        : getConstant(MINIMUM_TRACK_HEIGHT);
    auto tracksStartYPX = scale(arrangerStartY + getConstant(ARRANGER_HEADER_HEIGHT));
    auto minimumTrackHeightPX = scale(minimumTrackHeight);
    auto xSearchPX = scale(arrangerStartX) + (trackWidthPX - scale(1));
    int trackI = 0;
    auto tracksEndYPX = tracksStartYPX + arrangerViewHeightPX - scale(getConstant(ARRANGER_FOOTER_HEIGHT) + getConstant(ARRANGER_HEADER_HEIGHT));

    // Traverse down the arranger looking for pixels that are selection colour
    for (int y = tracksStartYPX; y < tracksEndYPX;) {
        auto trackBGColor = screenshot->colorAt(XYPoint{xSearchPX, y + scale(5)});
        if (trackBGColor.r == trackDivider.r && trackI != 0) {
            // Empty space, reached last track
            // Can't possibly be first track because no possible scroll position would allow for this (I don't think?)
            break;
        }
        ArrangerTrack track = ArrangerTrack{
            .isLargeTrackHeight = isLargeTrackHeight
        };
        track.selected = trackBGColor.r == trackSelectedColorActive.r || trackBGColor.r == trackSelectedColorInactive.r;

        int hiddenY = 0;
        // If we've hit automation straight away, the whole track "header" is offscreen, not much use
        // to us. We could maybe inform the user of this, but for simplicity just leave it out for now.
        bool skipTrack = trackBGColor.r <= trackAutomationBg.r;
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

            // If this is the first track, it could have been cut off, meaning the minimum height has no real meaning.
            // It could be 5 pixels high, only showing the bottom 5 pixels for example. Otherwise, any track after the first
            // should be showing full height (unless it's the last??? hmmm....)
            auto ySearchOffsetPX = trackI == 0 ? scale(2) : minimumTrackHeightPX;
            
            if (trackI == 0 && !skipTrack) {
                // First track could be cut off, work out how much by adding minimum height to automation start
                auto automationStart = screenshot->seekUntilColor(
                    XYPoint{
                        xSearchPX, 
                        y
                    },
                    [](MWColor color) {
                        return color.r == trackAutomationBg.r;
                    },
                    AXIS_Y,
                    DIRECTION_DOWN,
                    2
                );
                if (automationStart) {
                    // Difference between visible y and actual start y
                    hiddenY = y - ((*automationStart).y - minimumTrackHeightPX);
                }
            }

            end = screenshot->seekUntilColor(
                XYPoint{
                    xSearchPX, 
                    y + ySearchOffsetPX + (track.automationOpen ? scale(getConstant(AUTOMATION_LANE_MINIMUM_HEIGHT)) : 0)
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
            std::cout << "Fell off bottom edge of screen, stopping search";
            break;
        }
        end.y = std::min(tracksEndYPX, end.y);
        if (!skipTrack) {
            track.visibleRect = MWRect{
                scale(arrangerStartX),
                y,
                trackWidthPX,
                end.y - y
            };
            track.rect = MWRect{
                scale(arrangerStartX),
                y - hiddenY,
                trackWidthPX,
                (end.y - y) + hiddenY
            };
            tracks.push_back(track);
        }
        trackI++;
        y = end.y;
    };

    auto array = Napi::Array::New(env, tracks.size());
    for(unsigned long i = 0; i < tracks.size(); i++) {
        array[i] = tracks[i].toJSObject(env);
    }
    return array;
};

Napi::Value BitwigWindow::GetLayoutState(const Napi::CallbackInfo &info) {
    return this->getLayoutState().toJSObject(info.Env());
}

BitwigWindow::BitwigWindow(const Napi::CallbackInfo &info) : Napi::ObjectWrap<BitwigWindow>(info) {
    // Napi::Env env = info.Env();
    this->latestImageDeets = nullptr;
}
Napi::Value BitwigWindow::GetFrame(const Napi::CallbackInfo &info) {
    auto env = info.Env();
    return this->lastBWFrame.frame.toJSObject(env);
}
Napi::Object BitwigWindow::Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "BitwigWindow", {
        InstanceAccessor<&BitwigWindow::getRect>("rect"),
        InstanceMethod<&BitwigWindow::GetArrangerTracks>("_getArrangerTracks"),
        InstanceMethod<&BitwigWindow::GetLayoutState>("getLayoutState"),
        InstanceMethod<&BitwigWindow::GetTrackInsetAtPoint>("getTrackInsetAtPoint"),
        InstanceMethod<&BitwigWindow::PixelColorAt>("pixelColorAt"),
        InstanceMethod<&BitwigWindow::GetFrame>("getFrame")
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
            CFRelease(array);
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
    CFRelease(array);
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

Napi::Value updateUILayoutInfo(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto obj = info[0].As<Napi::Object>();
    if (obj.Has("scale")) {
        uiScale = obj.Get("scale").As<Napi::Number>();
    }
    if (obj.Has("isLargeTrackHeight")) {
        isLargeTrackHeight = obj.Get("isLargeTrackHeight").As<Napi::Boolean>();
    }
    if (obj.Has("layout")) {
        // TODO
    }
    return env.Null();
}

Napi::Value invalidateLayout(const Napi::CallbackInfo &info) {
    prevLayout = {};
    return info.Env().Null();
}

Napi::Value getSizeInfo(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    std::string str = info[0].As<Napi::String>();
    if (str == "minimumTrackHeight") {
        if (isLargeTrackHeight) {
            return Napi::Number::New(env, getConstant("MINIMUM_DOUBLE_TRACK_HEIGHT") * uiScale);
        } else {
            return Napi::Number::New(env, getConstant("MINIMUM_TRACK_HEIGHT") * uiScale);
        }
    }
    return Napi::Number::New(env, constants[str]);
}

Napi::Value InitUI(Napi::Env env, Napi::Object exports) {
    Napi::Object obj = Napi::Object::New(env);

    BitwigWindow::Init(env, obj);
    obj.Set(Napi::String::New(env, "updateUILayoutInfo"), Napi::Function::New(env, updateUILayoutInfo));
    obj.Set(Napi::String::New(env, "invalidateLayout"), Napi::Function::New(env, invalidateLayout));
    obj.Set(Napi::String::New(env, "getSizeInfo"), Napi::Function::New(env, getSizeInfo));
    exports.Set("UI", obj);
    return exports;
}