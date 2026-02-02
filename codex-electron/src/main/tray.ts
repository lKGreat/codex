/// <reference path="../types/externals.d.ts" />
/**
 * Codex Electron - System Tray
 * Manages the system tray icon and menu
 */

import { Tray, Menu, nativeImage, Notification, app } from 'electron';
import fs from 'fs';
import path from 'path';
import { getWindowManager } from './window-manager';
import { getAppServerManager } from './app-server-manager';
import { ApprovalRequest, ThreadMetadata } from '../types';

export class TrayManager {
  private tray: Tray | null = null;
  private recentSessions: ThreadMetadata[] = [];

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Create the system tray
   */
  create(): void {
    if (this.tray) {
      return;
    }

    // Get icon path
    const iconPath = this.getIconPath();
    let icon = nativeImage.createEmpty();
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    }

    // Resize for tray (16x16 on Windows/Linux, 22x22 on macOS)
    const size = process.platform === 'darwin' ? 22 : 16;
    const resizedIcon = icon.resize({ width: size, height: size });

    this.tray = new Tray(resizedIcon);
    this.tray.setToolTip('Codex Desktop');

    // Setup context menu
    this.updateContextMenu();

    // Double-click to open main window
    this.tray.on('double-click', () => {
      const windowManager = getWindowManager();
      windowManager.createMainWindow();
    });
  }

  /**
   * Get the tray icon path based on platform
   */
  private getIconPath(): string {
    const resourcesPath = app.isPackaged
      ? (process as NodeJS.Process & { resourcesPath: string }).resourcesPath
      : path.join(__dirname, '..', '..', 'resources');

    if (process.platform === 'win32') {
      return path.join(resourcesPath, 'icons', 'tray.ico');
    } else if (process.platform === 'darwin') {
      return path.join(resourcesPath, 'icons', 'trayTemplate.png');
    } else {
      return path.join(resourcesPath, 'icons', 'tray.png');
    }
  }

  /**
   * Update the context menu with recent sessions
   */
  updateContextMenu(): void {
    if (!this.tray) {
      return;
    }

    const windowManager = getWindowManager();

    const recentSessionItems: Array<Electron.MenuItemConstructorOptions> = this.recentSessions
      .slice(0, 5)
      .map((session) => ({
        label: session.name || session.preview.slice(0, 30) + '...',
        click: () => {
          windowManager.createSessionWindow(session.id);
        },
      }));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'New Session',
        accelerator: 'CmdOrCtrl+N',
        click: async () => {
          try {
            const appServer = getAppServerManager();
            const result = await appServer.send<{ thread: { id: string } }>('thread/start', {});
            windowManager.createSessionWindow(result.thread.id);
          } catch (error) {
            console.error('Failed to create new session:', error);
          }
        },
      },
      {
        label: 'Open Main Window',
        click: () => {
          windowManager.createMainWindow();
        },
      },
      { type: 'separator' },
      {
        label: 'Recent Sessions',
        enabled: recentSessionItems.length > 0,
        submenu: recentSessionItems.length > 0 ? recentSessionItems : undefined,
      },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          const mainWindow = windowManager.createMainWindow();
          mainWindow.webContents.send('navigate', '/settings');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Update recent sessions list
   */
  updateRecentSessions(sessions: ThreadMetadata[]): void {
    this.recentSessions = Array.isArray(sessions) ? sessions : [];
    this.updateContextMenu();
  }

  /**
   * Show a notification for approval request
   */
  showApprovalNotification(request: ApprovalRequest): void {
    const settings = getWindowManager().getSettings();
    if (!settings.showNotifications) {
      return;
    }

    let title: string;
    let body: string;

    if (request.type === 'exec') {
      title = 'Command Approval Required';
      body = `Command: ${request.payload.command.join(' ')}`;
    } else {
      title = 'File Change Approval Required';
      body = `File: ${request.payload.path}`;
    }

    const notification = new Notification({
      title,
      body,
      icon: this.getIconPath(),
    });

    notification.on('click', () => {
      const windowManager = getWindowManager();
      const window = windowManager.getSessionWindow(request.payload.threadId);
      if (window) {
        window.focus();
      } else {
        windowManager.createSessionWindow(request.payload.threadId);
      }
    });

    notification.show();
  }

  /**
   * Show a notification for session completion
   */
  showCompletionNotification(threadId: string, message: string): void {
    const settings = getWindowManager().getSettings();
    if (!settings.showNotifications) {
      return;
    }

    const notification = new Notification({
      title: 'Session Completed',
      body: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
      icon: this.getIconPath(),
    });

    notification.on('click', () => {
      const windowManager = getWindowManager();
      windowManager.createSessionWindow(threadId);
    });

    notification.show();
  }

  /**
   * Setup event listeners from app server
   */
  private setupEventListeners(): void {
    const appServer = getAppServerManager();

    // Listen for approval requests
    appServer.on('approvalRequest', (request: ApprovalRequest) => {
      this.showApprovalNotification(request);
    });

    // Listen for turn completions
    appServer.on('notification', (notification: any) => {
      if (notification.type === 'turnCompleted') {
        // Only show notification if the window is not focused
        const windowManager = getWindowManager();
        const window = windowManager.getSessionWindow(notification.payload.threadId);
        if (!window || !window.isFocused()) {
          this.showCompletionNotification(
            notification.payload.threadId,
            'Agent has completed the response'
          );
        }
      }
    });
  }

  /**
   * Destroy the tray
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

// Singleton instance
let trayManager: TrayManager | null = null;

export function getTrayManager(): TrayManager {
  if (!trayManager) {
    trayManager = new TrayManager();
  }
  return trayManager;
}
