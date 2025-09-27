const { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store');
const windowStateKeeper = require('electron-window-state');

// Initialize config store
const store = new Store();

// Keep a global reference of the window object
let mainWindow;
let assistantPanel;

// Development mode check
const isDev = process.argv.includes('--dev');

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
  // This will be our floating assistant panel
  assistantPanel = new BrowserWindow({
    width: 380,
    height: 500,
    show: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    vibrancy: 'popover',
    resizable: true,
    minWidth: 300,
    minHeight: 400,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  });

  assistantPanel.loadFile(path.join(__dirname, '../renderer/assistant.html'));

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
}

function toggleAssistant() {
  if (!assistantPanel) {
    createAssistantPanel();
  }

  if (assistantPanel.isVisible()) {
    assistantPanel.hide();
  } else {
    // Position panel at cursor or center of screen
    const { screen } = require('electron');
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);

    // Position slightly offset from cursor
    assistantPanel.setPosition(
      Math.min(cursor.x + 20, display.bounds.width - 400),
      Math.min(cursor.y + 20, display.bounds.height - 520)
    );

    assistantPanel.show();
    assistantPanel.focus();
  }
}

// App event handlers
app.whenReady().then(() => {
  createMainWindow();
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
  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
    end tell
    
    if frontApp is not "Mail" then
      error "Mail app not active"
    end if
    
    tell application "Mail"
      try
        set frontWindow to front window
        set windowClass to class of frontWindow as string
        
        if windowClass contains "compose" then
          -- Compose window
          set currentMessage to frontWindow
          set messageContent to content of currentMessage as string
          set messageSubject to subject of currentMessage
          set messageRecipients to name of to recipients of currentMessage
          
          return "{\\"type\\": \\"compose\\", \\"content\\": \\"" & messageContent & "\\", \\"subject\\": \\"" & messageSubject & "\\", \\"recipients\\": [\\"" & (messageRecipients as string) & "\\"]}"
          
        else if windowClass contains "mailbox" then
          -- Mailbox window
          set selectedMessages to selection
          set messageCount to count of selectedMessages
          
          return "{\\"type\\": \\"mailbox\\", \\"messageCount\\": " & messageCount & ", \\"messages\\": []}"
          
        else
          error "Unknown window type: " & windowClass
        end if
        
      on error errMsg
        error "Could not get mail context: " & errMsg
      end try
    end tell
  `;
  
  try {
    const result = await executeAppleScript(script);
    return result;
  } catch (error) {
    throw new Error(`Mail integration failed: ${error.message}`);
  }
});

// Get selected text system-wide (placeholder for native module)
ipcMain.handle('get-selected-text', async () => {
  // This would require a native module to access system text selection
  // For now, return empty - we'll implement this with a native addon later
  return '';
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