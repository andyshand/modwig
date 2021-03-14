{
  "targets": [
    {
      "target_name": "bes",
      "sources": [
        "src/connector/native/main.cc",
        "src/connector/native/string.cc",
        "src/connector/native/mouse.cc",
        "src/connector/native/events.cc",
        "src/connector/native/keycodes.cc",
        "src/connector/native/rect.cc",
        "src/connector/native/os.cc",
        "src/connector/native/point.cc",
        "src/connector/native/window.cc",
        "src/connector/native/bitwig.cc",
        "src/connector/native/ui.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'cflags!': [ 
        '-fno-exceptions', 
        '-Wno-unused-variable',
        "-std=c++17"
      ],
      'cflags_cc!': [ 
        '-fno-exceptions', 
        '-Wno-unused-variable' 
      ],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7',
        'OTHER_CFLAGS': [ "-std=c++17" ]
      },
      'msvs_settings': {
        'VCCLCompilerTool': { 
          'ExceptionHandling': 1,
          'AdditionalOptions': [ '-std:c++latest' ] 
        }
      },
      'conditions': [
      ['OS == "mac"', {
        'defines': ['IS_MACOS'],
        'cflags+': ['-fvisibility=hidden'],
        'xcode_settings': {
          'GCC_SYMBOLS_PRIVATE_EXTERN': 'YES', # -fvisibility=hidden
        },
        'include_dirs': [
          'System/Library/Frameworks/CoreFoundation.Framework/Headers',
          'System/Library/Frameworks/CoreGraphics.Framework/Headers',
          'System/Library/Frameworks/ApplicationServices.framework/Headers'
        ],
        'link_settings': {
          'libraries': [
            '-framework CoreFoundation',
            '-framework CoreGraphics',
            '-framework ApplicationServices'
          ]
        },
         'sources': [
          "src/connector/native/eventsource.cc",
          "src/connector/native/mouse_mac.cc",
          "src/connector/native/events_mac.cc",
          "src/connector/native/bitwig_mac.cc",
          "src/connector/native/ui_mac.cc"
        ]
      }],
      ['OS=="win"', {
        'defines': [
          'IS_WINDOWS',
          'NOMINMAX',
          'WINVER=0x0500',
          '_WIN32_WINNT=0x0600'
        ],
        'sources': [
          "src/connector/native/mouse_windows.cc",
          "src/connector/native/events_windows.cc",
          "src/connector/native/bitwig_windows.cc",
          "src/connector/native/ui_windows.cc"
        ]
      }]
    ]
    }
  ]
}