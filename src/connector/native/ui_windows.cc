#include <windows.h>
#include "ui.h"
#include "string.h"
#include "rect.h"

ImageDeets::~ImageDeets() {

};

MWColor ImageDeets::colorAt(XYPoint point) {
    return MWColor{0, 0, 0};
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
    return new ImageDeets{};
};

WindowInfo BitwigWindow::getFrame() {
    auto outRect = MWRect();
    static auto runner = [&](HWND hWnd, LPARAM lParam) -> BOOL {
        char buff[255];
        GetClassName(
            hWnd,
            (LPTSTR) buff,
            254
        );
        if (strcmp(buff, "bitwig")) {
            RECT rect;
            GetWindowRect(hWnd, &rect);     
            outRect.x = rect.left;
            outRect.y = rect.top;
            outRect.w = rect.right - rect.left;
            outRect.h = rect.bottom - rect.top;
            return FALSE;
        }
        // continue the enumeration
        return TRUE;
    };
    EnumWindows([](HWND hWnd, LPARAM lParam) -> BOOL {
        return runner(hWnd, lParam);
    }, 0);
    return WindowInfo{
        outRect
    };
};