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
    return WindowInfo{
        MWRect{ 
            0, 0, 0, 0
        }
    };
};