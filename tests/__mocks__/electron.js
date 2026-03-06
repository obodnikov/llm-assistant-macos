/**
 * Minimal electron mock for Jest tests.
 * Only stubs what's needed to prevent crashes on require('electron').
 */

const app = {
  getPath: (name) => `/tmp/mock-electron/${name}`,
  whenReady: () => Promise.resolve(),
  on: () => {},
  quit: () => {},
  dock: { hide: () => {} }
};

const BrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  on: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  isVisible: jest.fn(() => false),
  webContents: { send: jest.fn(), once: jest.fn() },
  setPosition: jest.fn(),
  setVisibleOnAllWorkspaces: jest.fn(),
  focus: jest.fn(),
  isFocused: jest.fn(() => false)
}));
BrowserWindow.getAllWindows = jest.fn(() => []);

const ipcMain = {
  handle: jest.fn(),
  on: jest.fn()
};

const ipcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

const clipboard = {
  readText: jest.fn(() => ''),
  writeText: jest.fn()
};

const nativeTheme = {
  shouldUseDarkColors: false,
  on: jest.fn()
};

const globalShortcut = {
  register: jest.fn(() => true),
  unregisterAll: jest.fn()
};

const nativeImage = {
  createFromPath: jest.fn()
};

const contextBridge = {
  exposeInMainWorld: jest.fn()
};

const Menu = {
  buildFromTemplate: jest.fn(),
  setApplicationMenu: jest.fn()
};

const Notification = jest.fn().mockImplementation(() => ({
  show: jest.fn()
}));

const screen = {
  getCursorScreenPoint: jest.fn(() => ({ x: 0, y: 0 })),
  getDisplayNearestPoint: jest.fn(() => ({ bounds: { width: 1920, height: 1080 } }))
};

module.exports = {
  app,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  clipboard,
  nativeTheme,
  globalShortcut,
  nativeImage,
  contextBridge,
  Menu,
  Notification,
  screen
};
