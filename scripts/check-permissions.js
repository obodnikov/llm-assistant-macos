#!/usr/bin/env node

/**
 * Check Permissions Script
 * Verifies that the LLM Assistant has all required macOS permissions
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('\n🔍 Checking macOS Permissions for LLM Assistant...\n');

// Helper function to execute AppleScript
function executeAppleScript(script) {
  try {
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch (error) {
    return null;
  }
}

// Check if running as an Electron app
function checkElectronApp() {
  console.log('📦 Application Status:');
  const appPath = path.resolve(__dirname, '..');
  console.log(`   App Directory: ${appPath}`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
}

// Check Accessibility permissions
function checkAccessibilityPermissions() {
  console.log('♿ Accessibility Permissions:');

  const script = `
    tell application "System Events"
      return (application processes whose name is "Electron") is not {}
    end tell
  `;

  const result = executeAppleScript(script);

  if (result === 'true') {
    console.log('   ✅ Accessibility access granted');
    console.log('   ℹ️  Can read system-wide text selection and window info');
    return true;
  } else {
    console.log('   ⚠️  Accessibility access NOT granted or app not running');
    console.log('   ℹ️  Required for text selection and context menu features');
    console.log('   📝 Grant access in: System Settings → Privacy & Security → Accessibility');
    return false;
  }
}

// Check Screen Recording permissions (for context menu positioning)
function checkScreenRecordingPermissions() {
  console.log('\n📺 Screen Recording Permissions:');
  console.log('   ℹ️  Required for advanced context menu positioning');
  console.log('   📝 Grant access in: System Settings → Privacy & Security → Screen Recording');
  console.log('   ⚠️  Cannot be checked programmatically - user must verify manually');
}

// Check Automation permissions for Mail
function checkAutomationPermissions() {
  console.log('\n🤖 Automation Permissions:');

  const script = `
    tell application "System Events"
      try
        tell process "Mail"
          set frontmost to true
        end tell
        return "true"
      on error
        return "false"
      end try
    end tell
  `;

  const result = executeAppleScript(script);

  if (result === 'true') {
    console.log('   ✅ Automation access granted for Mail.app');
    console.log('   ℹ️  Can read and interact with Mail content');
  } else {
    console.log('   ⚠️  Automation access NOT granted for Mail.app');
    console.log('   ℹ️  Required for Mail integration features');
    console.log('   📝 Grant access in: System Settings → Privacy & Security → Automation');
  }
}

// Check if native modules are built
function checkNativeModules() {
  console.log('\n🔧 Native Modules:');

  const fs = require('fs');
  const buildPath = path.join(__dirname, '..', 'build', 'Release');

  const modules = [
    'accessibility.node',
    'context_menu.node',
    'text_selection.node'
  ];

  let allBuilt = true;

  modules.forEach(module => {
    const modulePath = path.join(buildPath, module);
    if (fs.existsSync(modulePath)) {
      console.log(`   ✅ ${module}`);
    } else {
      console.log(`   ❌ ${module} - NOT BUILT`);
      allBuilt = false;
    }
  });

  if (!allBuilt) {
    console.log('\n   ⚠️  Some native modules are not built.');
    console.log('   📝 Run: npm run build-native');
  }

  return allBuilt;
}

// Check Node.js and Electron versions
function checkVersions() {
  console.log('\n📊 Version Information:');
  console.log(`   Node.js: ${process.version}`);

  try {
    const packageJson = require('../package.json');
    console.log(`   App Version: ${packageJson.version}`);
    console.log(`   Electron: ${packageJson.devDependencies.electron || 'Not specified'}`);
  } catch (error) {
    console.log('   ⚠️  Could not read package.json');
  }
}

// Provide recommendations
function provideRecommendations(hasAccessibility, hasNativeModules) {
  console.log('\n📋 Recommendations:\n');

  if (!hasAccessibility) {
    console.log('1. 🔴 Grant Accessibility permissions:');
    console.log('   - Open System Settings');
    console.log('   - Go to Privacy & Security → Accessibility');
    console.log('   - Add and enable your application (Electron or LLM Assistant)');
    console.log('   - Restart the application');
    console.log('');
  }

  if (!hasNativeModules) {
    console.log('2. 🔴 Build native modules:');
    console.log('   - Run: npm run build-native');
    console.log('   - This compiles the native macOS integrations');
    console.log('');
  }

  console.log('3. 🟡 To use Mail integration:');
  console.log('   - Open Mail.app');
  console.log('   - Select an email or compose a new one');
  console.log('   - Make sure Mail is the frontmost window');
  console.log('   - Then use LLM Assistant features');
  console.log('');

  console.log('4. 🟢 First-time setup:');
  console.log('   - Run the app once to trigger permission dialogs');
  console.log('   - macOS will ask for Accessibility access');
  console.log('   - Grant all requested permissions');
  console.log('');
}

// Main execution
function main() {
  checkElectronApp();
  const hasAccessibility = checkAccessibilityPermissions();
  checkScreenRecordingPermissions();
  checkAutomationPermissions();
  const hasNativeModules = checkNativeModules();
  checkVersions();

  provideRecommendations(hasAccessibility, hasNativeModules);

  console.log('✅ Permission check complete!\n');

  if (hasAccessibility && hasNativeModules) {
    console.log('🎉 All critical permissions are configured correctly!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some permissions or modules need attention.\n');
    process.exit(1);
  }
}

// Run the checks
main();