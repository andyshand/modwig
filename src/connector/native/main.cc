#include <napi.h>

#if defined(IS_MACOS)
  #include <CoreFoundation/CoreFoundation.h>
  #include <ApplicationServices/ApplicationServices.h>
#endif

#include "bitwig.h"
#include "point.h"
#include "rect.h"
#include "mouse.h"
#include "events.h"
#include "window.h"
#include "ui.h"
#include <iostream>

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  try {
    BESPoint::Init(env, exports);
    BESRect::Init(env, exports);
    InitKeyboard(env, exports);
    InitMouse(env, exports);
    InitWindow(env, exports);
    InitBitwig(env, exports);
    InitUI(env, exports);
    return exports;
  } catch (const std::exception &e) {
    std::cerr << e.what() << std::endl;
  } catch (...){
    std::cout << "OMG! an unexpected exception has been caught" << std::endl;
  }
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)