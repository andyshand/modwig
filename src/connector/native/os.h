#if defined(IS_MACOS)
    #include <experimental/optional>
    #define optional std::experimental::optional
#elif defined(IS_WINDOWS) 
    #include <optional>
    #define optional std::optional
#endif

void os_sleep(int time);