/// <reference path="../types/externals.d.ts" />
/**
 * Codex Electron - Preload Script
 * Exposes safe APIs to the renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  CodexAPI,
  InitializeResponse,
  ThreadStartParams,
  ThreadStartResponse,
  ThreadResumeParams,
  ThreadResumeResponse,
  ThreadBranchParams,
  ThreadBranchResponse,
  ThreadListParams,
  ThreadListResponse,
  ThreadReadParams,
  ThreadReadResponse,
  ThreadArchiveParams,
  ThreadUnarchiveParams,
  ThreadSetNameParams,
  ThreadRollbackParams,
  TurnStartParams,
  TurnStartResponse,
  TurnInterruptParams,
  ReviewStartParams,
  ModelsListResponse,
  ConfigReadResponse,
  ConfigWriteParams,
  ConfigWriteBatchParams,
  LoginStartParams,
  LoginStartResponse,
  AccountReadResponse,
  RateLimitsReadResponse,
  WorkbookListResponse,
  WorkbookSelectParams,
  SkillsListResponse,
  AppsListResponse,
  ExecApprovalResponse,
  ApplyPatchApprovalResponse,
  RequestUserInputResponse,
  ServerNotification,
  ApprovalRequest,
  RequestUserInputRequest,
  AppSettings,
} from '../types';

const codexAPI: CodexAPI = {
  // Initialize
  initialize: () => ipcRenderer.invoke('codex:initialize') as Promise<InitializeResponse>,

  // Thread operations
  threadStart: (params: ThreadStartParams) =>
    ipcRenderer.invoke('codex:thread/start', params) as Promise<ThreadStartResponse>,
  threadResume: (params: ThreadResumeParams) =>
    ipcRenderer.invoke('codex:thread/resume', params) as Promise<ThreadResumeResponse>,
  threadBranch: (params: ThreadBranchParams) =>
    ipcRenderer.invoke('codex:thread/branch', params) as Promise<ThreadBranchResponse>,
  threadList: (params: ThreadListParams) =>
    ipcRenderer.invoke('codex:thread/list', params) as Promise<ThreadListResponse>,
  threadRead: (params: ThreadReadParams) =>
    ipcRenderer.invoke('codex:thread/read', params) as Promise<ThreadReadResponse>,
  threadArchive: (params: ThreadArchiveParams) =>
    ipcRenderer.invoke('codex:thread/archive', params) as Promise<void>,
  threadUnarchive: (params: ThreadUnarchiveParams) =>
    ipcRenderer.invoke('codex:thread/unarchive', params) as Promise<void>,
  threadSetName: (params: ThreadSetNameParams) =>
    ipcRenderer.invoke('codex:thread/setName', params) as Promise<void>,
  threadRollback: (params: ThreadRollbackParams) =>
    ipcRenderer.invoke('codex:thread/rollback', params) as Promise<void>,

  // Turn operations
  turnStart: (params: TurnStartParams) =>
    ipcRenderer.invoke('codex:turn/start', params) as Promise<TurnStartResponse>,
  turnInterrupt: (params: TurnInterruptParams) =>
    ipcRenderer.invoke('codex:turn/interrupt', params) as Promise<void>,

  // Review
  reviewStart: (params: ReviewStartParams) =>
    ipcRenderer.invoke('codex:review/start', params) as Promise<void>,

  // Models
  modelsList: () => ipcRenderer.invoke('codex:models/list') as Promise<ModelsListResponse>,

  // Config
  configRead: () => ipcRenderer.invoke('codex:config/read') as Promise<ConfigReadResponse>,
  configWrite: (params: ConfigWriteParams) =>
    ipcRenderer.invoke('codex:config/write', params) as Promise<void>,
  configWriteBatch: (params: ConfigWriteBatchParams) =>
    ipcRenderer.invoke('codex:config/writeBatch', params) as Promise<void>,

  // Auth
  loginStart: (params: LoginStartParams) =>
    ipcRenderer.invoke('codex:login/start', params) as Promise<LoginStartResponse>,
  loginCancel: () => ipcRenderer.invoke('codex:login/cancel') as Promise<void>,
  logout: () => ipcRenderer.invoke('codex:logout') as Promise<void>,
  accountRead: () => ipcRenderer.invoke('codex:account/read') as Promise<AccountReadResponse>,
  rateLimitsRead: () =>
    ipcRenderer.invoke('codex:rateLimits/read') as Promise<RateLimitsReadResponse>,

  // Workbook operations
  workbookList: () =>
    ipcRenderer.invoke('codex:workbook/list') as Promise<WorkbookListResponse>,
  workbookSelect: (params: WorkbookSelectParams) =>
    ipcRenderer.invoke('codex:workbook/select', params) as Promise<void>,

  // Skills & Apps
  skillsList: () => ipcRenderer.invoke('codex:skills/list') as Promise<SkillsListResponse>,
  appsList: () => ipcRenderer.invoke('codex:apps/list') as Promise<AppsListResponse>,

  // Approval responses
  respondToExecApproval: (requestId: string, response: ExecApprovalResponse) =>
    ipcRenderer.invoke('codex:approval/exec', requestId, response) as Promise<void>,
  respondToApplyPatchApproval: (requestId: string, response: ApplyPatchApprovalResponse) =>
    ipcRenderer.invoke('codex:approval/applyPatch', requestId, response) as Promise<void>,
  respondToUserInput: (requestId: string, response: RequestUserInputResponse) =>
    ipcRenderer.invoke('codex:userInput/respond', requestId, response) as Promise<void>,

  // Event listeners
  onNotification: (callback: (notification: ServerNotification) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, notification: ServerNotification) => {
      callback(notification);
    };
    ipcRenderer.on('codex:notification', handler);
    return () => {
      ipcRenderer.removeListener('codex:notification', handler);
    };
  },

  onApprovalRequest: (callback: (request: ApprovalRequest) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, request: ApprovalRequest) => {
      callback(request);
    };
    ipcRenderer.on('codex:approvalRequest', handler);
    return () => {
      ipcRenderer.removeListener('codex:approvalRequest', handler);
    };
  },

  onUserInputRequest: (callback: (request: RequestUserInputRequest) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, request: RequestUserInputRequest) => {
      callback(request);
    };
    ipcRenderer.on('codex:userInputRequest', handler);
    return () => {
      ipcRenderer.removeListener('codex:userInputRequest', handler);
    };
  },

  // Window operations
  openSessionWindow: (threadId: string) =>
    ipcRenderer.invoke('codex:window/openSession', threadId) as Promise<void>,
  openSessionWindowForce: (threadId: string) =>
    ipcRenderer.invoke('codex:window/openSessionForce', threadId) as Promise<void>,
  closeSessionWindow: (threadId: string) =>
    ipcRenderer.invoke('codex:window/closeSession', threadId) as Promise<void>,
};

// Additional APIs for settings and navigation
const electronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke('codex:settings/get') as Promise<AppSettings>,
  updateSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke('codex:settings/update', settings) as Promise<void>,

  // Navigation events from main process
  onNavigate: (callback: (path: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string) => {
      callback(path);
    };
    ipcRenderer.on('navigate', handler);
    return () => {
      ipcRenderer.removeListener('navigate', handler);
    };
  },

  // Platform info
  platform: process.platform,
};

// Expose APIs to renderer
contextBridge.exposeInMainWorld('codex', codexAPI);
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type declarations for renderer
declare global {
  interface Window {
    codex: CodexAPI;
    electron: typeof electronAPI;
  }
}
