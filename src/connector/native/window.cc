#include "point.h"
#include "window.h"
#include "rect.h"

#if defined(IS_MACOSX)
#include <CoreGraphics/CoreGraphics.h>
#elif defined(IS_WINDOWS)
#include "windows.h"
#endif

#include <napi.h>
#include <iostream>
#include <string>
#include "string.h"

#if defined(IS_WINDOWS)

std::string processNameForWindow(HWND hWnd) {

        std::string processName = null;

        DWORD pID;
        GetWindowThreadProcessId(hWnd, &pID);

        HANDLE proc;
        if ((proc = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pID)) == IntPtr.Zero)
            return null;

        DWORD capacity = 2000;
        TCHAR buff[capacity];
        StringBuilder sb = new StringBuilder(capacity);
        QueryFullProcessImageName(proc, 0, &buff, &capacity);

        processName = sb.ToString(0, capacity);

        // UWP apps are wrapped in another app called, if this has focus then try and find the child UWP process
        // if (Path.GetFileName(processName).Equals("ApplicationFrameHost.exe"))
        // {
        //     processName = UWP_AppName(hWnd, pID);
        // }

        return processName;
}

#endif
Napi::Value GetFrame(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

    #if defined(IS_MACOSX)  
        // Go through all on screen windows, find BW, get its frame
        CFArrayRef array = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
        CFIndex count = CFArrayGetCount(array);
        for (CFIndex i = 0; i < count; i++) {
            CFDictionaryRef dict = (CFDictionaryRef)CFArrayGetValueAtIndex(array, i);
            auto str = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowOwnerName));
            if (str == "Bitwig Studio") {
                CGRect windowRect;
                CGRectMakeWithDictionaryRepresentation((CFDictionaryRef)(CFDictionaryGetValue(dict, kCGWindowBounds)), &windowRect);
                // TODO Lazy symbol binding fails here.. why?
                // return BESRect::FromCGRect(env, windowRect);
                if (windowRect.size.height < 100) {
                    // Bitwig opens a separate window for its tooltips, ignore this window
                    // TODO Revisit better way of only getting the main window
                    continue;
                }
                return BESRect::constructor.New({ 
                    Napi::Number::New(env, windowRect.origin.x), 
                    Napi::Number::New(env, windowRect.origin.y), // TODO account for menu bar?
                    Napi::Number::New(env, windowRect.size.width), 
                    Napi::Number::New(env, windowRect.size.height)
                });
            }
        }
    #elif defined(IS_WINDOWS)
        auto obj = Napi::Object::New(env);
        EnumWindows([](HWND hWnd, LPARAM lParam) -> BOOL {
            char buff[255];
            GetClassName(
                hWnd,
                (LPTSTR) buff,
                254
            );
            if (strcmp(&buff, "bitwig")) {
                RECT rect;
                GetWindowRect(hWnd, &rect);     
                obj.Set(Napi::String::New(env, "x"), Napi::Number::New(env, rect.left));
                obj.Set(Napi::String::New(env, "y"), Napi::Number::New(env, rect.top));
                obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, rect.right - rect.left));
                obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, rect.bottom - rect.top));
                return FALSE;
            }
            // continue the enumeration
            return TRUE; 
        }, 0);
        return obj;
    #endif
    return env.Null();
}

Napi::Value GetMainScreen(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    auto obj = Napi::Object::New(env);

#if defined(IS_MACOSX)  
    auto mainDisplayId = CGMainDisplayID();
    obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, CGDisplayPixelsWide(mainDisplayId)));
    obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, CGDisplayPixelsHigh(mainDisplayId)));
#elif defined(IS_WINDOWS)
    // Following is to get monitor of specific window
    // HMONITOR monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
    // MONITORINFO info;
    // info.cbSize = sizeof(MONITORINFO);
    // GetMonitorInfo(monitor, &info);
    // int monitor_width = info.rcMonitor.right - info.rcMonitor.left;
    // int monitor_height = info.rcMonitor.bottom - info.rcMonitor.top;
    obj.Set(Napi::String::New(env, "w"), Napi::Number::New(env, GetSystemMetrics(SM_CXFULLSCREEN)));
    obj.Set(Napi::String::New(env, "h"), Napi::Number::New(env, GetSystemMetrics(SM_CYFULLSCREEN)));
#endif
    return obj;
}

Napi::Value ClosePluginWindows(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();

#if defined(IS_MACOSX)  
    // Go through all on screen windows, find BW, get its frame
    CFArrayRef array = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
    CFIndex count = CFArrayGetCount(array);
    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef dict = (CFDictionaryRef)CFArrayGetValueAtIndex(array, i);
        auto str = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowOwnerName));
        auto windowName = CFStringToString((CFStringRef)CFDictionaryGetValue(dict, kCGWindowName));
        if (str == "Bitwig Studio") {
            
            std::cout << "window name: " << windowName << std::endl;
        }
    }
#elif defined(IS_WINDOWS)
    
#endif
    return env.Null();
}

Napi::Value InitWindow(Napi::Env env, Napi::Object exports)
{
    Napi::Object obj = Napi::Object::New(env);
    obj.Set(Napi::String::New(env, "getFrame"), Napi::Function::New(env, GetFrame));
    obj.Set(Napi::String::New(env, "getMainScreen"), Napi::Function::New(env, GetMainScreen));
    obj.Set(Napi::String::New(env, "closePluginWindows"), Napi::Function::New(env, ClosePluginWindows));
    exports.Set("MainWindow", obj);
    return exports;
}