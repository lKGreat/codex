/**
 * Codex Electron - App Server Manager
 * Manages the codex app-server subprocess and JSON-RPC communication
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { app } from 'electron';
import path from 'path';
import {
  JSONRPCMessage,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  RequestId,
  InitializeResponse,
  ApprovalRequest,
  ServerNotification,
  RequestUserInputRequest,
} from '../types';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  method: string;
  windowId?: number;
}

export class AppServerManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private pendingRequests: Map<RequestId, PendingRequest> = new Map();
  private requestId = 0;
  private buffer = '';
  private threadWindowMap: Map<string, number> = new Map(); // threadId -> windowId
  private initialized = false;

  constructor() {
    super();
  }

  /**
   * Get the path to the codex binary
   */
  private getCodexBinaryPath(): string {
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // Development: use local build
      const devPath = path.join(__dirname, '..', '..', '..', 'codex-rs', 'target', 'release');
      if (process.platform === 'win32') {
        return path.join(devPath, 'codex.exe');
      }
      return path.join(devPath, 'codex');
    } else {
      // Production: use bundled binary in resources
      const resourcesPath = process.resourcesPath;
      if (process.platform === 'win32') {
        return path.join(resourcesPath, 'codex.exe');
      }
      return path.join(resourcesPath, 'codex');
    }
  }

  /**
   * Start the app-server process
   */
  async start(): Promise<void> {
    if (this.process) {
      console.warn('App server already running');
      return;
    }

    const codexPath = this.getCodexBinaryPath();
    console.log(`Starting codex app-server from: ${codexPath}`);

    this.process = spawn(codexPath, ['app-server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure proper terminal handling
        TERM: 'xterm-256color',
      },
    });

    // Handle stdout (JSON-RPC messages)
    this.process.stdout?.on('data', (data: Buffer) => {
      this.handleData(data.toString());
    });

    // Handle stderr (logs/errors)
    this.process.stderr?.on('data', (data: Buffer) => {
      console.error('[codex-server]', data.toString());
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log(`App server exited with code ${code}, signal ${signal}`);
      this.process = null;
      this.initialized = false;
      this.emit('exit', { code, signal });
      
      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        pending.reject(new Error('App server process exited'));
        this.pendingRequests.delete(id);
      }
    });

    this.process.on('error', (error) => {
      console.error('App server error:', error);
      this.emit('error', error);
    });

    // Initialize the connection
    await this.initialize();
  }

  /**
   * Stop the app-server process
   */
  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.initialized = false;
    }
  }

  /**
   * Handle incoming data from stdout
   */
  private handleData(data: string): void {
    this.buffer += data;
    
    // Process complete JSON lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as JSONRPCMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse JSON-RPC message:', line, error);
        }
      }
    }
  }

  /**
   * Handle a parsed JSON-RPC message
   */
  private handleMessage(message: JSONRPCMessage): void {
    // Response to a request we sent
    if ('id' in message && message.id !== undefined) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        const response = message as JSONRPCResponse;
        if (response.error) {
          pending.reject(new Error(response.error.message));
        } else {
          pending.resolve(response.result);
        }
        this.pendingRequests.delete(message.id);
        return;
      }
    }

    // Server request (needs our response)
    if ('method' in message && 'id' in message) {
      this.handleServerRequest(message as JSONRPCRequest);
      return;
    }

    // Server notification
    if ('method' in message && !('id' in message)) {
      this.handleServerNotification(message as JSONRPCNotification);
      return;
    }
  }

  /**
   * Handle server requests that need our response (e.g., approval requests)
   */
  private handleServerRequest(request: JSONRPCRequest): void {
    const { method, params, id } = request;

    switch (method) {
      case 'exec/approvalRequest': {
        const payload = params as {
          threadId: string;
          callId: string;
          command: string[];
          cwd: string;
        };
        const approvalRequest: ApprovalRequest = {
          type: 'exec',
          payload: {
            requestId: String(id),
            ...payload,
          },
        };
        this.emit('approvalRequest', approvalRequest);
        break;
      }

      case 'applyPatch/approvalRequest': {
        const payload = params as {
          threadId: string;
          callId: string;
          path: string;
          diff: string;
        };
        const approvalRequest: ApprovalRequest = {
          type: 'applyPatch',
          payload: {
            requestId: String(id),
            ...payload,
          },
        };
        this.emit('approvalRequest', approvalRequest);
        break;
      }

      case 'userInput/request': {
        const payload = params as {
          threadId: string;
          prompt: string;
        };
        const userInputRequest: RequestUserInputRequest = {
          requestId: String(id),
          ...payload,
        };
        this.emit('userInputRequest', userInputRequest);
        break;
      }

      default:
        console.warn('Unhandled server request:', method);
    }
  }

  /**
   * Handle server notifications
   */
  private handleServerNotification(notification: JSONRPCNotification): void {
    const { method, params } = notification;
    
    let serverNotification: ServerNotification | null = null;

    switch (method) {
      case 'thread/started':
        serverNotification = { type: 'threadStarted', payload: params as any };
        break;
      case 'thread/nameUpdated':
        serverNotification = { type: 'threadNameUpdated', payload: params as any };
        break;
      case 'turn/started':
        serverNotification = { type: 'turnStarted', payload: params as any };
        break;
      case 'turn/completed':
        serverNotification = { type: 'turnCompleted', payload: params as any };
        break;
      case 'item/started':
        serverNotification = { type: 'itemStarted', payload: params as any };
        break;
      case 'item/completed':
        serverNotification = { type: 'itemCompleted', payload: params as any };
        break;
      case 'agentMessage/delta':
        serverNotification = { type: 'agentMessageDelta', payload: params as any };
        break;
      case 'plan/delta':
        serverNotification = { type: 'planDelta', payload: params as any };
        break;
      case 'execCommandOutput/delta':
        serverNotification = { type: 'execCommandOutputDelta', payload: params as any };
        break;
      case 'reasoningSummary/delta':
        serverNotification = { type: 'reasoningSummaryDelta', payload: params as any };
        break;
      case 'account/status':
        serverNotification = { type: 'accountStatus', payload: params as any };
        break;
      case 'login/completed':
        serverNotification = { type: 'loginCompleted', payload: params as any };
        break;
      case 'error':
        serverNotification = { type: 'error', payload: params as any };
        break;
      default:
        console.log('Unhandled notification:', method);
        return;
    }

    if (serverNotification) {
      this.emit('notification', serverNotification);
    }
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  async send<T>(method: string, params?: unknown, windowId?: number): Promise<T> {
    if (!this.process || !this.process.stdin) {
      throw new Error('App server not running');
    }

    const id = ++this.requestId;
    const request: JSONRPCRequest = { method, id, params: params ?? {} };

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        method,
        windowId,
      });

      const message = JSON.stringify(request) + '\n';
      this.process!.stdin!.write(message, (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(error);
        }
      });
    });
  }

  /**
   * Send a response to a server request (e.g., approval response)
   */
  respondToRequest(requestId: RequestId, result: unknown): void {
    if (!this.process || !this.process.stdin) {
      console.error('Cannot respond: app server not running');
      return;
    }

    const response: JSONRPCResponse = {
      id: requestId,
      result,
    };

    const message = JSON.stringify(response) + '\n';
    this.process.stdin.write(message);
  }

  /**
   * Initialize the connection with the server
   */
  private async initialize(): Promise<InitializeResponse> {
    const response = await this.send<InitializeResponse>('initialize', {
      clientInfo: {
        name: 'codex-electron',
        version: app.getVersion(),
      },
    });

    // Send initialized notification
    const notification: JSONRPCNotification = { method: 'initialized' };
    this.process?.stdin?.write(JSON.stringify(notification) + '\n');

    this.initialized = true;
    console.log('App server initialized:', response);
    
    return response;
  }

  /**
   * Register a window for a thread
   */
  registerThreadWindow(threadId: string, windowId: number): void {
    this.threadWindowMap.set(threadId, windowId);
  }

  /**
   * Unregister a window for a thread
   */
  unregisterThreadWindow(threadId: string): void {
    this.threadWindowMap.delete(threadId);
  }

  /**
   * Get the window ID for a thread
   */
  getWindowForThread(threadId: string): number | undefined {
    return this.threadWindowMap.get(threadId);
  }

  /**
   * Check if the server is running and initialized
   */
  isReady(): boolean {
    return this.process !== null && this.initialized;
  }
}

// Singleton instance
let appServerManager: AppServerManager | null = null;

export function getAppServerManager(): AppServerManager {
  if (!appServerManager) {
    appServerManager = new AppServerManager();
  }
  return appServerManager;
}
