#include <napi.h>
#include <CoreFoundation/CoreFoundation.h>
#include <ApplicationServices/ApplicationServices.h>

#include "bitwig.h"
#include "color.h"
#include "point.h"
#include "rect.h"
#include "mouse.h"
#include "keyboard.h"
#include "screen.h"
#include "window.h"
#include "ui.h"
#include <iostream>

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  try {
    BESColor::Init(env, exports);
    BESPoint::Init(env, exports);
    BESRect::Init(env, exports);
    InitKeyboard(env, exports);
    InitMouse(env, exports);
    InitWindow(env, exports);
    InitBitwig(env, exports);
    InitUI(env, exports);
    return Screenshot::Init(env, exports); 
  } catch (const std::exception &e) {
    std::cerr << e.what() << std::endl;
  } catch (...){
    std::cout << "OMG! an unexpected exception has been caught" << std::endl;
  }
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)