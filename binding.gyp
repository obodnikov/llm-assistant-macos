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
        "-std=c++20",
        "-stdlib=libc++"
      ],
      "cflags_cc": [
        "-std=c++20",
        "-stdlib=libc++"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "11.0",
        "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++20",
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
        "-std=c++20",
        "-stdlib=libc++"
      ],
      "cflags_cc": [
        "-std=c++20",
        "-stdlib=libc++"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "11.0",
        "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++20",
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
        "-std=c++20",
        "-stdlib=libc++"
      ],
      "cflags_cc": [
        "-std=c++20",
        "-stdlib=libc++"
      ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "11.0",
        "CLANG_CXX_LANGUAGE_STANDARD": "c++20",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++20",
          "-stdlib=libc++"
        ]
      }
    }
  ]
}
