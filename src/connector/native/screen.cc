#include <CoreGraphics/CoreGraphics.h>
#include "rect.h"
#include "point.h"
#include "color.h"
#include "screen.h"
#include <iostream>

Screenshot::Screenshot(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Screenshot>(info) {
    auto obj = info[0].As<Napi::Object>();
    auto rect = CGRectMake(
        (CGFloat)obj.Get("x").As<Napi::Number>(),
        (CGFloat)obj.Get("y").As<Napi::Number>(),
        (CGFloat)obj.Get("w").As<Napi::Number>(),
        (CGFloat)obj.Get("h").As<Napi::Number>()
    );
    image = CGDisplayCreateImageForRect(CGMainDisplayID(), rect);
}

Screenshot::~Screenshot() {
   CGImageRelease(image);
   if (dataRef != NULL) {
    CFRelease(dataRef);
    // CFRelease(colorSpace);
   }
}

Napi::Value Screenshot::ColorAt(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    auto obj = info[0].As<Napi::Object>();
    size_t x = (int)obj.Get("x").As<Napi::Number>(), y = (int)obj.Get("y").As<Napi::Number>();
    CGImageRef imageRef = this->image;
    
    if (dataRef == NULL) {
        // cache the dataptr because creating it initially requires
        // copying a load of data (slow!)
        CGDataProviderRef provider = CGImageGetDataProvider(imageRef);
        dataRef = CGDataProviderCopyData(provider);
        // colorSpace = CGImageGetColorSpace(imageRef);
    }
    
    // const UInt8* dataPtr = CFDataGetBytePtr(dataRef);
    // size_t bytesPerRow = CGImageGetBytesPerRow(imageRef);
    // size_t bytesPerPixel = CGImageGetBitsPerPixel(imageRef) / 8;
    // size_t pixelOffset = y*bytesPerRow + x*bytesPerPixel;
    // UInt8 alpha = 255, green = 0, blue = 0, red = 0;
    // UInt8 components[] = {
    //     dataPtr[pixelOffset + 0],
    //     dataPtr[pixelOffset + 1],
    //     dataPtr[pixelOffset + 2],
    //     dataPtr[pixelOffset + 3]
    // };

    auto outObj = Napi::Object::New(env);
    // alpha = components[0];
    // outObj["r"] = components[1];
    // outObj["g"] = components[2];
    // outObj["b"] = components[3];
    outObj["r"] = 0;
    outObj["g"] = 0;
    outObj["b"] = 0;
    return outObj;
}

Napi::Object Screenshot::Init(Napi::Env env, Napi::Object exports)
{
    Napi::Function func = DefineClass(env, "Screenshot", {
        InstanceMethod<&Screenshot::ColorAt>("colorAt")
    });
    // Napi::FunctionReference* constructor = new Napi::FunctionReference();
    exports.Set("Screenshot", func);
    return exports;
}
