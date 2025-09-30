#!/bin/bash

# LLM Assistant - Icon Generation Script
# Generates all required icon sizes from a master 1024x1024 PNG

set -e  # Exit on error

MASTER_ICON="assets/icons/icon.png"
ICONSET_DIR="assets/icons/icon.iconset"
OUTPUT_ICNS="assets/icons/icon.icns"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "┌──────────────────────────────────────────┐"
echo "│     LLM Assistant Icon Generator         │"
echo "└──────────────────────────────────────────┘"
echo -e "${NC}"

# Check if master icon exists
if [ ! -f "$MASTER_ICON" ]; then
    echo -e "${RED}❌ Master icon not found: $MASTER_ICON${NC}"
    echo ""
    echo "Please create a 1024x1024 PNG icon with:"
    echo "  • Rounded corners (22.37% radius)"
    echo "  • 10% margin from edges"
    echo "  • High contrast for light/dark modes"
    echo ""
    echo "Recommended design:"
    echo "  • AI/Neural network pattern"
    echo "  • Email/envelope element"
    echo "  • Blue-purple gradient background"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick not found${NC}"
    echo ""
    echo "Install with Homebrew:"
    echo "  brew install imagemagick"
    echo ""
    exit 1
fi

echo -e "${BLUE}🎨 Generating app icons from $MASTER_ICON...${NC}"
echo ""

# Create iconset directory
mkdir -p "$ICONSET_DIR"

# Array of sizes and filenames
sizes=(
    "16:icon_16x16.png"
    "32:icon_16x16@2x.png"
    "32:icon_32x32.png"
    "64:icon_32x32@2x.png"
    "128:icon_128x128.png"
    "256:icon_128x128@2x.png"
    "256:icon_256x256.png"
    "512:icon_256x256@2x.png"
    "512:icon_512x512.png"
    "1024:icon_512x512@2x.png"
)

# Generate each size
for size_info in "${sizes[@]}"; do
    IFS=':' read -r size filename <<< "$size_info"
    echo -e "${GREEN}✓${NC} Creating ${filename} (${size}x${size})"
    convert "$MASTER_ICON" -resize "${size}x${size}" "$ICONSET_DIR/$filename"
done

echo ""
echo -e "${BLUE}📦 Compiling to .icns format...${NC}"

# Compile to .icns
iconutil -c icns "$ICONSET_DIR" -o "$OUTPUT_ICNS"

# Clean up iconset folder
rm -rf "$ICONSET_DIR"

echo ""
echo -e "${GREEN}┌──────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│        ✅ Icon generation complete!      │${NC}"
echo -e "${GREEN}└──────────────────────────────────────────┘${NC}"
echo ""
echo "Output: $OUTPUT_ICNS"
echo ""
echo "Next steps:"
echo "  1. Update package.json (icon path already configured)"
echo "  2. Rebuild your app: npm run build"
echo "  3. Clear icon cache if needed:"
echo "     sudo rm -rf /Library/Caches/com.apple.iconservices.store"
echo "     killall Finder"
echo ""