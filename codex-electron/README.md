# Codex Desktop (Electron)

A cross-platform desktop GUI for Codex AI coding agent, built with Electron + React + Ant Design.

## Features

- **Multi-window support**: Open multiple sessions in separate windows or tabs
- **Session management**: Create, resume, branch, archive sessions
- **Real-time streaming**: Watch AI responses as they're generated
- **Approval system**: Review and approve/deny command execution and file changes
- **System tray**: Quick access, notifications, minimize to tray
- **Authentication**: Sign in with ChatGPT or API key
- **Settings**: Configure models, approval policies, sandbox settings, MCP servers

## Prerequisites

- Node.js 18+
- pnpm 10+
- Rust toolchain (for building codex binary)

## Development

### Install dependencies

```bash
# From workspace root
pnpm install

# Or from codex-electron directory
cd codex-electron
pnpm install
```

### Build the codex binary

```bash
# From codex-rs directory
cd ../codex-rs
cargo build --release -p codex-cli
```

### Run in development mode

```bash
# Start Vite dev server (renderer)
pnpm dev

# In another terminal, start Electron
pnpm dev:electron

# Or run both together
pnpm dev:all
```

### Generate TypeScript types from app-server

```bash
# Requires codex binary to be built
pnpm codex:generate-types
```

## Building

### Build the app

```bash
pnpm build
```

### Package for distribution

```bash
# Package for current platform
pnpm package

# Build codex and package together
pnpm package:all
```

The packaged app will be in the `out/` directory.

## Project Structure

```
codex-electron/
├── package.json
├── tsconfig.json              # Base TypeScript config
├── tsconfig.main.json         # Main process config
├── tsconfig.renderer.json     # Renderer process config
├── vite.config.ts             # Vite bundler config
├── electron-builder.yml       # Electron builder config
├── resources/
│   └── icons/                 # App icons
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # Entry point
│   │   ├── app-server-manager.ts  # codex app-server IPC
│   │   ├── window-manager.ts  # Window management
│   │   └── tray.ts            # System tray
│   ├── preload/
│   │   └── index.ts           # Context bridge API
│   ├── renderer/              # React application
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.html
│   │   ├── styles/
│   │   ├── pages/
│   │   │   ├── SessionList.tsx
│   │   │   ├── ChatSession.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Settings.tsx
│   │   └── components/
│   │       ├── AppLayout.tsx
│   │       ├── MessageList.tsx
│   │       ├── ChatInput.tsx
│   │       ├── ApprovalModal.tsx
│   │       ├── ExecOutput.tsx
│   │       └── FileChange.tsx
│   └── types/
│       └── index.ts           # TypeScript type definitions
└── dist/                      # Build output
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              App Server Manager                      │    │
│  │  - Spawns codex app-server subprocess               │    │
│  │  - JSON-RPC 2.0 over stdio (JSONL)                  │    │
│  │  - Routes notifications to windows by threadId      │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Window Manager                │  Tray Manager              │
│  - Main window (session list)  │  - System tray icon        │
│  - Session windows             │  - Context menu            │
│  - IPC handlers               │  - Notifications           │
└────────────────┬────────────────────────────────────────────┘
                 │ IPC (contextBridge)
┌────────────────▼────────────────────────────────────────────┐
│              Electron Renderer Process (React)               │
│  - Ant Design UI components                                  │
│  - Session list, chat interface, settings                    │
│  - Markdown rendering, diff viewer                           │
└─────────────────────────────────────────────────────────────┘
```

## Communication Protocol

The app communicates with `codex app-server` using JSON-RPC 2.0 over stdio:

```typescript
// Request
{ "method": "thread/start", "id": 1, "params": { "cwd": "/path/to/project" } }

// Response
{ "id": 1, "result": { "thread": { "id": "abc123", ... } } }

// Server notification
{ "method": "agentMessage/delta", "params": { "threadId": "abc123", "delta": "Hello" } }

// Server request (approval)
{ "method": "exec/approvalRequest", "id": 2, "params": { "command": ["npm", "install"] } }
```

## License

Apache-2.0
