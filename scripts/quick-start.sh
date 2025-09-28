#!/bin/bash

# LLM Assistant macOS - Quick Start Script
# This script helps you get up and running quickly

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "┌─────────────────────────────────────────────────┐"
    echo "│                                                 │"
    echo "│           🤖 LLM Assistant macOS                │"
    echo "│                                                 │"
    echo "│          Quick Start Setup Script              │"
    echo "│                                                 │"
    echo "└─────────────────────────────────────────────────┘"
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    print_step "Checking system requirements..."
    
    # Check macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "This app requires macOS. Current OS: $OSTYPE"
        exit 1
    fi
    print_success "macOS detected"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js 18+ required. Current version: $(node -v)"
        print_warning "Please update Node.js from https://nodejs.org"
        exit 1
    fi
    print_success "Node.js $(node -v) detected"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm not found. Please install npm"
        exit 1
    fi
    print_success "npm $(npm -v) detected"
    
    # Check Xcode command line tools
    if ! xcode-select -p &> /dev/null; then
        print_warning "Xcode command line tools not detected"
        echo "Installing Xcode command line tools..."
        xcode-select --install
        echo "Please complete the Xcode tools installation and run this script again"
        exit 1
    fi
    print_success "Xcode command line tools detected"
}

create_directory_structure() {
    print_step "Creating directory structure..."
    
    # Create all necessary directories
    mkdir -p src/main
    mkdir -p src/renderer/css
    mkdir -p src/renderer/js
    mkdir -p src/preload
    mkdir -p scripts
    mkdir -p config
    mkdir -p docs
    mkdir -p assets/icons
    mkdir -p assets/images
    
    print_success "Directory structure created"
}

install_dependencies() {
    print_step "Installing dependencies..."
    
    # Clear npm cache to avoid issues
    npm cache clean --force 2>/dev/null || true
    
    # Install dependencies
    if npm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        print_warning "Try running: rm -rf node_modules package-lock.json && npm install"
        exit 1
    fi
}

setup_config() {
    print_step "Setting up configuration..."
    
    # Copy example config if it doesn't exist
    if [ ! -f "config/config.json" ]; then
        if [ -f "config/config.example.json" ]; then
            cp config/config.example.json config/config.json
            print_success "Created config/config.json from example"
        else
            print_warning "config.example.json not found, skipping config setup"
        fi
    else
        print_warning "config/config.json already exists, skipping"
    fi
}

check_permissions() {
    print_step "Checking macOS permissions..."
    
    echo "The LLM Assistant needs certain permissions to work properly:"
    echo "  • Accessibility (for Mail.app integration)"
    echo "  • Input Monitoring (for global hotkeys)"
    echo ""
    echo "You may be prompted to grant these permissions when you first run the app."
    echo "If prompted, please go to System Preferences → Security & Privacy → Privacy"
    echo "and enable the requested permissions for LLM Assistant."
    echo ""
}

run_tests() {
    print_step "Running basic tests..."
    
    # Test Node.js modules
    if node -e "console.log('Node.js test passed')" &> /dev/null; then
        print_success "Node.js runtime test passed"
    else
        print_error "Node.js runtime test failed"
        exit 1
    fi
    
    # Test if main files exist
    if [ -f "src/main/main.js" ]; then
        print_success "Main process file found"
    else
        print_warning "src/main/main.js not found - you'll need to create the main files"
    fi
    
    if [ -f "package.json" ]; then
        print_success "package.json found"
    else
        print_error "package.json not found - please ensure you have the project files"
        exit 1
    fi
}

show_next_steps() {
    echo -e "${GREEN}"
    echo "┌─────────────────────────────────────────────────┐"
    echo "│                  🎉 Setup Complete!             │"
    echo "└─────────────────────────────────────────────────┘"
    echo -e "${NC}"
    
    echo "Next steps:"
    echo ""
    echo "1. 🔑 Get your OpenAI API key:"
    echo "   → Visit https://platform.openai.com/api-keys"
    echo "   → Create a new key and copy it"
    echo ""
    echo "2. 🛠️  Run the setup wizard:"
    echo "   → npm run setup-wizard"
    echo ""
    echo "3. 🚀 Start the application:"
    echo "   → npm run dev (development mode)"
    echo "   → npm start (production mode)"
    echo ""
    echo "4. 📖 Read the documentation:"
    echo "   → README.md - Getting started guide"
    echo "   → docs/SETUP.md - Detailed setup instructions"
    echo "   → docs/PRIVACY.md - Privacy features"
    echo ""
    echo "5. ⌨️  Use the global hotkey:"
    echo "   → Press Cmd + Option + L to activate"
    echo ""
    echo "Need help? Check out:"
    echo "• GitHub Issues: Report bugs and request features"
    echo "• Documentation: Comprehensive guides in docs/"
    echo "• Setup Guide: docs/SETUP.md for detailed instructions"
    echo ""
    echo -e "${BLUE}Happy emailing with AI assistance! 🚀${NC}"
}

# Main execution
main() {
    print_header
    
    check_requirements
    create_directory_structure
    install_dependencies
    setup_config
    check_permissions
    run_tests
    show_next_steps
}

# Run main function
main "$@"