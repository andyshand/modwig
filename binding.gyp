{
  "targets": [
    {
      "target_name": "bes",
      "sources": [
        "src/connector/main.cc",
        "src/connector/mouse.cc",
        "src/connector/keyboard.cc",
        "src/connector/rect.cc",
        "src/connector/screen.cc",
        "src/connector/point.cc",
        "src/connector/color.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'cflags!': [ '-fno-exceptions', '-Wno-unused-variable' ],
      'cflags_cc!': [ '-fno-exceptions', '-Wno-unused-variable' ],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7',
      },
      'msvs_settings': {
        'VCCLCompilerTool': { 'ExceptionHandling': 1 },
      },
      'conditions': [
      ['OS == "mac"', {
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
        }
      }]
    ]
    }
  ]
}