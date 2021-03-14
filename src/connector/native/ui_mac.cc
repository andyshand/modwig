#include "ui.h"
#include "string.h"
#include "rect.h"
#include <CoreGraphics/CoreGraphics.h>

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

ImageDeets::~ImageDeets() {
    CFRelease(imageRef);
    CFRelease(imageData);
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
    // std::cout << "updating screenshot" << std::endl;
    auto image = CGWindowListCreateImage(
        CGRectNull, 
        kCGWindowListOptionIncludingWindow, 
        this->lastBWFrame.windowId, 
        kCGWindowImageBoundsIgnoreFraming | kCGWindowImageNominalResolution
    );
    latestImageDeets = new ImageDeets(image, lastBWFrame);
    return latestImageDeets;
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