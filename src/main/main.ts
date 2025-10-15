import { app, BrowserWindow, screen } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIPCHandlers } from './ipc';
import { loadConfig } from './config-store';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Default bounds: 25% width, full height, docked to right
  const windowWidth = Math.floor(screenWidth * 0.25);
  const windowHeight = screenHeight;
  const windowX = screenWidth - windowWidth;
  const windowY = 0;

  // Load saved config to check alwaysOnTop
  const config = loadConfig();

  // Try to load icon, fallback if not available
  let iconPath: string | undefined;
  const possibleIconPaths = [
    path.join(__dirname, '../../assets/logo.png'),
    path.join(__dirname, '../../assets/logo.ico'),
  ];
  
  for (const p of possibleIconPaths) {
    try {
      if (fs.existsSync(p)) {
        iconPath = p;
        break;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: windowX,
    y: windowY,
    frame: false, // Frameless for custom titlebar
    alwaysOnTop: config?.alwaysOnTop || false,
    backgroundColor: '#ffffff',
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Don't open DevTools in test environment
    if (process.env.NODE_ENV !== 'test') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
