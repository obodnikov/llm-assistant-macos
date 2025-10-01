const { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store');
const windowStateKeeper = require('electron-window-state');
// 1. ADD AT TOP - Import native modules
const { nativeModules } = require('../../native-modules');

// Initialize config store
const store = new Store();

// Keep a global reference of the window object
let mainWindow;
let assistantPanel;

// 2. ADD AFTER EXISTING VARIABLES
let nativeModulesReady = false;

// Development mode check
const isDev = process.argv.includes('--dev');

// Set dock icon (if you want to show it)
if (process.platform === 'darwin') {
  const iconPath = path.join(__dirname, '../../assets/icons/icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  app.dock.setIcon(icon);
  
  // Or hide it for background app (as in your current setup)
  app.dock.hide();
}

// 3. ADD GLOBAL CALLBACK
global.nativeModuleCallback = (event, data) => {
  handleNativeModuleEvent(event, data);
};

function createMainWindow() {
  // Load window state
  let mainWindowState = windowStateKeeper({
    defaultWidth: 400,
    defaultHeight: 600
  });

  // Create the main window (hidden by default)
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    show: false, // Don't show on startup
    frame: false,
    titleBarStyle: 'hiddenInset',
    vibrancy: 'sidebar',
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minWidth: 300,
    minHeight: 400,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  // Let windowStateKeeper manage the window
  mainWindowState.manage(mainWindow);

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Handle window events
  mainWindow.on('blur', () => {
    if (!isDev) {
      mainWindow.hide(); // Auto-hide when losing focus (like Spotlight)
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open DevTools in development (commented out to reduce console noise)
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
}

function createAssistantPanel() {
  assistantPanel = new BrowserWindow({
    width: 520,
    height: 700,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: 'rgba(0,0,0,0)',
    vibrancy: 'popover',
    resizable: true,
    minWidth: 300,
    minHeight: 400,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.js'),
      backgroundThrottling: false
    }
  });

  assistantPanel.loadFile(path.join(__dirname, '../renderer/assistant.html'));

  // Show immediately after DOM is ready
  assistantPanel.webContents.once('dom-ready', () => {
    assistantPanel.show();
    assistantPanel.focus();
  });

  assistantPanel.on('blur', () => {
    if (!isDev) {
      assistantPanel.hide();
    }
  });
}


function registerGlobalShortcuts() {
  // Register Cmd+Option+L to show assistant
  const ret = globalShortcut.register('CommandOrControl+Alt+L', () => {
    toggleAssistant();
  });

  if (!ret) {
    console.log('Global shortcut registration failed');
  }
  // Register Cmd+Q to quit when assistant is focused
  const ret2 = globalShortcut.register('CommandOrControl+Q', () => {
    if (assistantPanel && assistantPanel.isFocused()) {
      app.quit();
    }
    if (!ret2) {
    console.log('CommandOrControl+Q shortcut  registration failed');
  }
});
}

function toggleAssistant() {
  if (!assistantPanel) {
    createAssistantPanel();
    return;
  }

  if (assistantPanel.isVisible()) {
    assistantPanel.hide();
  } else {
    // Position panel at cursor
    const { screen } = require('electron');
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);

    assistantPanel.setPosition(
      Math.min(cursor.x + 20, display.bounds.width - 400),
      Math.min(cursor.y + 20, display.bounds.height - 520)
    );

    assistantPanel.show();
    assistantPanel.focus();
  }
}

// 4. ADD INITIALIZATION FUNCTION
async function initializeNativeModules() {
  try {
    console.log('🔄 Initializing native modules...');
    
    const hasNativeModules = nativeModules.initialize();
    
    if (hasNativeModules) {
      const status = await nativeModules.setupForAssistant();
      nativeModulesReady = true;
      console.log('✅ Native modules initialized');
      console.log('   Status:', status);
      
      if (!status.permissions) {
        const { Notification } = require('electron');
        new Notification({
          title: 'Permissions Required',
          body: 'Grant accessibility permissions for full functionality'
        }).show();
      }
    } else {
      console.log('ℹ️ Native modules not available - using fallbacks');
    }
  } catch (error) {
    console.error('⚠️ Native modules initialization failed:', error.message);
  }
}

// 5. ADD EVENT HANDLER
function handleNativeModuleEvent(event, data) {
  console.log('Native module event:', event, data);
  
  switch (event) {
    case 'context-menu-action':
      if (assistantPanel && assistantPanel.webContents) {
        assistantPanel.webContents.send('context-menu-action', data);
      }
      break;
      
    case 'text-selection':
      if (assistantPanel && assistantPanel.webContents) {
        assistantPanel.webContents.send('text-selected', data);
      }
      break;
  }
}


// App event handlers
app.whenReady().then(async () => {
  createMainWindow();
  await initializeNativeModules();
  registerGlobalShortcuts();
  initializeOpenAI(); // Initialize OpenAI client

  // macOS specific: Re-create window when app icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // Hide dock icon (we want this to be a background app)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();

  // ← ADD THIS
  if (nativeModulesReady) {
    nativeModules.cleanup();
  }
});

// Import additional modules
const { clipboard, Notification } = require('electron');
const { exec } = require('child_process');
const OpenAI = require('openai');

// Helper function for AppleScript execution
function executeAppleScript(script) {
  return new Promise((resolve, reject) => {
    // Escape single quotes and wrap in double quotes for shell execution
    const escapedScript = script.replace(/'/g, "'\"'\"'");
    exec(`osascript -e '${escapedScript}'`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`AppleScript error: ${error.message}`));
      } else if (stderr) {
        reject(new Error(`AppleScript stderr: ${stderr}`));
      } else {
        try {
          // Try to parse as JSON if it looks like structured data
          const trimmedOutput = stdout.trim();
          if (trimmedOutput.startsWith('{') || trimmedOutput.startsWith('[')) {
            resolve(JSON.parse(trimmedOutput));
          } else {
            resolve(trimmedOutput);
          }
        } catch (parseError) {
          // If JSON parsing fails, return raw string
          resolve(stdout.trim());
        }
      }
    });
  });
}

