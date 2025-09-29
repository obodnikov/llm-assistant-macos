const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration management
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  
  // System information
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  
  // Window management
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // AI processing
  processWithAI: (text, action, context) => ipcRenderer.invoke('process-ai', text, action, context),
  
  // Mail integration
  getMailContext: () => ipcRenderer.invoke('get-mail-context'),
  
  // Privacy filtering
  filterSensitiveContent: (text) => ipcRenderer.invoke('filter-sensitive-content', text),
  
  // System events
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', callback);
    return () => ipcRenderer.removeListener('theme-changed', callback);
  }
});

// Expose a limited API for text selection and clipboard
contextBridge.exposeInMainWorld('systemAPI', {
  // Clipboard operations
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  writeClipboard: (text) => ipcRenderer.invoke('write-clipboard', text),
  
  // Text selection (will be implemented with native modules)
  getSelectedText: () => ipcRenderer.invoke('get-selected-text'),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body)
});

// Native modules support
contextBridge.exposeInMainWorld('nativeModulesAPI', {
  getStatus: () => ipcRenderer.invoke('get-native-modules-status'),
  onTextSelected: (callback) => {
    ipcRenderer.on('text-selected', (event, data) => callback(data));
  },
  onContextMenuAction: (callback) => {
    ipcRenderer.on('context-menu-action', (event, data) => callback(data));
  },
  onQuickAction: (callback) => {
    ipcRenderer.on('quick-action', (event, data) => callback(data));
  }
});

// Log when preload script loads
console.log('Preload script loaded successfully');