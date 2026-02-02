// Minimal shims for Electron types in the workspace TS configuration.
// These are used only for editor/typecheck until the Electron types are resolved.

declare module 'electron' {
  export const app: {
    isPackaged: boolean;
    getPath: (name: string) => string;
    getVersion: () => string;
    quit: () => void;
    whenReady: () => Promise<void>;
    on: (event: string, listener: (...args: any[]) => void) => void;
    requestSingleInstanceLock: () => boolean;
  };

  export class BrowserWindow {
    static getAllWindows(): BrowserWindow[];
    id: number;
    webContents: {
      send: (channel: string, ...args: any[]) => void;
      openDevTools: () => void;
      setWindowOpenHandler: (handler: (details: { url: string }) => { action: 'deny' | 'allow' }) => void;
    };
    constructor(options?: any);
    loadURL: (url: string) => void;
    loadFile: (path: string, options?: any) => void;
    focus: () => void;
    close: () => void;
    restore: () => void;
    isMinimized: () => boolean;
    isDestroyed: () => boolean;
    getBounds: () => { width: number; height: number; x?: number; y?: number };
    on: (event: string, listener: (...args: any[]) => void) => void;
  }

  export const ipcMain: {
    handle: (channel: string, listener: (...args: any[]) => any) => void;
  };

  export const ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  };

  export const contextBridge: {
    exposeInMainWorld: (key: string, api: any) => void;
  };

  export const shell: {
    openExternal: (url: string) => void;
  };

  export class Tray {
    constructor(image: any);
    setToolTip: (tooltip: string) => void;
    setContextMenu: (menu: any) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
    destroy: () => void;
  }

  export class Menu {
    static buildFromTemplate(template: any[]): any;
  }

  export const nativeImage: {
    createFromPath: (path: string) => any;
  };

  export class Notification {
    constructor(options: any);
    show: () => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
  }

  export interface IpcMainInvokeEvent {}
  export interface IpcRendererEvent {}
}

declare namespace Electron {
  interface MenuItemConstructorOptions {
    label?: string;
    icon?: any;
    accelerator?: string;
    click?: () => void;
    submenu?: MenuItemConstructorOptions[];
    enabled?: boolean;
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
  }
}

declare module 'electron-store' {
  export default class Store<T> {
    constructor(options?: any);
    get<K extends keyof T>(key: K): T[K];
    set<K extends keyof T>(key: K, value: T[K]): void;
  }
}