// Privacy filtering patterns
const sensitivePatterns = {
  apiKeys: /(?:sk-|pk_|AIza|ya29\.|glpat-|ghp_|xoxb-|xoxp-)[a-zA-Z0-9\-_]{20,}/gi,
  credentials: /(?:password|login|username|passwd|pwd)[:=\s]+[^\s\n]{3,}/gi,
  financial: /(?:\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}|\d{3}-\d{2}-\d{4}|routing.{0,10}\d{9})/gi,
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  phones: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/gi
};

// Initialize OpenAI client
let openaiClient = null;

function initializeOpenAI() {
  const apiKey = store.get('openai-api-key');
  if (apiKey) {
    openaiClient = new OpenAI({ apiKey });
  }
}

// IPC handlers for renderer processes
ipcMain.handle('get-config', (event, key) => {
  return store.get(key);
});

ipcMain.handle('set-config', (event, key, value) => {
  store.set(key, value);
  
  // Reinitialize OpenAI if API key changed
  if (key === 'openai-api-key') {
    initializeOpenAI();
  }
  
  return true;
});

ipcMain.handle('get-system-theme', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

// Handle requests from renderer
ipcMain.handle('hide-window', () => {
  if (assistantPanel) {
    assistantPanel.hide();
  }
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

// Clipboard operations
ipcMain.handle('read-clipboard', () => {
  return clipboard.readText();
});

ipcMain.handle('write-clipboard', (event, text) => {
  clipboard.writeText(text);
  return true;
});

// Notifications
ipcMain.handle('show-notification', (event, title, body) => {
  new Notification({ title, body }).show();
  return true;
});

// Privacy filtering
ipcMain.handle('filter-sensitive-content', (event, text) => {
  const filterSettings = {
    apiKeys: store.get('filter-api-keys', true),
    credentials: store.get('filter-credentials', true),
    financial: store.get('filter-financial', true)
  };
  
  const matches = [];
  let safeText = text;
  
  Object.entries(sensitivePatterns).forEach(([type, pattern]) => {
    if (filterSettings[type] && pattern.test(text)) {
      const typeMatches = text.match(pattern) || [];
      typeMatches.forEach(match => {
        matches.push({ type, text: match });
        safeText = safeText.replace(match, `[${type.toUpperCase()}_FILTERED]`);
      });
    }
  });
  
  return {
    safe: matches.length === 0,
    safeText: safeText,
    filteredCount: matches.length,
    matches: matches,
    blocked: matches.length > 3 // Block if too many sensitive items
  };
});

// AI processing
ipcMain.handle('process-ai', async (event, text, prompt, context) => {
  if (!openaiClient) {
    initializeOpenAI();
    if (!openaiClient) {
      throw new Error('OpenAI API key not configured. Please add your API key in settings.');
    }
  }
  
  try {
    const model = store.get('ai-model', 'gpt-4');
    
    // Build system prompt based on context
    let systemPrompt = 'You are a helpful AI assistant for email and text processing.';
    
    if (context && context.type === 'compose') {
      systemPrompt += ' The user is composing an email. Provide concise, professional assistance.';
    } else if (context && context.type === 'mailbox') {
      systemPrompt += ' The user is working with email threads. Help them understand and respond to conversations.';
    }
    
    systemPrompt += ' Keep responses concise and actionable.';
    
    // Prepare messages
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    if (text && text.trim()) {
      messages.push({ role: 'user', content: `Text to process:\n${text}\n\nTask: ${prompt}` });
    } else {
      messages.push({ role: 'user', content: prompt });
    }
    
    const response = await openaiClient.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    if (error.status === 401) {
      throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    } else if (error.status === 500) {
      throw new Error('OpenAI service unavailable. Please try again later.');
    } else {
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }
});

// Mail.app integration
ipcMain.handle('get-mail-context', async () => {
  // First check if Mail is frontmost
  const checkFrontAppScript = `
    tell application "System Events"
      return name of first application process whose frontmost is true
    end tell
  `;

  try {
    const frontApp = await executeAppleScript(checkFrontAppScript);
    if (frontApp.trim() !== 'Mail') {
      return { type: 'not_active', error: 'Mail app is not the frontmost application' };
    }

    // Try to get selected message first (most common case - reading emails)
    const getMessageScript = `
      tell application "Mail"
        try
          set selectedMessages to selection
          if (count of selectedMessages) is 0 then
            return "NO_SELECTION"
          end if

          set firstMessage to item 1 of selectedMessages
          set messageContent to content of firstMessage as string
          set messageSubject to subject of firstMessage as string
          set messageSender to sender of firstMessage as string

          return messageContent & "|||SEP1|||" & messageSubject & "|||SEP2|||" & messageSender
        on error errMsg
          return "ERROR: " & errMsg
        end try
      end tell
    `;

    const result = await executeAppleScript(getMessageScript);

    if (result === 'NO_SELECTION') {
      // No message selected, try to get compose window content
      const getComposeScript = `
        tell application "Mail"
          try
            set currentMessage to front window
            set messageContent to content of currentMessage as string
            set messageSubject to subject of currentMessage as string
            return messageContent & "|||SEPARATOR|||" & messageSubject
          on error errMsg
            return "ERROR: " & errMsg
          end try
        end tell
      `;

      const composeResult = await executeAppleScript(getComposeScript);
      if (composeResult.startsWith('ERROR:')) {
        return { type: 'error', error: 'No email selected or compose window open' };
      }

      const [content, subject] = composeResult.split('|||SEPARATOR|||');
      return { type: 'compose', content, subject };
    }

    if (result.startsWith('ERROR:')) {
      return { type: 'error', error: result.substring(7) };
    }

    // Parse the selected message
    const parts = result.split('|||SEP1|||');
    const content = parts[0];
    const restParts = parts[1].split('|||SEP2|||');
    const subject = restParts[0];
    const sender = restParts[1];

    return { type: 'viewer', content, subject, sender };

  } catch (error) {
    return { type: 'error', error: `Mail integration failed: ${error.message}` };
  }
});

// 8. ADD NEW IPC HANDLERS (at end of file)

// Get native modules status
ipcMain.handle('get-native-modules-status', () => {
  if (!nativeModulesReady) {
    return {
      available: false,
      textSelection: false,
      contextMenu: false,
      accessibility: false,
      permissions: false
    };
  }
  return {
    available: true,
    ...nativeModules.getStatus()
  };
});

// Get selected text
ipcMain.handle('get-selected-text', async () => {
  if (nativeModulesReady) {
    try {
      const selection = await nativeModules.textSelection.getSelectedText();
      return selection.text || '';
    } catch (error) {
      console.error('Text selection failed:', error);
    }
  }
  return '';
});

// Insert text at cursor
ipcMain.handle('insert-text-at-cursor', async (event, text) => {
  if (nativeModulesReady) {
    try {
      return await nativeModules.accessibility.insertTextAtCursor(text);
    } catch (error) {
      console.error('Text insertion failed:', error);
    }
  }
  
  // Fallback to clipboard
  const { clipboard } = require('electron');
  clipboard.writeText(text);
  return false;
});

// Request accessibility permissions
ipcMain.handle('request-accessibility-permissions', async () => {
  if (nativeModulesReady && nativeModules.accessibility) {
    try {
      return nativeModules.accessibility.requestPermissions();
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }
  return false;
});


// Development helpers
if (isDev) {
  console.log('Running in development mode');
  
  // Show main window in dev mode
  app.whenReady().then(() => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}