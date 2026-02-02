/**
 * Codex Electron - Main Process Entry Point
 */

import { app, BrowserWindow } from 'electron';
import { getAppServerManager } from './app-server-manager';
import { getWindowManager } from './window-manager';
import { getTrayManager } from './tray';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    const windowManager = getWindowManager();
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  console.log('Codex Electron starting...');

  // Start the app server
  const appServer = getAppServerManager();
  try {
    await appServer.start();
    console.log('App server started successfully');
  } catch (error) {
    console.error('Failed to start app server:', error);
    // Continue anyway, will show error in UI
  }

  // Create the main window
  const windowManager = getWindowManager();
  windowManager.createMainWindow();

  // Setup system tray
  const trayManager = getTrayManager();
  trayManager.create();

  // Load recent sessions for tray menu
  try {
    const result = await appServer.send<{ threads: any[]; total: number }>('thread/list', {
      limit: 5,
      includeArchived: false,
    });
    trayManager.updateRecentSessions(result.threads);
  } catch (error) {
    console.error('Failed to load recent sessions:', error);
  }

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
});

// Handle window-all-closed
app.on('window-all-closed', () => {
  const settings = getWindowManager().getSettings();
  
  if (settings.minimizeToTray) {
    // Keep running in tray
    return;
  }

  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  const appServer = getAppServerManager();
  appServer.stop();
  
  const trayManager = getTrayManager();
  trayManager.destroy();
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
