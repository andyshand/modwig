// dllmain.cpp : Defines the entry point for the DLL application.
#include "pch.h"

#pragma data_seg(".EVENTS")
HWND hWndServer = NULL;
#pragma data_seg()
#pragma comment("linker, /section:.EVENTS,rws")

HINSTANCE hInstance;
UINT HWM_MOUSEHOOK;
HHOOK mouseHook;
//HHOOK keyboardHook;

typedef struct tagMYREC
{
    char type[80];
    UINT x;
    UINT y;
    UINT button;
} MYREC;

HRESULT hResult;

// Forward declaration
static LRESULT CALLBACK mouseHookProc(int nCode, WPARAM wParam, LPARAM lParam);
//static LRESULT CALLBACK keyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam);

__declspec(dllexport) BOOL WINAPI setMyHook(HWND hWnd)
{
    if (hWndServer != NULL)
        return FALSE;
    mouseHook = SetWindowsHookEx(
        WH_MOUSE,
        (HOOKPROC)mouseHookProc,
        hInstance,
        0);
    if (mouseHook != NULL)
    {
        // success
        hWndServer = hWnd;
        return TRUE;
    }
    return FALSE;
}

__declspec(dllexport) BOOL clearMyHook(HWND hWnd)
{
    if (hWnd != hWndServer)
        return FALSE;
    BOOL unhooked = UnhookWindowsHookEx(mouseHook);
    if (unhooked)
        hWndServer = NULL;
    return unhooked;
}

BOOL APIENTRY DllMain( HMODULE hModule,
                       DWORD  ul_reason_for_call,
                       LPVOID lpReserved
                     )
{
    switch (ul_reason_for_call)
    {
    case DLL_PROCESS_ATTACH:
        // Save the instance handle because we need it to set the hook later
        hInstance = hModule;
        return TRUE;
    case DLL_THREAD_ATTACH:
    case DLL_THREAD_DETACH:
    case DLL_PROCESS_DETACH:
        // If the server has not unhooked the hook, unhook it as we unload
        if (hWndServer != NULL)
            clearMyHook(hWndServer);
        return TRUE;
    }
    return TRUE;
}

static LRESULT CALLBACK mouseHookProc(int nCode, WPARAM wParam, LPARAM lParam)
{
    // If the value of nCode is < 0, just pass it on and return 0
    // this is required by the specification of hook handlers
    if (nCode < 0)
    { /* pass it on */
        CallNextHookEx(mouseHook, nCode,
            wParam, lParam);
        return 0;
    } /* pass it on */


    COPYDATASTRUCT MyCDS;
    MYREC MyRec;
    MyCDS.cbData = sizeof(MyRec);
    MyCDS.dwData = 1;
    MyCDS.lpData = &MyRec;

    if (wParam == WM_LBUTTONDOWN
        || wParam == WM_LBUTTONUP
        || wParam == WM_RBUTTONDOWN
        || wParam == WM_RBUTTONUP) {

        MyRec.x = GET_X_LPARAM(lParam);
        MyRec.y = GET_Y_LPARAM(lParam);

        #pragma warning(push)
        #pragma warning(disable: 4996)
        if (wParam == WM_LBUTTONDOWN || wParam == WM_RBUTTONDOWN) {
            strcpy(MyRec.type, "mousedown");
            MyRec.button = WM_LBUTTONDOWN ? 0 : 1;
        }
        else if (wParam == WM_LBUTTONUP || wParam == WM_RBUTTONUP) {
            strcpy(MyRec.type, "mouseup");
            MyRec.button = WM_LBUTTONUP ? 0 : 1;
        }
        #pragma warning(pop)
        PostMessage(hWndServer,
            WM_COPYDATA,
            0,
            (LPARAM)(LPVOID)&MyCDS);
    }

    // Pass the message on to the next hook
    return CallNextHookEx(mouseHook, nCode,
        wParam, lParam);
}
//
//static LRESULT CALLBACK keyboardHookProc(int nCode, WPARAM wParam, LPARAM lParam)
//{
//    // If the value of nCode is < 0, just pass it on and return 0
//    // this is required by the specification of hook handlers
//    if (nCode < 0)
//    { /* pass it on */
//        CallNextHookEx(mouseHook, nCode,
//            wParam, lParam);
//        return 0;
//    } /* pass it on */
//
//    // on WM_CHAR message
//    switch (wParam)
//    {
//    case 0x08:
//        // backspace. 
//        break;
//    case 0x0A:
//        // linefeed. 
//        break;
//    case 0x1B:
//        // escape. 
//        break;
//    case 0x09:
//        // tab. 
//        break;
//    case 0x0D:
//        // carriage return. 
//        break;
//    default:
//        // displayable characters. 
//        break;
//    }
//
//    COPYDATASTRUCT MyCDS;
//    MYREC MyRec;
//    MyCDS.cbData = sizeof(MyRec);
//    MyCDS.dwData = 1;
//    MyCDS.lpData = &MyRec;
//
//    if (wParam == WM_LBUTTONDOWN
//        || wParam == WM_LBUTTONUP
//        || wParam == WM_RBUTTONDOWN
//        || wParam == WM_RBUTTONUP) {
//
//        MyRec.x = GET_X_LPARAM(lParam);
//        MyRec.y = GET_Y_LPARAM(lParam);
//        if (wParam == WM_LBUTTONDOWN || wParam == WM_RBUTTONDOWN) {
//            strcpy(MyRec.type, "mousedown");
//            MyRec.button = WM_LBUTTONDOWN ? 0 : 1;
//        }
//        else if (wParam == WM_LBUTTONUP || wParam == WM_RBUTTONUP) {
//            strcpy(MyRec.type, "mouseup");
//            MyRec.button = WM_LBUTTONUP ? 0 : 1;
//        }
//        PostMessage(hWndServer,
//            WM_COPYDATA,
//            0,
//            (LPARAM)(LPVOID)&MyCDS);
//    }
//
//    // Pass the message on to the next hook
//    return CallNextHookEx(mouseHook, nCode,
//        wParam, lParam);
//}