import { app, BrowserWindow, session } from 'electron';
import * as path from 'path';
import { INDEX_HTML, registerIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

// Chromium no longer falls back to software WebGL by itself, which would leave
// systems without GPU acceleration with no spectrogram. The window only shows
// this app's own local page, so its shaders are trusted content.
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

function createWindow(): void {
  mainWindow = new BrowserWindow({
    icon: app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(__dirname, '../../assets/icons/desktop/png/512.png'),
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    backgroundColor: '#111214',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // No text input needs it, and it would download dictionaries at runtime.
      spellcheck: false
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // The app is a single local page: never navigate away or open other windows.
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.loadFile(INDEX_HTML);

  if (!app.isPackaged && process.argv.includes('--enable-logging')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Audio analysis needs no camera, microphone, notifications or other permissions.
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

registerIpcHandlers();
