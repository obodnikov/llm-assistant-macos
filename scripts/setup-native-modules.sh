#!/bin/bash

# Native Modules Setup Script for LLM Assistant v0.2.0
# This script sets up the complete native modules infrastructure

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════╗"
echo "║                                               ║"
echo "║   LLM Assistant Native Modules Setup v0.2.0   ║"
echo "║                                               ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Step 1: Check requirements
echo -e "${BLUE}[1/7]${NC} Checking requirements..."

if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}✗ Error: This setup is only for macOS${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} macOS detected"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Error: Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ Error: npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm $(npm -v)"

if ! xcode-select -p &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Xcode Command Line Tools not found"
    echo "Installing Xcode Command Line Tools..."
    xcode-select --install
    echo "Please complete the installation and run this script again"
    exit 1
fi
echo -e "${GREEN}✓${NC} Xcode Command Line Tools"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Error: Python 3 not found${NC}"
    echo "Install with: brew install python3"
    exit 1
fi
echo -e "${GREEN}✓${NC} Python $(python3 --version)"

# Step 2: Create directory structure
echo -e "\n${BLUE}[2/7]${NC} Creating directory structure..."

mkdir -p native-modules/text-selection
mkdir -p native-modules/context-menu
mkdir -p native-modules/accessibility
mkdir -p build/Release
mkdir -p scripts

echo -e "${GREEN}✓${NC} Directories created"

# Step 3: Create binding.gyp
echo -e "\n${BLUE}[3/7]${NC} Creating binding.gyp..."

cat > binding.gyp << 'EOF'
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
EOF

echo -e "${GREEN}✓${NC} binding.gyp created"

# Step 4: Create test script
echo -e "\n${BLUE}[4/7]${NC} Creating test scripts..."

cat > scripts/test-native-modules.js << 'EOF'
#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing native modules...\n');

const buildDir = path.join(__dirname, '..', 'build', 'Release');
const modules = ['text_selection', 'context_menu', 'accessibility'];

let allPassed = true;

for (const module of modules) {
  const moduleFile = path.join(buildDir, `${module}.node`);
  
  console.log(`Testing ${module}...`);
  
  if (!fs.existsSync(moduleFile)) {
    console.log(`  ❌ ${module}.node not found`);
    allPassed = false;
    continue;
  }
  
  try {
    const nativeModule = require(moduleFile);
    console.log(`  ✅ ${module} loaded successfully`);
    console.log(`     Exports: ${Object.keys(nativeModule).join(', ')}`);
    
    // Basic functionality tests
    if (module === 'accessibility') {
      if (typeof nativeModule.checkAccessibilityPermissions === 'function') {
        const hasPermissions = nativeModule.checkAccessibilityPermissions();
        console.log(`     Permissions: ${hasPermissions ? 'granted ✅' : 'not granted ⚠️'}`);
      }
    }
    
  } catch (error) {
    console.log(`  ❌ ${module} failed to load: ${error.message}`);
    allPassed = false;
  }
  
  console.log();
}

if (allPassed) {
  console.log('✅ All native modules tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
EOF

chmod +x scripts/test-native-modules.js

cat > scripts/check-permissions.js << 'EOF'
#!/usr/bin/env node

const path = require('path');

console.log('🔐 Checking macOS accessibility permissions...\n');

try {
  const accessibilityModule = require('../build/Release/accessibility.node');
  
  const hasPermissions = accessibilityModule.checkAccessibilityPermissions();
  
  if (hasPermissions) {
    console.log('✅ Accessibility permissions are granted');
    console.log('   Native modules will work correctly\n');
  } else {
    console.log('❌ Accessibility permissions are NOT granted');
    console.log('\nTo grant permissions:');
    console.log('1. Open System Preferences → Security & Privacy');
    console.log('2. Click Privacy tab → Accessibility');
    console.log('3. Click the lock icon and enter your password');
    console.log('4. Add LLM Assistant or Terminal (for development)');
    console.log('5. Ensure the checkbox is checked');
    console.log('6. Restart the application\n');
    
    console.log('Attempting to request permissions...');
    accessibilityModule.requestAccessibilityPermissions();
  }
  
} catch (error) {
  console.log('❌ Cannot check permissions - native modules not built');
  console.log('   Run: npm run build-native\n');
  process.exit(1);
}
EOF

chmod +x scripts/check-permissions.js

echo -e "${GREEN}✓${NC} Test scripts created"

# Step 5: Install dependencies
echo -e "\n${BLUE}[5/7]${NC} Installing dependencies..."

npm install --save-dev node-gyp@^10.0.1 nan@^2.17.0

echo -e "${GREEN}✓${NC} Dependencies installed"

# Step 6: Inform about source files
echo -e "\n${BLUE}[6/7]${NC} Native module source files..."
echo -e "${YELLOW}⚠${NC} You need to add the .mm source files:"
echo ""
echo "   native-modules/text-selection/text_selection.mm"
echo "   native-modules/context-menu/context_menu.mm"
echo "   native-modules/accessibility/accessibility.mm"
echo ""
echo "These files are available in the artifacts I created."
echo "Copy them from the conversation to the appropriate directories."
echo ""

# Step 7: Summary
echo -e "\n${BLUE}[7/7]${NC} Setup Summary"
echo -e "${GREEN}✓${NC} Directory structure created"
echo -e "${GREEN}✓${NC} Build configuration (binding.gyp) created"
echo -e "${GREEN}✓${NC} Test scripts created"
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Copy the .mm source files to native-modules directories"
echo "2. Copy native-modules/index.js wrapper"
echo "3. Run: npm run build-native"
echo "4. Run: npm run test-native"
echo "5. Run: npm run check-permissions"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "For detailed instructions, see: docs/NATIVE_MODULES.md"