/**
 * Codex Electron - Type definitions for JSON-RPC protocol
 * These types mirror the codex app-server protocol
 */

// ============================================================================
// JSON-RPC Base Types
// ============================================================================

export type RequestId = string | number;

export interface JSONRPCRequest {
  method: string;
  id: RequestId;
  params?: unknown;
}

export interface JSONRPCNotification {
  method: string;
  params?: unknown;
}

export interface JSONRPCResponse {
  id: RequestId;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

// ============================================================================
// Thread (Session) Types
// ============================================================================

export interface Thread {
  id: string;
  preview: string;
  modelProvider: string;
  createdAt: number;
  updatedAt: number;
  path?: string;
  cwd: string;
  cliVersion: string;
  source: SessionSource;
  gitInfo?: GitInfo;
  turns: Turn[];
  name?: string;
  archivedAt?: number;
}

export type SessionSource = 'cli' | 'vscode' | 'exec' | 'appServer' | 'electron';

export interface GitInfo {
  sha?: string;
  branch?: string;
  originUrl?: string;
}

// ============================================================================
// Turn Types
// ============================================================================

export interface Turn {
  id: string;
  items: ThreadItem[];
  status: TurnStatus;
  error?: TurnError;
}

export type TurnStatus = 'completed' | 'interrupted' | 'failed' | 'inProgress';

export interface TurnError {
  code: string;
  message: string;
}

// ============================================================================
// Thread Item Types
// ============================================================================

export type ThreadItem =
  | UserMessageItem
  | AgentMessageItem
  | PlanItem
  | ReasoningItem
  | CommandExecutionItem
  | FileChangeItem
  | McpToolCallItem
  | WebSearchItem
  | ImageViewItem
  | EnteredReviewModeItem
  | ExitedReviewModeItem
  | ContextCompactionItem;

export interface UserMessageItem {
  type: 'userMessage';
  id: string;
  content: UserInput[];
}

export interface AgentMessageItem {
  type: 'agentMessage';
  id: string;
  content: string;
}

export interface PlanItem {
  type: 'plan';
  id: string;
  content: string;
}

export interface ReasoningItem {
  type: 'reasoning';
  id: string;
  summary: string;
  text?: string;
}

export interface CommandExecutionItem {
  type: 'commandExecution';
  id: string;
  callId: string;
  command: string[];
  cwd: string;
  output: string;
  exitCode?: number;
  status: 'running' | 'completed' | 'failed' | 'approved' | 'rejected';
}

export interface FileChangeItem {
  type: 'fileChange';
  id: string;
  callId: string;
  path: string;
  diff: string;
  status: 'pending' | 'applied' | 'rejected';
}

export interface McpToolCallItem {
  type: 'mcpToolCall';
  id: string;
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'running' | 'completed' | 'failed';
}

export interface WebSearchItem {
  type: 'webSearch';
  id: string;
  query: string;
  results?: WebSearchResult[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ImageViewItem {
  type: 'imageView';
  id: string;
  url: string;
}

export interface EnteredReviewModeItem {
  type: 'enteredReviewMode';
  id: string;
}

export interface ExitedReviewModeItem {
  type: 'exitedReviewMode';
  id: string;
}

export interface ContextCompactionItem {
  type: 'contextCompaction';
  id: string;
}

// ============================================================================
// User Input Types
// ============================================================================

export type UserInput =
  | TextInput
  | ImageInput
  | LocalImageInput
  | SkillInput
  | MentionInput;

export interface TextInput {
  type: 'text';
  text: string;
  textElements?: TextElement[];
}

export interface ImageInput {
  type: 'image';
  url: string;
}

export interface LocalImageInput {
  type: 'localImage';
  path: string;
}

export interface SkillInput {
  type: 'skill';
  name: string;
  path: string;
}

export interface MentionInput {
  type: 'mention';
  name: string;
  path: string;
}

export interface TextElement {
  type: 'text' | 'file' | 'url';
  content: string;
}

// ============================================================================
// Client Request Types
// ============================================================================

// Initialize
export interface InitializeParams {
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResponse {
  serverInfo: {
    name: string;
    version: string;
  };
}

// Thread operations
export interface ThreadStartParams {
  cwd?: string;
  model?: string;
  instructions?: string;
}

export interface ThreadStartResponse {
  thread: Thread;
}

export interface ThreadResumeParams {
  threadId: string;
}

export interface ThreadResumeResponse {
  thread: Thread;
}

export interface ThreadBranchParams {
  threadId: string;
  turnIndex?: number;
}

export interface ThreadBranchResponse {
  thread: Thread;
}

export interface ThreadListParams {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

export interface ThreadListResponse {
  threads: ThreadMetadata[];
  total: number;
}

export interface ThreadMetadata {
  id: string;
  preview: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  cwd: string;
  modelProvider: string;
}

export interface ThreadReadParams {
  threadId: string;
}

export interface ThreadReadResponse {
  thread: Thread;
}

export interface ThreadArchiveParams {
  threadId: string;
}

export interface ThreadUnarchiveParams {
  threadId: string;
}

export interface ThreadSetNameParams {
  threadId: string;
  name: string;
}

export interface ThreadRollbackParams {
  threadId: string;
  count: number;
}

// Turn operations
export interface TurnStartParams {
  threadId: string;
  input: UserInput[];
  model?: string;
}

export interface TurnStartResponse {
  turn: Turn;
}

export interface TurnInterruptParams {
  threadId: string;
}

// Review
export interface ReviewStartParams {
  threadId: string;
  paths?: string[];
}

// Models
export interface ModelsListResponse {
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

// Config
export interface ConfigReadResponse {
  config: CodexConfig;
}

export interface ConfigWriteParams {
  key: string;
  value: unknown;
}

export interface ConfigWriteBatchParams {
  updates: Array<{ key: string; value: unknown }>;
}

export interface CodexConfig {
  model?: string;
  approvalPolicy?: ApprovalPolicy;
  sandboxPolicy?: SandboxPolicy;
  mcpServers?: McpServerConfig[];
}

export type ApprovalPolicy = 'suggest' | 'autoEdit' | 'fullAuto';
export type SandboxPolicy = 'strict' | 'permissive' | 'disabled';

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

// Auth
export type LoginStartParams = 
  | { type: 'apiKey'; apiKey: string }
  | { type: 'chatgpt' }
  | { type: 'chatgptAuthTokens'; idToken: string; accessToken: string };

export type LoginStartResponse = 
  | { type: 'apiKey' }
  | { type: 'chatgpt'; loginId: string; authUrl: string }
  | { type: 'chatgptAuthTokens' };

export interface AccountReadResponse {
  loggedIn: boolean;
  email?: string;
  name?: string;
  avatarUrl?: string;
  currentWorkbook?: Workbook;
}

// Workbook types
export interface Workbook {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface WorkbookListResponse {
  workbooks: Workbook[];
}

export interface WorkbookSelectParams {
  workbookId: string;
}

export interface RateLimitsReadResponse {
  limits: RateLimit[];
}

export interface RateLimit {
  name: string;
  limit: number;
  used: number;
  resetsAt: number;
}

// Skills
export interface SkillsListResponse {
  skills: SkillInfo[];
}

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
}

// Apps
export interface AppsListResponse {
  apps: AppInfo[];
}

export interface AppInfo {
  name: string;
  description: string;
  id: string;
}

// ============================================================================
// Server Request Types (require client response)
// ============================================================================

export interface ExecApprovalRequest {
  requestId: string;
  threadId: string;
  callId: string;
  command: string[];
  cwd: string;
}

export interface ExecApprovalResponse {
  decision: ApprovalDecision;
}

export interface ApplyPatchApprovalRequest {
  requestId: string;
  threadId: string;
  callId: string;
  path: string;
  diff: string;
}

export interface ApplyPatchApprovalResponse {
  decision: ApprovalDecision;
}

export type ApprovalDecision = 'allow_once' | 'allow_session' | 'allow_always' | 'deny';

export interface RequestUserInputRequest {
  requestId: string;
  threadId: string;
  prompt: string;
}

export interface RequestUserInputResponse {
  input: string;
}

// ============================================================================
// Server Notification Types
// ============================================================================

export interface ThreadStartedNotification {
  thread: Thread;
}

export interface ThreadNameUpdatedNotification {
  threadId: string;
  name: string;
}

export interface TurnStartedNotification {
  threadId: string;
  turn: Turn;
}

export interface TurnCompletedNotification {
  threadId: string;
  turnId: string;
  status: TurnStatus;
  error?: TurnError;
}

export interface ItemStartedNotification {
  threadId: string;
  turnId: string;
  item: ThreadItem;
}

export interface ItemCompletedNotification {
  threadId: string;
  turnId: string;
  itemId: string;
}

export interface AgentMessageDeltaNotification {
  threadId: string;
  turnId: string;
  itemId: string;
  delta: string;
}

export interface PlanDeltaNotification {
  threadId: string;
  turnId: string;
  itemId: string;
  delta: string;
}

export interface ExecCommandOutputDeltaNotification {
  threadId: string;
  turnId: string;
  itemId: string;
  delta: string;
}

export interface ReasoningSummaryDeltaNotification {
  threadId: string;
  turnId: string;
  itemId: string;
  delta: string;
}

export interface AccountStatusNotification {
  loggedIn: boolean;
  email?: string;
}

export interface LoginCompletedNotification {
  loginId: string | null;
  success: boolean;
  error: string | null;
}

export interface ErrorNotification {
  code: string;
  message: string;
}

// ============================================================================
// IPC Channel Types
// ============================================================================

export interface CodexAPI {
  // Initialize
  initialize(): Promise<InitializeResponse>;
  
  // Thread operations
  threadStart(params: ThreadStartParams): Promise<ThreadStartResponse>;
  threadResume(params: ThreadResumeParams): Promise<ThreadResumeResponse>;
  threadBranch(params: ThreadBranchParams): Promise<ThreadBranchResponse>;
  threadList(params: ThreadListParams): Promise<ThreadListResponse>;
  threadRead(params: ThreadReadParams): Promise<ThreadReadResponse>;
  threadArchive(params: ThreadArchiveParams): Promise<void>;
  threadUnarchive(params: ThreadUnarchiveParams): Promise<void>;
  threadSetName(params: ThreadSetNameParams): Promise<void>;
  threadRollback(params: ThreadRollbackParams): Promise<void>;
  
  // Turn operations
  turnStart(params: TurnStartParams): Promise<TurnStartResponse>;
  turnInterrupt(params: TurnInterruptParams): Promise<void>;
  
  // Review
  reviewStart(params: ReviewStartParams): Promise<void>;
  
  // Models
  modelsList(): Promise<ModelsListResponse>;
  
  // Config
  configRead(): Promise<ConfigReadResponse>;
  configWrite(params: ConfigWriteParams): Promise<void>;
  configWriteBatch(params: ConfigWriteBatchParams): Promise<void>;
  
  // Auth
  loginStart(params: LoginStartParams): Promise<LoginStartResponse>;
  loginCancel(): Promise<void>;
  logout(): Promise<void>;
  accountRead(): Promise<AccountReadResponse>;
  rateLimitsRead(): Promise<RateLimitsReadResponse>;
  
  // Workbook operations
  workbookList(): Promise<WorkbookListResponse>;
  workbookSelect(params: WorkbookSelectParams): Promise<void>;
  
  // Skills & Apps
  skillsList(): Promise<SkillsListResponse>;
  appsList(): Promise<AppsListResponse>;
  
  // Approval responses
  respondToExecApproval(requestId: string, response: ExecApprovalResponse): Promise<void>;
  respondToApplyPatchApproval(requestId: string, response: ApplyPatchApprovalResponse): Promise<void>;
  respondToUserInput(requestId: string, response: RequestUserInputResponse): Promise<void>;
  
  // Event listeners
  onNotification(callback: (notification: ServerNotification) => void): () => void;
  onApprovalRequest(callback: (request: ApprovalRequest) => void): () => void;
  onUserInputRequest(callback: (request: RequestUserInputRequest) => void): () => void;
  
  // Window operations
  openSessionWindow(threadId: string): Promise<void>;
  openSessionWindowForce(threadId: string): Promise<void>;
  closeSessionWindow(threadId: string): Promise<void>;
}

export type ServerNotification =
  | { type: 'threadStarted'; payload: ThreadStartedNotification }
  | { type: 'threadNameUpdated'; payload: ThreadNameUpdatedNotification }
  | { type: 'turnStarted'; payload: TurnStartedNotification }
  | { type: 'turnCompleted'; payload: TurnCompletedNotification }
  | { type: 'itemStarted'; payload: ItemStartedNotification }
  | { type: 'itemCompleted'; payload: ItemCompletedNotification }
  | { type: 'agentMessageDelta'; payload: AgentMessageDeltaNotification }
  | { type: 'planDelta'; payload: PlanDeltaNotification }
  | { type: 'execCommandOutputDelta'; payload: ExecCommandOutputDeltaNotification }
  | { type: 'reasoningSummaryDelta'; payload: ReasoningSummaryDeltaNotification }
  | { type: 'accountStatus'; payload: AccountStatusNotification }
  | { type: 'loginCompleted'; payload: LoginCompletedNotification }
  | { type: 'error'; payload: ErrorNotification };

export type ApprovalRequest =
  | { type: 'exec'; payload: ExecApprovalRequest }
  | { type: 'applyPatch'; payload: ApplyPatchApprovalRequest };

// ============================================================================
// Window Types
// ============================================================================

export interface WindowInfo {
  id: number;
  type: 'main' | 'session';
  threadId?: string;
}

export interface AppSettings {
  windowMode: 'multi' | 'tabs';
  theme: 'light' | 'dark' | 'system';
  minimizeToTray: boolean;
  showNotifications: boolean;
}

declare global {
  interface Window {
    codex: CodexAPI;
  }
}
