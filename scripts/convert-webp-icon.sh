#!/bin/bash

# LLM Assistant - WebP to Icon Converter
# Converts WebP to PNG and generates all required icon sizes

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "┌──────────────────────────────────────────┐"
echo "│   LLM Assistant WebP Icon Converter      │"
echo "└──────────────────────────────────────────┘"
echo -e "${NC}"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick not found${NC}"
    echo ""
    echo "Install with Homebrew:"
    echo "  brew install imagemagick"
    echo ""
    exit 1
fi

# Find WebP file in assets/icons
WEBP_FILE=$(find assets/icons -name "*.webp" | head -n 1)

if [ -z "$WEBP_FILE" ]; then
    echo -e "${RED}❌ No WebP file found in assets/icons/${NC}"
    echo ""
    echo "Please place your downloaded WebP icon in:"
    echo "  assets/icons/"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo -e "${BLUE}📁 Found WebP icon: $WEBP_FILE${NC}"
echo ""

# Create assets/icons directory if it doesn't exist
mkdir -p assets/icons

# Convert WebP to PNG at 1024x1024
MASTER_ICON="assets/icons/icon.png"
echo -e "${BLUE}🔄 Converting to PNG and resizing to 1024x1024...${NC}"

convert "$WEBP_FILE" -resize 1024x1024 -background none -gravity center -extent 1024x1024 "$MASTER_ICON"

echo -e "${GREEN}✓${NC} Created master icon: $MASTER_ICON"
echo ""

# Now generate all icon sizes
ICONSET_DIR="assets/icons/icon.iconset"
OUTPUT_ICNS="assets/icons/icon.icns"

echo -e "${BLUE}🎨 Generating app icons...${NC}"
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
echo -e "${GREEN}│        ✅ Icon setup complete!           │${NC}"
echo -e "${GREEN}└──────────────────────────────────────────┘${NC}"
echo ""
echo "Created files:"
echo "  • $MASTER_ICON (1024x1024 PNG)"
echo "  • $OUTPUT_ICNS (compiled macOS icon)"
echo ""
echo "Next steps:"
echo "  1. Review the icon: open $MASTER_ICON"
echo "  2. If it looks good, rebuild: npm run build"
echo "  3. Test the app icon in Finder and dock"
echo ""
echo "Optional: Clean up the original WebP file:"
echo "  rm \"$WEBP_FILE\""
echo ""