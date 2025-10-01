// scripts/build-native.js
// Automated build script for native modules

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class NativeModuleBuilder {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.buildDir = path.join(__dirname, '..', 'build');
    this.nodeGypPath = path.join(__dirname, '..', 'node_modules', '.bin', 'node-gyp');
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    console.log(`${colors[type]}[BUILD]${colors.reset} ${message}`);
  }

  async checkRequirements() {
    this.log('Checking build requirements...');
    
    // Check if we're on macOS
    if (this.platform !== 'darwin') {
      throw new Error('Native modules are only supported on macOS');
    }

    // Check for Xcode command line tools
    try {
      await this.execAsync('xcode-select -p');
      this.log('✅ Xcode command line tools found');
    } catch (error) {
      throw new Error('Xcode command line tools required. Run: xcode-select --install');
    }

    // Check for Node.js and npm
    try {
      const nodeVersion = await this.execAsync('node --version');
      const npmVersion = await this.execAsync('npm --version');
      this.log(`✅ Node.js ${nodeVersion.trim()}, npm ${npmVersion.trim()}`);
    } catch (error) {
      throw new Error('Node.js and npm are required');
    }

    // Check for Python (required by node-gyp)
    try {
      await this.execAsync('python3 --version');
      this.log('✅ Python 3 found');
    } catch (error) {
      this.log('⚠️ Python 3 not found, trying python...');
      try {
        await this.execAsync('python --version');
        this.log('✅ Python found');
      } catch (error2) {
        throw new Error('Python is required for building native modules');
      }
    }
  }

  async createDirectories() {
    this.log('Creating native module directories...');
    
    const dirs = [
      'native-modules',
      'native-modules/text-selection',
      'native-modules/context-menu', 
      'native-modules/accessibility',
      'build',
      'build/Release'
    ];

    for (const dir of dirs) {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.log(`Created directory: ${dir}`);
      }
    }
  }

  async writeNativeModuleFiles() {
    this.log('Writing native module source files...');
    
    // Create the .mm files in their respective directories
    const modules = ['text-selection', 'context-menu', 'accessibility'];
    
    for (const module of modules) {
      const sourceDir = path.join(__dirname, '..', 'native-modules', module);
      const sourceFile = path.join(sourceDir, `${module.replace('-', '_')}.mm`);
      
      if (!fs.existsSync(sourceFile)) {
        this.log(`⚠️ Missing source file: ${sourceFile}`);
        this.log('Please ensure all .mm files are created from the artifacts');
      }
    }
  }

  async buildModule(moduleName) {
    this.log(`Building ${moduleName} module...`);
    
    try {
      // Clean previous build
      await this.execAsync(`"${this.nodeGypPath}" clean`);
      
      // Configure
      await this.execAsync(`"${this.nodeGypPath}" configure --target=${moduleName}`);
      
      // Build
      await this.execAsync(`"${this.nodeGypPath}" build --target=${moduleName}`);
      
      // Check if .node file was created
      const nodeFile = path.join(this.buildDir, 'Release', `${moduleName}.node`);
      if (fs.existsSync(nodeFile)) {
        this.log(`✅ ${moduleName}.node built successfully`);
        return true;
      } else {
        this.log(`❌ ${moduleName}.node not found after build`);
        return false;
      }
      
    } catch (error) {
      this.log(`❌ Failed to build ${moduleName}: ${error.message}`, 'error');
      return false;
    }
  }

  async buildAllModules() {
    this.log('Building all native modules...');
    
    const modules = ['text_selection', 'context_menu', 'accessibility'];
    const results = {};
    
    for (const module of modules) {
      results[module] = await this.buildModule(module);
    }
    
    return results;
  }

  async testModules() {
    this.log('Testing native modules...');
    
    const modules = ['text_selection', 'context_menu', 'accessibility'];
    const results = {};
    
    for (const module of modules) {
      try {
        const moduleFile = path.join(this.buildDir, 'Release', `${module}.node`);
        if (fs.existsSync(moduleFile)) {
          // Try to require the module
          const nativeModule = require(moduleFile);
          results[module] = {
            loaded: true,
            exports: Object.keys(nativeModule)
          };
          this.log(`✅ ${module} loads successfully`);
        } else {
          results[module] = { loaded: false, error: 'File not found' };
          this.log(`❌ ${module} not found`);
        }
      } catch (error) {
        results[module] = { loaded: false, error: error.message };
        this.log(`❌ ${module} failed to load: ${error.message}`);
      }
    }
    
    return results;
  }

  async execAsync(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async build() {
    try {
      this.log('Starting native modules build process...');
      
      await this.checkRequirements();
      await this.createDirectories();
      await this.writeNativeModuleFiles();
      
      const buildResults = await this.buildAllModules();
      const testResults = await this.testModules();
      
      // Summary
      this.log('\n=== Build Summary ===');
      const successful = Object.values(buildResults).filter(Boolean).length;
      const total = Object.keys(buildResults).length;
      
      if (successful === total) {
        this.log(`✅ All ${total} native modules built successfully!`, 'success');
      } else {
        this.log(`⚠️ ${successful}/${total} native modules built successfully`, 'warning');
      }
      
      this.log('\nBuild Results:');
      Object.entries(buildResults).forEach(([module, success]) => {
        const status = success ? '✅' : '❌';
        this.log(`  ${status} ${module}`);
      });
      
      this.log('\nLoad Test Results:');
      Object.entries(testResults).forEach(([module, result]) => {
        const status = result.loaded ? '✅' : '❌';
        this.log(`  ${status} ${module} ${result.loaded ? '(loads successfully)' : `(${result.error})`}`);
      });
      
      return {
        success: successful === total,
        buildResults,
        testResults
      };
      
    } catch (error) {
      this.log(`❌ Build failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Test native modules script
// scripts/test-native-modules.js
const testNativeModules = async () => {
  console.log('🧪 Testing native modules...');
  
  const path = require('path');
  const fs = require('fs');
  
  const buildDir = path.join(__dirname, '..', 'build', 'Release');
  const modules = ['text_selection', 'context_menu', 'accessibility'];
  
  for (const module of modules) {
    const moduleFile = path.join(buildDir, `${module}.node`);
    
    console.log(`\nTesting ${module}...`);
    
    if (!fs.existsSync(moduleFile)) {
      console.log(`❌ ${module}.node not found`);
      continue;
    }
    
    try {
      const nativeModule = require(moduleFile);
      console.log(`✅ ${module} loaded successfully`);
      console.log(`   Exports: ${Object.keys(nativeModule).join(', ')}`);
      
      // Basic functionality tests
      switch (module) {
        case 'accessibility':
          if (typeof nativeModule.checkAccessibilityPermissions === 'function') {
            const hasPermissions = nativeModule.checkAccessibilityPermissions();
            console.log(`   Accessibility permissions: ${hasPermissions ? 'granted' : 'not granted'}`);
          }
          break;
          
        case 'text_selection':
          if (typeof nativeModule.getSelectedText === 'function') {
            console.log(`   Text selection functions available`);
          }
          break;
          
        case 'context_menu':
          if (typeof nativeModule.registerContextMenu === 'function') {
            console.log(`   Context menu functions available`);
          }
          break;
      }
      
    } catch (error) {
      console.log(`❌ ${module} failed to load: ${error.message}`);
    }
  }
};

// Check permissions script
// scripts/check-permissions.js
const checkPermissions = async () => {
  console.log('🔐 Checking macOS permissions...');
  
  try {
    const accessibilityModule = require('../build/Release/accessibility.node');
    
    const hasPermissions = accessibilityModule.checkAccessibilityPermissions();
    
    if (hasPermissions) {
      console.log('✅ Accessibility permissions granted');
    } else {
      console.log('❌ Accessibility permissions required');
      console.log('   Please go to System Preferences → Security & Privacy → Privacy → Accessibility');
      console.log('   and grant access to LLM Assistant or Terminal (for development)');
      
      // Try to request permissions
      const requested = accessibilityModule.requestAccessibilityPermissions();
      if (requested) {
        console.log('   Permission dialog should appear...');
      }
    }
    
  } catch (error) {
    console.log('❌ Cannot check permissions - native modules not built');
    console.log('   Run: npm run build-native');
  }
};

// Export functions for use in package.json scripts
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'build':
      const builder = new NativeModuleBuilder();
      builder.build().catch(console.error);
      break;
      
    case 'test':
      testNativeModules().catch(console.error);
      break;
      
    case 'check-permissions':
      checkPermissions().catch(console.error);
      break;
      
    default:
      console.log('Usage: node build-scripts.js [build|test|check-permissions]');
  }
} else {
  module.exports = {
    NativeModuleBuilder,
    testNativeModules,
    checkPermissions
  };
}