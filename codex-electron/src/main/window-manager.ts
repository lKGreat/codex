/// <reference path="../types/externals.d.ts" />
/**
 * Codex Electron - Window Manager
 * Manages the main window and session windows
 */

import { app, BrowserWindow, shell, ipcMain, IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import path from 'path';
import Store from 'electron-store';
import { getAppServerManager } from './app-server-manager';
import {
  WindowInfo,
  AppSettings,
  ThreadStartParams,
  ThreadResumeParams,
  ThreadBranchParams,
  ThreadListParams,
  ThreadReadParams,
  ThreadArchiveParams,
  ThreadUnarchiveParams,
  ThreadSetNameParams,
  ThreadRollbackParams,
  TurnStartParams,
  TurnInterruptParams,
  ReviewStartParams,
  ConfigWriteParams,
  ConfigWriteBatchParams,
  LoginStartParams,
  WorkbookSelectParams,
  ExecApprovalResponse,
  ApplyPatchApprovalResponse,
  RequestUserInputResponse,
} from '../types';

const store = new Store<{
  windowBounds?: { width: number; height: number; x?: number; y?: number };
  settings: AppSettings;
}>({
  defaults: {
    settings: {
      windowMode: 'multi',
      theme: 'system',
      minimizeToTray: true,
      showNotifications: true,
    },
  },
});

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private sessionWindows: Map<string, BrowserWindow> = new Map(); // threadId -> window
  private isDev: boolean;
  private readonly devServerUrl = 'http://127.0.0.1:5173';

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    this.setupIpcHandlers();
  }

  private async loadUrlWithRetry(
    window: BrowserWindow,
    url: string,
    options: { retries?: number; delayMs?: number } = {}
  ): Promise<void> {
    const retries = options.retries ?? 50;
    const delayMs = options.delayMs ?? 200;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await window.loadURL(url);
        return;
      } catch (error) {
        if (attempt >= retries) {
          throw error;
        }

        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Create the main window (session list)
   */
  createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const savedBounds = store.get('windowBounds');

    const mainWindowOptions: Electron.BrowserWindowConstructorOptions = {
      width: savedBounds?.width || 1200,
      height: savedBounds?.height || 800,
      x: savedBounds?.x,
      y: savedBounds?.y,
      minWidth: 800,
      minHeight: 600,
      title: 'Codex Desktop',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    };

    const iconPath = path.join(__dirname, '..', '..', 'resources', 'icons', 'icon.png');
    if (fs.existsSync(iconPath)) {
      mainWindowOptions.icon = iconPath;
    }

    this.mainWindow = new BrowserWindow(mainWindowOptions);

    // Load the app
    if (this.isDev) {
      void this.loadUrlWithRetry(this.mainWindow, this.devServerUrl);
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
    }

    // Save window bounds on close
    this.mainWindow.on('close', () => {
      if (this.mainWindow) {
        store.set('windowBounds', this.mainWindow.getBounds());
      }
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  /**
   * Create a session window for a specific thread
   */
  createSessionWindow(threadId: string, forceNewWindow = false): BrowserWindow {
    const settings = this.getSettings();

    if (settings.windowMode === 'tabs' && !forceNewWindow) {
      const mainWindow = this.createMainWindow();
      mainWindow.webContents.send('navigate', `/session/${threadId}`);
      mainWindow.focus();
      return mainWindow;
    }

    // Check if window already exists
    const existing = this.sessionWindows.get(threadId);
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return existing;
    }

    const sessionIconPath = path.join(__dirname, '..', '..', 'resources', 'icons', 'icon.png');
    const sessionWindowOptions: Electron.BrowserWindowConstructorOptions = {
      width: 1000,
      height: 800,
      minWidth: 600,
      minHeight: 400,
      title: 'Codex Session',
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    };

    if (fs.existsSync(sessionIconPath)) {
      sessionWindowOptions.icon = sessionIconPath;
    }

    const sessionWindow = new BrowserWindow(sessionWindowOptions);

    // Load with thread ID as query param
    if (this.isDev) {
      void this.loadUrlWithRetry(sessionWindow, `${this.devServerUrl}/#/session/${threadId}`);
      // sessionWindow.webContents.openDevTools();
    } else {
      sessionWindow.loadFile(
        path.join(__dirname, '..', 'renderer', 'index.html'),
        { hash: `/session/${threadId}` }
      );
    }

    // Register with app server manager
    const appServer = getAppServerManager();
    appServer.registerThreadWindow(threadId, sessionWindow.id);

    sessionWindow.on('closed', () => {
      this.sessionWindows.delete(threadId);
      appServer.unregisterThreadWindow(threadId);
    });

    this.sessionWindows.set(threadId, sessionWindow);
    return sessionWindow;
  }

  /**
   * Get the main window
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  /**
   * Get a session window by thread ID
   */
  getSessionWindow(threadId: string): BrowserWindow | undefined {
    return this.sessionWindows.get(threadId);
  }

  /**
   * Get all windows info
   */
  getAllWindows(): WindowInfo[] {
    const windows: WindowInfo[] = [];
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      windows.push({ id: this.mainWindow.id, type: 'main' });
    }
    
    for (const [threadId, window] of this.sessionWindows) {
      if (!window.isDestroyed()) {
        windows.push({ id: window.id, type: 'session', threadId });
      }
    }
    
    return windows;
  }

  /**
   * Close a session window
   */
  closeSessionWindow(threadId: string): void {
    const window = this.sessionWindows.get(threadId);
    if (window && !window.isDestroyed()) {
      window.close();
    }
  }

  /**
   * Broadcast a message to all windows
   */
  broadcast(channel: string, ...args: unknown[]): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
    
    for (const window of this.sessionWindows.values()) {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, ...args);
      }
    }
  }

  /**
   * Send a message to a specific thread's window
   */
  sendToThread(threadId: string, channel: string, ...args: unknown[]): void {
    const window = this.sessionWindows.get(threadId);
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, ...args);
    }
  }

  /**
   * Get app settings
   */
  getSettings(): AppSettings {
    return store.get('settings');
  }

  /**
   * Update app settings
   */
  updateSettings(settings: Partial<AppSettings>): void {
    const current = store.get('settings');
    store.set('settings', { ...current, ...settings });
  }

  /**
   * Setup IPC handlers for renderer processes
   */
  private setupIpcHandlers(): void {
    const appServer = getAppServerManager();

    // Generic request handler
    const handleRequest = async <T>(
      _event: IpcMainInvokeEvent,
      method: string,
      params?: unknown,
      fallbackMethod?: string
    ): Promise<T> => {
      try {
        return await appServer.send<T>(method, params);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (fallbackMethod && message.includes('unknown variant')) {
          return appServer.send<T>(fallbackMethod, params);
        }
        throw error;
      }
    };

    // Initialize
    ipcMain.handle('codex:initialize', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'initialize')
    );

    // Thread operations
    ipcMain.handle('codex:thread/start', (_e: IpcMainInvokeEvent, params: ThreadStartParams) =>
      handleRequest(_e, 'thread/start', params)
    );
    ipcMain.handle('codex:thread/resume', (_e: IpcMainInvokeEvent, params: ThreadResumeParams) =>
      handleRequest(_e, 'thread/resume', params)
    );
    ipcMain.handle('codex:thread/branch', (_e: IpcMainInvokeEvent, params: ThreadBranchParams) =>
      handleRequest(_e, 'thread/fork', params, 'thread/branch')
    );
    ipcMain.handle('codex:thread/list', (_e: IpcMainInvokeEvent, params: ThreadListParams) =>
      handleRequest(_e, 'thread/list', params)
    );
    ipcMain.handle('codex:thread/read', (_e: IpcMainInvokeEvent, params: ThreadReadParams) =>
      handleRequest(_e, 'thread/read', params)
    );
    ipcMain.handle('codex:thread/archive', (_e: IpcMainInvokeEvent, params: ThreadArchiveParams) =>
      handleRequest(_e, 'thread/archive', params)
    );
    ipcMain.handle(
      'codex:thread/unarchive',
      (_e: IpcMainInvokeEvent, params: ThreadUnarchiveParams) =>
      handleRequest(_e, 'thread/unarchive', params)
    );
    ipcMain.handle('codex:thread/setName', (_e: IpcMainInvokeEvent, params: ThreadSetNameParams) =>
      handleRequest(_e, 'thread/name/set', params, 'thread/setName')
    );
    ipcMain.handle('codex:thread/rollback', (_e: IpcMainInvokeEvent, params: ThreadRollbackParams) =>
      handleRequest(_e, 'thread/rollback', params)
    );

    // Turn operations
    ipcMain.handle('codex:turn/start', (_e: IpcMainInvokeEvent, params: TurnStartParams) =>
      handleRequest(_e, 'turn/start', params)
    );
    ipcMain.handle('codex:turn/interrupt', (_e: IpcMainInvokeEvent, params: TurnInterruptParams) =>
      handleRequest(_e, 'turn/interrupt', params)
    );

    // Review
    ipcMain.handle('codex:review/start', (_e: IpcMainInvokeEvent, params: ReviewStartParams) =>
      handleRequest(_e, 'review/start', params)
    );

    // Models
    ipcMain.handle('codex:models/list', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'model/list', undefined, 'models/list')
    );

    // Config
    ipcMain.handle('codex:config/read', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'config/read')
    );
    ipcMain.handle('codex:config/write', (_e: IpcMainInvokeEvent, params: ConfigWriteParams) =>
      handleRequest(_e, 'config/value/write', params, 'config/write')
    );
    ipcMain.handle(
      'codex:config/writeBatch',
      (_e: IpcMainInvokeEvent, params: ConfigWriteBatchParams) =>
      handleRequest(_e, 'config/batchWrite', params, 'config/writeBatch')
    );

    // Auth
    ipcMain.handle('codex:login/start', async (_e: IpcMainInvokeEvent, params: LoginStartParams) => {
      const result = await handleRequest<{ type: string; authUrl?: string; loginId?: string }>(_e, 'account/login/start', params, 'login/start');
      // Open OAuth URL in browser if provided
      if (result.authUrl) {
        shell.openExternal(result.authUrl);
      }
      return result;
    });
    ipcMain.handle('codex:login/cancel', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'account/login/cancel', undefined, 'login/cancel')
    );
    ipcMain.handle('codex:logout', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'account/logout', undefined, 'logout')
    );
    ipcMain.handle('codex:account/read', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'account/read')
    );
    ipcMain.handle('codex:rateLimits/read', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'account/rateLimits/read', undefined, 'rateLimits/read')
    );

    // Workbook operations
    ipcMain.handle('codex:workbook/list', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'account/workbook/list', undefined, 'workbook/list')
    );
    ipcMain.handle('codex:workbook/select', (_e: IpcMainInvokeEvent, params: WorkbookSelectParams) =>
      handleRequest(_e, 'account/workbook/select', params, 'workbook/select')
    );

    // Skills & Apps
    ipcMain.handle('codex:skills/list', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'skills/list')
    );
    ipcMain.handle('codex:apps/list', (_e: IpcMainInvokeEvent) =>
      handleRequest(_e, 'app/list', undefined, 'apps/list')
    );

    // Approval responses
    ipcMain.handle(
      'codex:approval/exec',
      (_e: IpcMainInvokeEvent, requestId: string, response: ExecApprovalResponse) => {
        appServer.respondToRequest(requestId, response);
      }
    );
    ipcMain.handle(
      'codex:approval/applyPatch',
      (_e: IpcMainInvokeEvent, requestId: string, response: ApplyPatchApprovalResponse) => {
        appServer.respondToRequest(requestId, response);
      }
    );
    ipcMain.handle(
      'codex:userInput/respond',
      (_e: IpcMainInvokeEvent, requestId: string, response: RequestUserInputResponse) => {
        appServer.respondToRequest(requestId, response);
      }
    );

    // Window operations
    ipcMain.handle('codex:window/openSession', (_e: IpcMainInvokeEvent, threadId: string) => {
      this.createSessionWindow(threadId, false);
    });
    ipcMain.handle('codex:window/openSessionForce', (_e: IpcMainInvokeEvent, threadId: string) => {
      this.createSessionWindow(threadId, true);
    });
    ipcMain.handle('codex:window/closeSession', (_e: IpcMainInvokeEvent, threadId: string) => {
      this.closeSessionWindow(threadId);
    });

    // Settings
    ipcMain.handle('codex:settings/get', () => this.getSettings());
    ipcMain.handle('codex:settings/update', (_e: IpcMainInvokeEvent, settings: Partial<AppSettings>) => {
      this.updateSettings(settings);
    });

    // Setup notification forwarding
    appServer.on('notification', (notification) => {
      this.broadcast('codex:notification', notification);
    });

    appServer.on('approvalRequest', (request) => {
      // Send to the relevant thread's window, or broadcast if no specific window
      const threadId = request.payload.threadId;
      const window = this.sessionWindows.get(threadId);
      if (window && !window.isDestroyed()) {
        window.webContents.send('codex:approvalRequest', request);
        window.focus();
      } else {
        this.broadcast('codex:approvalRequest', request);
      }
    });

    appServer.on('userInputRequest', (request) => {
      const threadId = request.threadId;
      const window = this.sessionWindows.get(threadId);
      if (window && !window.isDestroyed()) {
        window.webContents.send('codex:userInputRequest', request);
        window.focus();
      } else {
        this.broadcast('codex:userInputRequest', request);
      }
    });
  }
}

// Singleton instance
let windowManager: WindowManager | null = null;

export function getWindowManager(): WindowManager {
  if (!windowManager) {
    windowManager = new WindowManager();
  }
  return windowManager;
}
