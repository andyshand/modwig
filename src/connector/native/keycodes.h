#include <string>

#if defined(IS_WINDOWS)
typedef short MWKeyCode;
#elif defined(IS_MACOS)
typedef int MWKeyCode;
#endif

MWKeyCode keyCodeForString(std::string str);
std::string stringForKeyCode(MWKeyCode keyCode);