#include "keycodes.h"
#include <map>

#if defined(IS_MACOSX)
std::map<MWKeyCode,std::string> keycodeMap = {
  // Layout independent - will break on non-qwerty :(
  {0x00, "a"},
  {0x01, "s"},
  {0x02, "d"},
  {0x03, "f"},
  {0x04, "h"},
  {0x05, "g"},
  {0x06, "z"},
  {0x07, "x"},
  {0x08, "c"},
  {0x09, "v"},
  {0x0A, "§"},
  {0x0B, "b"},
  {0x0C, "q"},
  {0x0D, "w"},
  {0x0E, "e"},
  {0x0F, "r"},
  {0x10, "y"},
  {0x11, "t"},
  {0x12, "1"},
  {0x13, "2"},
  {0x14, "3"},
  {0x15, "4"},
  {0x16, "6"},
  {0x17, "5"},
  {0x18, "="},
  {0x19, "9"},
  {0x1A, "7"},
  {0x1B, "-"},
  {0x1C, "8"},
  {0x1D, "0"},
  {0x1E, "]"},
  {0x1F, "o"},
  {0x20, "u"},
  {0x21, "["},
  {0x22, "i"},
  {0x23, "p"},
  {0x25, "l"},
  {0x26, "j"},
  {0x27, "\'"},
  {0x28, "k"},
  {0x29, ";"},
  {0x2A, "\\"},
  {0x2B, ","},
  {0x2C, "/"},
  {0x2D, "n"},
  {0x2E, "m"},
  {0x2F, "."},
  {0x32, "`"},
  {0x41, "."},
  {0x43, "*"},
  {0x45, "+"},
  {0x47, "Clear"},
  {0x4B, "/"},
  {0x4C, "Enter"},
  {0x4E, "-"},
  {0x51, "="},
  {0x52, "Numpad0"},
  {0x53, "Numpad1"},
  {0x54, "Numpad2"},
  {0x55, "Numpad3"},
  {0x56, "Numpad4"},
  {0x57, "Numpad5"},
  {0x58, "Numpad6"},
  {0x59, "Numpad7"},
  {0x5B, "Numpad8"},
  {0x5C, "Numpad9"},

  // Keyboard layout independent (won't break)  
  {0x24, "Enter"},
  {0x30, "Tab"},
  {0x31, "Space"},
  {0x33, "Backspace"},
  {0x35, "Escape"},
  {0x37, "Meta"},
  {0x38, "Shift"},
  {0x39, "CapsLock"},
  {0x3A, "Alt"},
  {0x3B, "Control"},

  // These would get overwritten in the two way map (cause they have the same name)
  // Is this the right way to do it?
  {0x3C, "RightShift"},
  {0x3D, "RightAlt"},
  {0x3E, "RightControl"},

  {0x3F, "Fn"},
  {0x40, "F17"},
  {0x48, "VolumeUp"},
  {0x49, "VolumeDown"},
  {0x4A, "Mute"},
  {0x4F, "F18"},
  {0x50, "F19"},
  {0x5A, "F20"},
  {0x60, "F5"},
  {0x61, "F6"},
  {0x62, "F7"},
  {0x63, "F3"},
  {0x64, "F8"},
  {0x65, "F9"},
  {0x67, "F11"},
  {0x69, "F13"},
  {0x6A, "F16"},
  {0x6B, "F14"},
  {0x6D, "F10"},
  {0x6F, "F12"},
  {0x71, "F15"},
  {0x72, "Help"},
  {0x73, "Home"},
  {0x74, "PageUp"},
  {0x75, "Delete"},
  {0x76, "F4"},
  {0x77, "End"},
  {0x78, "F2"},
  {0x79, "PageDown"},
  {0x7A, "F1"},
  {0x7B, "ArrowLeft"},
  {0x7C, "ArrowRight"},
  {0x7D, "ArrowDown"},
  {0x7E, "ArrowUp"}
};
std::map<std::string, MWKeyCode> keycodeMapReverse;

#endif

#if defined(IS_WINDOWS)
#define WINVER 0x0500
#include "windows.h"

