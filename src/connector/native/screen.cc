// #include "rect.h"
// #include "point.h"
// #include "color.h"
#include "screen.h"

Napi::Object Screenshot::Init(Napi::Env env, Napi::Object exports)
{
    // This method is used to hook the accessor and method callbacks
    Napi::Function func = DefineClass(env, "Screenshot", {
        // InstanceMethod<&Screenshot::ColorAt>("ColorAt"), 
    });
    // Napi::FunctionReference *constructor = new Napi::FunctionReference();
    // *constructor = Napi::Persistent(func);
    exports.Set("Screenshot", func);
    // env.SetInstanceData<Napi::FunctionReference>(constructor);
    return exports;
}

Screenshot::Screenshot(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Screenshot>(info) {
    // auto rect = BESRect::Unwrap(info[0].As<Napi::Object>());
    // image = CGDisplayCreateImageForRect(CGMainDisplayID(), rect->asCGRect());
}

Screenshot::~Screenshot() {
   #if defined(IS_MACOSX)
   CFRelease(image);
   if (dataRef != NULL) {
    CFRelease(dataRef);
    CFRelease(colorSpace);
   }
   #endif
}

/*
// Napi::Value Screenshot::ColorAt(const Napi::CallbackInfo &info)
// {
    // return null;
    // Napi::Env env = info.Env();
    // CGPoint point = BESPoint::Unwrap(info[0].As<Napi::Object>())->asCGPoint();

    // UInt16 x = (UInt16)point.x, y = (UInt16)point.y;
    // CGImageRef imageRef = this->image;
    
    // if (dataRef == NULL) {
    //     // cache the dataptr because creating it initially requires
    //     // copying a load of data (slow!)
    //     CGDataProviderRef provider = CGImageGetDataProvider(imageRef);
    //     dataRef = CGDataProviderCopyData(provider);
    //     colorSpace = CGImageGetColorSpace(imageRef);
    // }
    
    // const UInt8* dataPtr = CFDataGetBytePtr(dataRef);
    // CGBitmapInfo info = CGImageGetBitmapInfo(imageRef);
    // CGImageComponentLayout componentLayout = CGBitmapInfoComponentLayout(info);

    // size_t bytesPerRow = CGImageGetBytesPerRow(imageRef);
    // size_t bytesPerPixel = CGImageGetBitsPerPixel(imageRef) / 8;
    // size_t pixelOffset = y*bytesPerRow + x*bytesPerPixel;
    // UInt8 alpha = 255, green = 0, blue = 0, red = 0;
    
    // if (componentLayout != kRGB && componentLayout != kBGR) {
    //     UInt8 components[] = {
    //         dataPtr[pixelOffset + 0],
    //         dataPtr[pixelOffset + 1],
    //         dataPtr[pixelOffset + 2],
    //         dataPtr[pixelOffset + 3]
    //     };

    //     switch (componentLayout) {
    //         case kBGRA:
    //             alpha = components[3];
    //             red = components[2];
    //             green = components[1];
    //             blue = components[0];
    //             break;
    //         case kABGR:
    //             alpha = components[0];
    //             red = components[3];
    //             green = components[2];
    //             blue = components[1];
    //             break;
    //         case kARGB:
    //             alpha = components[0];
    //             red = components[1];
    //             green = components[2];
    //             blue = components[3];
    //             break;
    //         case kRGBA:
    //             alpha = components[3];
    //             red = components[0];
    //             green = components[1];
    //             blue = components[2];
    //             break;
    //         case kBGR:
    //         case kRGB:
    //             break;
    //     }

    //     // If chroma components are premultiplied by alpha and the alpha is `0`,
    //     // keep the chroma components to their current values.
    //     if (CGBitmapInfoChromaIsPremultipliedByAlpha(info) && alpha != 0) {
    //         CGFloat invUnitAlpha = 255/(CGFloat)alpha;
    //         // TODO these need rounding
    //         red = (UInt8) ((CGFloat)red * invUnitAlpha);
    //         green = (UInt8) ((CGFloat)green * invUnitAlpha);
    //         blue = (UInt8) ((CGFloat)blue * invUnitAlpha);
    //     }

    //     return [NSColor colorWithDeviceRed:red green:green blue:blue alpha:alpha];
    // } else {
    //     UInt8 components[] = {
    //         dataPtr[pixelOffset + 0],
    //         dataPtr[pixelOffset + 1],
    //         dataPtr[pixelOffset + 2]
    //     };

    //     switch (componentLayout) {
    //         case kBGR:
    //             red = components[2];
    //             green = components[1];
    //             blue = components[0];
    //             break;
    //         case kRGB:
    //             red = components[0];
    //             green = components[1];
    //             blue = components[2];
    //             break;
    //         case kBGRA:
    //         case kABGR:
    //         case kARGB:
    //         case kRGBA:
    //             break;
    //      }
    // }
    
    // CGFloat floatComponents[] = {
    //     red / 255.0,
    //     green / 255.0,
    //     blue / 255.0,
    //     1.0
    // };

    // NSColorSpace* screenshotSpace = [[NSColorSpace alloc] initWithCGColorSpace:self->colorSpace];
    // return (NSColor* _Nonnull) [[NSColor colorWithColorSpace:screenshotSpace components:floatComponents count:4] colorUsingColorSpace:[NSColorSpace genericRGBColorSpace]];
// }

*/