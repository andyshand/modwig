#pragma once
#include <napi.h>
#include "events.h"
#include "os.h"

struct XYPoint {
    int x, y;
    Napi::Object toJSObject(Napi::Env env);
    static XYPoint fromJSObject(Napi::Object obj, Napi::Env env);
};
struct UIPoint {
    int window;
    XYPoint point;
};
struct MWRect {
    int x, y, w, h;
    Napi::Object toJSObject(Napi::Env env);
    static MWRect fromJSObject(Napi::Object obj, Napi::Env env);
    XYPoint fromBottomLeft(int x, int y);
    XYPoint fromTopLeft(int x, int y);
    XYPoint fromTopRight(int x, int y);
    XYPoint fromBottomRight(int x, int y);
};
struct WindowInfo {
    #if defined(IS_MACOS)
        CGWindowID windowId;
    #endif
    MWRect frame;
};
struct MWColor {
    int r, g, b;
    Napi::Object toJSObject(Napi::Env env);
    static MWColor fromJSObject(Napi::Object obj, Napi::Env env);
    bool isWithinRange(MWColor b, int amount = 5);
};

struct EditorPanel {
    std::string type;
    MWRect rect;
    Napi::Object toJSObject(Napi::Env env);
};
struct Inspector {
    MWRect rect;
    Napi::Object toJSObject(Napi::Env env);
};
struct Arranger {
    MWRect rect;
    Napi::Object toJSObject(Napi::Env env);
};
struct BitwigLayout {
    optional<EditorPanel> editor;
    optional<Inspector> inspector;
    optional<Arranger> arranger;
    bool modalOpen;
    Napi::Object toJSObject(Napi::Env env);
};
struct ArrangerTrack {
    MWRect rect, visibleRect;
    bool selected, automationOpen, isLargeTrackHeight;
    Napi::Object toJSObject(Napi::Env env);
    static ArrangerTrack fromJSObject(Napi::Object obj, Napi::Env env);
};
struct ImageDeets {
    #if defined(IS_MACOS)
        CFDataRef imageData;
        CGImageRef imageRef;
        CGBitmapInfo info;
        ImageDeets(CGImageRef latestImage, WindowInfo frame);
    #endif
    
    size_t bytesPerRow;
    size_t bytesPerPixel;
    WindowInfo frame;
    size_t maxInclOffset;
    int width, height;
    ~ImageDeets();
    size_t getPixelOffset(XYPoint point);
    bool isWithinBounds(XYPoint point);
    MWColor colorAt(XYPoint point);

    optional<XYPoint> seekUntilColor(
        XYPoint startPoint,
        std::function<bool(MWColor)> tester, 
        int changeAxis,
        int direction, 
        int step = 1
    );
};

class BitwigWindow: public Napi::ObjectWrap<BitwigWindow> {
    public:
    static Napi::FunctionReference constructor;
    MWRect rect;
    int index = 0;
    bool arrangerDirty;
    XYPoint mouseDownAt;
    int mouseDownButton;
    WindowInfo lastBWFrame;
    MWColor colorAt(XYPoint point);
    ImageDeets* latestImageDeets = nullptr;
    WindowInfo getFrame();
    ImageDeets* updateScreenshot();
    BitwigLayout getLayoutState();
    int getMainPanelStartY();
    BitwigWindow(const Napi::CallbackInfo &info);

    static Napi::Object Init(Napi::Env env, Napi::Object exports);

    Napi::Value getRect(const Napi::CallbackInfo &info);
    Napi::Value PixelColorAt(const Napi::CallbackInfo &info);
    Napi::Value GetTrackInsetAtPoint(const Napi::CallbackInfo &info);
    Napi::Value GetFrame(const Napi::CallbackInfo &info);
    Napi::Value GetLayoutState(const Napi::CallbackInfo &info);
    Napi::Value GetArrangerTracks(const Napi::CallbackInfo &info);
};

Napi::Value InitUI(Napi::Env env, Napi::Object exports);