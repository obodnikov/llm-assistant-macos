{
  "targets": [
    {
      "target_name": "text_selection",
      "sources": [
        "native-modules/text-selection/text_selection.mm"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "libraries": [
        "-framework Cocoa",
        "-framework ApplicationServices"
      ],
      "cflags": [
        "-std=c++11",
        "-stdlib=libc++"
      ],
      "cflags_cc": [
        "-std=c++11",
        "-stdlib=libc++"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++11",
          "-stdlib=libc++"
        ]
      }
    },
    {
      "target_name": "context_menu",
      "sources": [
        "native-modules/context-menu/context_menu.mm"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "libraries": [
        "-framework Cocoa",
        "-framework ApplicationServices"
      ],
      "cflags": [
        "-std=c++11",
        "-stdlib=libc++"
      ],
      "cflags_cc": [
        "-std=c++11",
        "-stdlib=libc++"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++11",
          "-stdlib=libc++"
        ]
      }
    },
    {
      "target_name": "accessibility",
      "sources": [
        "native-modules/accessibility/accessibility.mm"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "libraries": [
        "-framework Cocoa",
        "-framework ApplicationServices"
      ],
      "cflags": [
        "-std=c++11",
        "-stdlib=libc++"
      ],
      "cflags_cc": [
        "-std=c++11",
        "-stdlib=libc++"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++11",
          "-stdlib=libc++"
        ]
      }
    }
  ]
}
