#include <napi.h>
#include <CoreFoundation/CoreFoundation.h>
#include <ApplicationServices/ApplicationServices.h>

#include "color.h"
#include "point.h"
#include "rect.h"
#include "mouse.h"
#include "keyboard.h"
#include "screen.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  BESColor::Init(env, exports);
  BESPoint::Init(env, exports);
  BESRect::Init(env, exports);
  BESMouse::Init(env, exports);
  BESKeyboard::Init(env, exports);
  return Screenshot::Init(env, exports);
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, InitAll)