std::map<MWKeyCode,std::string> keycodeMap = {
  // Layout independent - will break on non-qwerty :(
  {0x00, "a"},
  {0x01, "s"},
  {0x02, "d"},
  {0x03, "f"},
  {0x04, "h"},
  {0x05, "g"},
  {0x06, "z"},
  {0x07, "x"},
  {0x08, "c"},
  {0x09, "v"},
  {0x0A, "§"},
  {0x0B, "b"},
  {0x0C, "q"},
  {0x0D, "w"},
  {0x0E, "e"},
  {0x0F, "r"},
  {0x10, "y"},
  {0x11, "t"},
  {0x12, "1"},
  {0x13, "2"},
  {0x14, "3"},
  {0x15, "4"},
  {0x16, "6"},
  {0x17, "5"},
  {0x18, "="},
  {0x19, "9"},
  {0x1A, "7"},
  {0x1B, "-"},
  {0x1C, "8"},
  {0x1D, "0"},
  {0x1E, "]"},
  {0x1F, "o"},
  {0x20, "u"},
  {0x21, "["},
  {0x22, "i"},
  {0x23, "p"},
  {0x25, "l"},
  {0x26, "j"},
  {0x27, "\'"},
  {0x28, "k"},
  {0x29, ";"},
  {0x2A, "\\"},
  {0x2B, ","},
  {0x2C, "/"},
  {0x2D, "n"},
  {0x2E, "m"},
  {0x2F, "."},
  {0x32, "`"},
  {0x41, "."},
  {0x43, "*"},
  {0x45, "+"},
  {0x47, "Clear"},
  {0x4B, "/"},
  {0x4C, "Enter"},
  {0x4E, "-"},
  {0x51, "="},
  {VK_NUMPAD0, "Numpad0"},
  {VK_NUMPAD1, "Numpad1"},
  {VK_NUMPAD2, "Numpad2"},
  {VK_NUMPAD3, "Numpad3"},
  {VK_NUMPAD4, "Numpad4"},
  {VK_NUMPAD5, "Numpad5"},
  {VK_NUMPAD6, "Numpad6"},
  {VK_NUMPAD7, "Numpad7"},
  {VK_NUMPAD8, "Numpad8"},
  {VK_NUMPAD9, "Numpad9"},

  // Keyboard layout independent (won't break)  
  {VK_RETURN, "Enter"},
  {VK_TAB, "Tab"},
  {VK_SPACE, "Space"},
  {VK_BACK, "Backspace"},
  {VK_ESCAPE, "Escape"},
  {VK_LWIN, "Meta"},
  {VK_SHIFT, "Shift"},
  {VK_CAPITAL, "CapsLock"},
  {VK_MENU, "Alt"},
  {VK_CONTROL, "Control"},

  // These would get overwritten in the two way map (cause they have the same name)
  // Is this the right way to do it?
  {VK_RSHIFT, "RightShift"},
  {VK_MENU, "RightAlt"},
  {VK_RCONTROL, "RightControl"},

//   {0x3F, "Fn"},
  {VK_F17, "F17"},
  {VK_VOLUME_UP, "VolumeUp"},
  {VK_VOLUME_DOWN, "VolumeDown"},
  {VK_VOLUME_MUTE, "Mute"},
  {VK_F18, "F18"},
  {VK_F19, "F19"},
  {VK_F20, "F20"},
  {VK_F5, "F5"},
  {VK_F6, "F6"},
  {VK_F7, "F7"},
  {VK_F3, "F3"},
  {VK_F8, "F8"},
  {VK_F9, "F9"},
  {VK_F11, "F11"},
  {VK_F13, "F13"},
  {VK_F16, "F16"},
  {VK_F14, "F14"},
  {VK_F10, "F10"},
  {VK_F12, "F12"},
  {VK_F15, "F15"},
  {0x72, "Help"},
  {0x73, "Home"},
  {0x74, "PageUp"},
  {0x75, "Delete"},
  {VK_F4, "F4"},
  {0x77, "End"},
  {VK_F2, "F2"},
  {0x79, "PageDown"},
  {VK_F1, "F1"},
  {VK_LEFT, "ArrowLeft"},
  {VK_RIGHT, "ArrowRight"},
  {VK_DOWN, "ArrowDown"},
  {VK_UP, "ArrowUp"}
};
std::map<std::string, MWKeyCode> keycodeMapReverse;
#endif

MWKeyCode keyCodeForString(std::string str) {
    if (keycodeMapReverse.size() == 0) {
        // Initalise our reverse map
        auto it = keycodeMap.begin();
        while(it != keycodeMap.end()) {
            keycodeMapReverse[it->second] = it->first;
            it++;
        }
    }
    
    MWKeyCode keyCode;
    #if defined(IS_WINDOWS)
        keyCode = VkKeyScan(str[0]);
        short part1 = (keyCode >> 4) * 0xFF;
        short part2 = keyCode * 0xFF;
        if (part1 != -1 || part2 != -1) {
            // VkKeyScan returns -1 for both parts if provided char is invalid
            return keyCode;
        }
    #endif
    return keycodeMapReverse[str];
}

std::string stringForKeyCode(MWKeyCode keyCode) {
    return keycodeMap[keyCode];
}