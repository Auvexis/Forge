# Forge — Technical Architecture Document

> **Version**: 1.0 · **Last Updated**: 2026-04-13
> **Author**: System Architecture Review · **Status**: Living Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Backend Architecture (Deep Dive)](#4-backend-architecture-deep-dive)
   - 4.1 [Server Bootstrap](#41-server-bootstrap)
   - 4.2 [Plugin System](#42-plugin-system)
   - 4.3 [Workflow Engine](#43-workflow-engine)
   - 4.4 [Data Layer](#44-data-layer)
   - 4.5 [API Surface](#45-api-surface)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Plugin Development Guide](#6-plugin-development-guide)
7. [Data Flow Diagrams](#7-data-flow-diagrams)
8. [Security Model](#8-security-model)
9. [Feature Evolution (Git History)](#9-feature-evolution-git-history)
10. [Known Limitations & Tech Debt](#10-known-limitations--tech-debt)
11. [Appendix: File Map](#11-appendix-file-map)

---

## 1. Executive Summary

Forge is a **self-hosted workflow orchestration platform** that lets users build complex automations by connecting third-party services (Google Drive, YouTube, Ollama LLM) through a visual node-based editor. It is architecturally similar to n8n, Make.com, or Zapier, but with key differentiators:

- **Binary-first data pipeline**: Native support for streaming 10GB+ files between plugins (e.g., downloading from Drive and uploading to YouTube) without buffering entire files in memory.
- **AI-native integration**: First-class support for LLM plugins (Ollama) with JSON mode, system prompts, and structured output parsing.
- **Sandboxed code execution**: Users can write arbitrary JavaScript "Code Block" nodes that execute in an isolated `vm2` sandbox with access to the full workflow context.
- **JSON Schema-driven UI**: Plugin interfaces (parameters, response display) are entirely declared in a `manifest.json` and rendered dynamically by the frontend — zero frontend code needed per plugin.

---

## 2. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  React Router · Vite · TailwindCSS · ReactFlow              │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────────┐  │
│  │ Explorer │  │ Workflows │  │ Workflow Editor (Canvas)  │  │
│  │   View   │  │   View    │  │ ┌─Trigger─┐ → ┌─Plugin─┐ │  │
│  │          │  │           │  │ └─────────┘   └────────┘ │  │
│  └──────────┘  └───────────┘  └──────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│                      REST API (JSON)                         │
├──────────────────────────────────────────────────────────────┤
│                      SERVER (Fastify)                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    CORE ENGINE                         │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │  │
│  │  │  Plugin   │  │ Workflow  │  │   Code Runner      │  │  │
│  │  │ Executor  │  │  Engine   │  │   (vm2 sandbox)    │  │  │
│  │  └──────────┘  └───────────┘  └────────────────────┘  │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────────────┐  │  │
│  │  │ Plugin   │  │Credential │  │      Vault         │  │  │
│  │  │ Manager  │  │  Store    │  │   (ENV secrets)    │  │  │
│  │  └──────────┘  └───────────┘  └────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                     PLUGINS                            │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │  │
│  │  │Google Drive│  │Google YouTube│  │  Ollama (LLM) │  │  │
│  │  └────────────┘  └──────────────┘  └───────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  DATA LAYER                            │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────┐ │  │
│  │  │   forge.db (SQLite) │  │ credentials.db (SQLite) │ │  │
│  │  │ Workflows, Execs    │  │ Tokens, API Keys        │ │  │
│  │  └─────────────────────┘  └─────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer       | Technology                   | Purpose                                     |
|-------------|------------------------------|---------------------------------------------|
| Runtime     | Node.js v22+ (ESM)           | Server runtime with native ESM support      |
| HTTP        | Fastify 5.x                  | High-performance HTTP framework             |
| Validation  | Zod 4.x                      | Runtime request validation                  |
| Database    | SQLite via `better-sqlite3`  | Embedded persistence, zero-config           |
| Sandbox     | `vm2` 3.x                    | Isolated JS execution for Code Blocks       |
| Auth        | `googleapis` 171.x           | Google OAuth2 + Drive/YouTube API client     |
| Frontend    | React 19 + React Router 7    | SPA with file-based routing                 |
| Build       | Vite                         | Frontend dev server and bundler             |
| Styling     | TailwindCSS 4.x              | Utility-first CSS framework                 |
| Graph UI    | ReactFlow                    | Visual node/edge workflow canvas            |
| Upload      | `@fastify/multipart`         | Streaming multipart file upload (up to 10GB)|
| Container   | Docker Compose               | Production deployment                       |

---

## 4. Backend Architecture (Deep Dive)

### 4.1 Server Bootstrap

**Entry point**: `server/src/core/server.ts`

The server boots in this order:

1. **Load environment** (`dotenv/config`)
2. **Create Fastify instance** with 10MB JSON body limit and optional Pino logger
3. **Register multipart plugin** with 10GB file size limit (for video uploads)
4. **Register CORS** (restricted to `CLIENT_ORIGIN`)
5. **Load all plugins** via recursive filesystem scan (`loadPlugins()`)
6. **Register route modules**: `plugins.routes.ts`, `workflows.routes.ts`
7. **Start listening** on port `23801` (configurable via `PORT` env)

**Key design decision**: The server uses fully synchronous SQLite (via `better-sqlite3`) which means the event loop is never blocked by disk I/O for queries, but writes are atomic and consistent. This is ideal for a single-user self-hosted tool.

---

### 4.2 Plugin System

The plugin system is Forge's core abstraction. It has 5 components:

#### 4.2.1 Plugin Loader (`core/modules/plugins/loader.ts`)

- Recursively scans `server/src/plugins/` for `index.ts` files
- Skips the `_template` directory
- Dynamically imports each plugin module
- Validates the plugin's `manifest.json` against a structural contract:
  - Required metadata fields: `id`, `name`, `description`, `author`, `category`, `version`
  - `id` must be kebab-case
  - `version` must be semver
  - Every method must have `metadata.label`, `parameters` (JSON Schema object), `responseSchema`, and `ui.component`
- Registers valid plugins into the `PluginManager`

#### 4.2.2 Plugin Manager (`core/modules/plugins/manager.ts`)

An in-memory registry (`Map<string, ForgePlugin>`) that provides:
- `getPlugins()` — list all registered plugins
- `getPlugin(id)` — lookup by ID (throws if not found)
- `registerPlugin(plugin)` — add to registry
- `getRedirectUri(pluginId)` — generates OAuth callback URL

#### 4.2.3 Plugin Executor (`core/modules/plugins/executor.ts`)

The **heart of method execution**. When a plugin method is called (either manually or by the workflow engine), the executor:

1. **Resolves the plugin and method** from the registry
2. **Loads credentials** from SQLite
3. **Merges with ENV secrets** (ENV always wins via the Vault)
4. **Auto-refreshes OAuth2 tokens** if they expire within a 5-minute buffer
5. **Cooks parameters** (JSON Schema-driven normalization):
   - For `x-input-type: "file"` params: unwraps `{ content: Buffer, mimeType }` objects
   - For `format: "base64"` params: converts raw `Buffer` → base64 string
6. **Calls the plugin method** with cooked params and context
7. **Returns the raw result** to the caller

#### 4.2.4 Credential Store (`core/modules/plugins/credential-store.ts`)

Manages two SQLite tables in `credentials.db`:

| Table                  | Schema                                      | Purpose                    |
|------------------------|---------------------------------------------|----------------------------|
| `plugin_credentials`   | `plugin_id TEXT PK, fields JSON`            | API keys, client secrets   |
| `plugin_tokens`        | `plugin_id TEXT PK, tokens JSON, expires_at`| OAuth2 access/refresh tokens|

Key operations:
- CRUD for credentials and tokens
- `getPluginStatus()` → returns `not_configured | configured | connected`
- `maskCredentials()` → replaces sensitive values with `••••` for frontend display

#### 4.2.5 Vault (`core/modules/plugins/vault.ts`)

ENV-based secret management. Convention:
```
FORGE_PLUGIN_{PLUGIN_ID}_{FIELD_KEY}
```
Example: `FORGE_PLUGIN_GOOGLE_DRIVE_CLIENT_ID=xxx`

- Plugin IDs with hyphens → underscores
- Keys → uppercased
- **ENV always takes precedence** over SQLite-stored credentials
- `getLockedFields()` tells the frontend which fields to disable (they're ENV-managed)

#### 4.2.6 The `ForgePlugin` Interface

Every plugin must implement this contract:

```typescript
interface ForgePlugin {
  id: string;                                          // Must match manifest.metadata.id
  manifest: PluginManifest;                            // JSON Schema-driven UI declaration
  auth: OAuth2Provider | ApiKeyProvider | NoAuthProvider;
  methods: Record<string, (params, context?) => Promise<any>>;
}
```

**Auth types supported:**
| Type      | Example       | Flow                                           |
|-----------|---------------|-------------------------------------------------|
| `oauth2`  | Google Drive  | Full OAuth2 with code exchange, refresh, revoke |
| `api_key` | (future)      | Static API key validation                       |
| `none`    | Ollama        | No auth, but can still have a `credentialSchema` for config (host, model) |

---

### 4.3 Workflow Engine

The workflow engine is a **DAG (Directed Acyclic Graph) executor** with 4 components:

#### 4.3.1 Workflow Repository (`core/modules/workflows/repository.ts`)

Persistence layer backed by SQLite (`forge.db`):

| Table                  | Schema                                              |
|------------------------|-----------------------------------------------------|
| `workflows`            | `id, name, description, version, is_active, is_draft, definition JSON` |
| `workflow_executions`  | `id, workflow_id, status, start_time, end_time, context_state JSON` |

Key features:
- **Auto-migration**: Adds `is_draft` column to legacy schemas
- **Legacy migration**: Pre-discriminated-union nodes get `type: "plugin"` automatically
- **Draft/Publish system**: Workflows can be saved as drafts and published separately

#### 4.3.2 Workflow Parser (`core/modules/workflows/parser.ts`)

Resolves template expressions (e.g., `{{ steps.download.output.id }}`) in node parameters:

- **Exact match** (`{{ path }}` alone): Returns the **raw object reference** (preserving Buffers, Streams)
- **Inline interpolation** (`prefix {{ path }} suffix`): Converts resolved values to strings

This dual behavior is critical: it allows binary data (video files) to flow between plugin nodes without stringification, while still supporting text templates.

#### 4.3.3 Code Runner (`core/modules/workflows/code-runner.ts`)

Executes user-written JavaScript in an isolated `vm2` sandbox:

1. **Sanitizes** the context via `clean()`:
   - Removes functions and symbols (prevents `structuredClone` errors)
   - Replaces Streams with `"<ReadableStream>"` placeholder
   - Detects circular references
   - Preserves Buffers
2. **Creates a frozen clone** of the sanitized context (`Object.freeze(structuredClone(...))`)
3. **Injects**: `context` (read-only), `variables` (read/write), `console` (captured)
4. **Wraps** the user script in an IIFE to allow top-level `return`
5. **Returns**: `{ output, variables, logs }`

**Security**: The VM has a 5-second timeout by default.

#### 4.3.4 Workflow Executor (`core/modules/workflows/executor.ts`)

The main DAG execution engine. Algorithm:

1. **Initialize context**: `{ trigger: payload, steps: {}, variables: {} }`
2. **Build topology**: Compute in-degree map and adjacency list from edges
3. **BFS traversal**: Process nodes with in-degree 0 (Kahn's algorithm)
4. **Per-node dispatch** based on `type`:

| Node Type     | Execution                                                    |
|---------------|--------------------------------------------------------------|
| `plugin`      | Evaluates params via Parser → calls PluginExecutor           |
| `code`        | Runs script in vm2 sandbox → merges variable mutations       |
| `if`          | Evaluates JS condition → returns `{ branch: "then" | "else" }` |
| `loop`        | Resolves collection → executes body nodes per iteration with `$item`, `$index`, `$total` |
| `subworkflow` | Resolves input mapping → recursively executes child workflow  |
| `trigger`     | No-op (entry point)                                          |

5. **Retry logic**: Per-node retry policy with `fixed`, `linear`, or `exponential` backoff
6. **Edge release**: Conditional for `if` (only the matching branch), loop (`loop-done`), standard (all)
7. **Error handling**: On failure, marks node as `FAILED` and halts execution
8. **Logging**: Saves execution log (with sanitized context) at start and end

**Context sanitization** (`sanitizeContextForLogging`): Before persisting to SQLite, replaces Buffers with `<Buffer size: N>` and Streams with `<ReadableStream>`.

---

### 4.4 Data Layer

**Two separate SQLite databases:**

| Database           | Path                          | Purpose                          |
|--------------------|-------------------------------|----------------------------------|
| `forge.db`         | `config/data/forge.db`        | Workflows and execution logs     |
| `credentials.db`   | `config/data/credentials.db`  | Plugin credentials and OAuth tokens |

**Why two databases?** Security isolation. Credentials can be backed up, encrypted, or managed separately from workflow definitions.

Both use **WAL mode** for concurrent read performance.

---

### 4.5 API Surface

#### Plugin Routes (`/plugins`)

| Method | Endpoint                              | Purpose                        |
|--------|---------------------------------------|--------------------------------|
| GET    | `/plugins`                            | List all plugins with status   |
| GET    | `/plugins/:id`                        | Get single plugin details      |
| GET    | `/plugins/:id/status`                 | Get auth status + masked creds |
| POST   | `/plugins/:id/credentials`            | Save credentials               |
| POST   | `/plugins/:id/execute`                | Execute a method (JSON or multipart) |
| POST   | `/plugins/:id/auth/connect`           | Generate OAuth2 auth URL       |
| POST   | `/plugins/:id/auth/disconnect`        | Revoke tokens                  |
| GET    | `/plugins/:id/auth/callback`          | OAuth2 callback (HTML + postMessage) |

#### Workflow Routes (`/workflows`)

| Method | Endpoint                                    | Purpose                       |
|--------|---------------------------------------------|-------------------------------|
| GET    | `/workflows`                                | List all workflows            |
| POST   | `/workflows`                                | Create new workflow           |
| PUT    | `/workflows/:id`                            | Update workflow               |
| DELETE | `/workflows/:id`                            | Delete workflow + executions  |
| POST   | `/workflows/:id/execute`                    | Execute workflow (JSON or multipart trigger) |
| GET    | `/workflows/:id/executions`                 | Get execution history         |
| DELETE | `/workflows/:id/executions`                 | Clear execution history       |
| GET    | `/workflows/:id/schema`                     | Get enriched workflow schema  |
| POST   | `/workflows/:id/publish`                    | Publish a draft               |

**API Response Contract** — Every endpoint returns:
```typescript
interface ApiResponse<T> {
  status_code: number;
  message: string;
  error: string | null;
  data: T | null;
}
```

---

## 5. Frontend Architecture

### 5.1 Application Shell

- **Framework**: React 19 + React Router 7 (file-based routing via Vite)
- **Global State**: `ForgeProvider` context (manages current view, workflow state)
- **Views**: URL-synchronized via `GlobalView` component
  - `ExplorerView` — Plugin dashboard with command dock
  - `WorkflowsView` — Workflow list and management

### 5.2 Design System

15 reusable UI components in `client/app/components/ui/`:

| Component       | Purpose                                              |
|-----------------|------------------------------------------------------|
| `button`        | Multi-variant button (default, outline, ghost, etc.) |
| `input`         | Standard text input                                  |
| `textarea`      | Resizable multi-line input                           |
| `switch`        | Boolean toggle (emerald accent when active)          |
| `combobox`      | Searchable dropdown (for enums)                      |
| `dialog`        | Modal overlay                                        |
| `alert-dialog`  | Confirmation dialog                                  |
| `tabs`          | Tabbed panels                                        |
| `table`         | Data table                                           |
| `card`          | Content card with sections                           |
| `separator`     | Visual divider                                       |
| `collapsible`   | Expandable section                                   |
| `dropdown-menu` | Context menu                                         |
| `input-group`   | Labeled input with description                       |
| `forge-toaster` | Toast notification system                            |

### 5.3 Plugin UI Module

**Schema-driven rendering** — The frontend never hardcodes plugin-specific UI:

- `PluginMenu.tsx` — Full plugin configuration dialog (tabs for Settings + Methods)
- `PluginMenuAuth.tsx` — Dynamic credential form rendered from `credentialSchema`
- `PluginMenuMethods.tsx` — Test panel for each plugin method
- `ExplorerDashboardDock.tsx` — Command dock for plugin quick actions

**Renderers** (driven by `ui.component` in manifest):

| Renderer          | Manifest Value  | Display                              |
|-------------------|-----------------|--------------------------------------|
| `CardRenderer`    | `"card"`        | Icon + labeled property rows         |
| `TableRenderer`   | `"table"`       | Sortable data grid with row actions  |
| (Text fallback)   | `"text"`        | Raw JSON dump                        |

**Input types** (driven by `x-input-type` in manifest):

| Value       | Component      |
|-------------|----------------|
| `text`      | `<Input>`      |
| `password`  | `<Input type="password">` |
| `textarea`  | `<Textarea>`   |
| `toggle`    | `<Switch>`     |
| `number`    | `<Input type="number">` |
| `file`      | File picker    |
| (enum)      | `<Combobox>`   |

### 5.4 Workflow UI Module

- `WorkflowsList.tsx` — Grid of workflow cards with status badges
- `WorkflowEditor.tsx` — Full ReactFlow canvas with drag-and-drop node creation
- `WorkflowEditorDock.tsx` — Bottom toolbar with run/save/settings actions
- `NodeEditorPanel.tsx` — Slide-in panel for configuring selected nodes
- `RunWorkflowPanel.tsx` — Dynamic form for trigger parameters
- `WorkflowLogsPanel.tsx` — Execution history with step-by-step trace
- `WorkflowSettingsPanel.tsx` — Metadata and variable management

**Node Editors** (per node type):

| Editor              | Node Type    | Features                                   |
|---------------------|--------------|---------------------------------------------|
| `PluginEditor`      | `plugin`     | Plugin/method selector + dynamic params     |
| `CodeEditor`        | `code`       | JavaScript editor                           |
| `IfEditor`          | `if`         | Condition expression input                  |
| `LoopEditor`        | `loop`       | Collection expression + max iterations      |
| `SubWorkflowEditor` | `subworkflow`| Workflow selector + input mapping           |
| `TriggerEditor`     | `trigger`    | Trigger type + schema definition            |

### 5.5 API Hooks

| Hook                          | Purpose                         |
|-------------------------------|---------------------------------|
| `useGetPlugins`               | Fetch all plugins               |
| `useGetPlugin`                | Fetch single plugin             |
| `useGetPluginConfig`          | Fetch plugin status + schema    |
| `useExecutePlugin`            | Execute a plugin method         |
| `useCheckAuthenticated`       | Check OAuth2 connection status  |
| `useGetWorkflows`             | Fetch all workflows             |
| `useCreateWorkflow`           | Create new workflow             |
| `useUpdateWorkflow`           | Update existing workflow        |
| `useDeleteWorkflow`           | Delete workflow                 |
| `useExecuteWorkflow`          | Execute workflow with payload   |
| `useGetWorkflowExecutions`    | Fetch execution history         |
| `useClearWorkflowExecutions`  | Clear execution history         |

---

## 6. Plugin Development Guide

### 6.1 File Structure

Every plugin lives in `server/src/plugins/forge/<plugin-name>/` with exactly 3 files:

```
my-plugin/
├── index.ts         # Plugin definition (auth, id, methods)
├── manifest.json    # JSON Schema UI declarations
└── methods.ts       # Method implementations
```

### 6.2 The Manifest Contract

```json
{
  "metadata": {
    "id": "my-plugin",           // kebab-case, must match index.ts id
    "name": "My Plugin",
    "description": "...",
    "icon": "Wrench",            // Lucide icon name
    "category": "Productivity",
    "author": "Your Name",
    "version": "1.0.0"           // semver
  },
  "methods": {
    "doSomething": {
      "metadata": { "label": "Do Something", "description": "..." },
      "parameters": {
        "type": "object",
        "properties": {
          "input": {
            "type": "string",
            "description": "The input value",
            "x-input-type": "text",    // Controls frontend component
            "x-label": "Input Label"   // Display name
          }
        }
      },
      "responseSchema": {
        "type": "object",
        "properties": {
          "result": { "type": "string", "x-label": "Result" }
        }
      },
      "ui": { "component": "card" }   // "card" | "table" | "text"
    }
  }
}
```

### 6.3 Auth Types

| Type    | `index.ts` Setup                                    |
|---------|-----------------------------------------------------|
| None    | `auth: { type: "none", credentialSchema: {...} }`   |
| API Key | `auth: { type: "api_key", credentialSchema: {...} }`|
| OAuth2  | Full `OAuth2Provider` with getAuthUrl, exchangeCode, refreshTokens |

### 6.4 Important: `x-input-type` Values

The `x-input-type` field controls both the Plugin Settings UI and the Workflow Node Editor:

- `"text"` → Single-line input
- `"textarea"` → Multi-line resizable input
- `"toggle"` → Boolean switch (for `type: "boolean"` fields)
- `"file"` → File upload (triggers multipart handling in executor)
- `"password"` → Masked input
- `"number"` → Numeric input

---

## 7. Data Flow Diagrams

### 7.1 Plugin Execution (Manual)

```
Frontend                    Backend
   │                          │
   │  POST /plugins/:id/execute
   │  { method, params }      │
   │─────────────────────────>│
   │                          │── PluginExecutor.execute()
   │                          │   ├── Load credentials (SQLite)
   │                          │   ├── Merge with ENV (Vault)
   │                          │   ├── Auto-refresh OAuth2 tokens
   │                          │   ├── Cook parameters (schema-driven)
   │                          │   ├── Call plugin method
   │                          │   └── Return raw result
   │  { status_code, data }   │
   │<─────────────────────────│
   │                          │
   │  Render via CardRenderer │
   │  or TableRenderer        │
```

### 7.2 Workflow Execution (YouTube Uploader Example)

```
Trigger { fileName, videoIdea, videoPrivacy }
    │
    ▼
[list_files] ── Google Drive: listFiles(query)
    │                    └── Returns [{id, name, mimeType, ...}]
    ▼
[extract_videoid] ── Code Block: return context.steps.list_files.output[0].id
    │                    └── Returns file ID string
    ▼
[download_videofile] ── Google Drive: downloadFile(fileId)
    │                    └── Returns { download: { content: Stream, mimeType, fileName } }
    ▼
[generate_data] ── Ollama: generate(prompt, system, jsonMode)
    │                    └── Returns { message: { content: JSON }, model, ... }
    ▼
[extract_data] ── Code Block: JSON.parse(output.message.content)
    │                    └── Returns { title, description }
    ▼
[upload_video] ── YouTube: uploadVideo(title, description, content, privacy)
                         └── content = Stream from download_videofile (passed by reference)
                         └── Uses Resumable Upload protocol
```

**Critical path for binary data**: The `WorkflowParser.evalParams()` function detects that `{{ steps.download_videofile.output.download.content }}` is an exact template match and passes the **raw Stream reference** (not a stringified version) to the YouTube plugin. This is what enables zero-copy video piping.

---

## 8. Security Model

### 8.1 Credential Hierarchy

```
Priority: ENV Variables > SQLite Database > Default Values
```

- **ENV Variables** (via Vault): Cannot be overridden by the UI. Fields locked by ENV show as disabled in the frontend.
- **SQLite Storage**: Plaintext JSON in `credentials.db`. Sensitive fields are masked when returned to the frontend.

### 8.2 OAuth2 Flow

1. User saves `client_id` + `client_secret` via the settings panel
2. User clicks "Connect" → backend generates auth URL → opens popup
3. Google redirects to `/plugins/:id/auth/callback` with `code`
4. Backend exchanges code for tokens, stores them in SQLite
5. Backend sends `postMessage` to the opener window with success/error
6. Token auto-refresh happens transparently before each plugin execution

### 8.3 Code Sandbox

- User code runs in `vm2` with strict timeout (5 seconds)
- Context is `Object.freeze(structuredClone(...))` — fully immutable
- Only `context`, `variables`, and a limited `console` are exposed
- No access to `require`, `process`, `fs`, or network APIs

### 8.4 Known Security Gaps

> ⚠️ **Credentials stored in plaintext** in SQLite. For production, this should be encrypted at rest (e.g., via `libsodium`).

> ⚠️ **`vm2` is archived** and has known escapes. For production, consider migrating to `isolated-vm` or a WASM sandbox.

---

## 9. Feature Evolution (Git History)

The project evolved through 32 commits across these major phases:

### Phase 1: Foundation (commits `e523240` → `cc58975`)
- Initial project setup with TypeScript + Fastify
- First plugin system with Ollama AI integration
- Google Drive OAuth2 flow
- Dynamic plugin registry with manifest schema

### Phase 2: Frontend Bootstrap (commits `8304816` → `a24efb9`)
- React Router + Vite client initialization
- Core layout with sidebar navigation
- Plugin listing dashboard and hooks

### Phase 3: Architecture Overhaul (commits `4eabcd2` → `c492dbf`)
- Centralized OAuth2 orchestration
- Multipart file support (10GB uploads)
- Plugin architecture modernization
- URL-synchronized view system

### Phase 4: Workflow Engine (commits `3d38101` → `89d3901`)
- DAG workflow engine with topological sort
- Visual canvas editor with ReactFlow
- "Mega Command Dock" UI pattern
- High-fidelity tactical UI overhaul

### Phase 5: JSON Schema Migration (commits `758474f` → `de1a89b`)
- Migration to JSON Schema-first plugin architecture
- Generic CardRenderer and TableRenderer
- Decomposed NodeEditorPanel with per-type editors
- Runtime stability fixes and OAuth2 race condition resolution

### Phase 6: Polish & AI Integration (commits `3caa6a0` → `8952573`)
- Global toast notification system
- Workflow auto-versioning and standardized exports
- JSON Schema-driven parameter rendering
- **Ollama plugin**: Hybrid system prompts, JSON mode, toggle inputs
- **Workflow robustness**: Safe clone utility for code runner
- **YouTube optimization**: Resumable upload protocol

---

## 10. Known Limitations & Tech Debt

| Area                | Issue                                        | Severity |
|---------------------|----------------------------------------------|----------|
| Security            | Credentials stored in plaintext SQLite       | 🔴 High  |
| Sandbox             | `vm2` is archived; known escape vectors      | 🔴 High  |
| Streaming           | No true server-sent events for execution progress | 🟡 Medium|
| Testing             | No automated test suite                      | 🟡 Medium|
| Concurrency         | Single-process; no worker pool for heavy workflows | 🟡 Medium|
| Frontend            | `PluginEditor.tsx` has some `as any` casts   | 🟢 Low   |
| Cron/Webhooks       | Trigger types defined in types but not implemented | 🟡 Medium|
| Error Recovery      | No partial retry on workflow failure (all-or-nothing) | 🟡 Medium|

---

## 11. Appendix: File Map

```
forge/
├── docker-compose.yaml              # Multi-container deployment
├── config/data/                      # SQLite databases (gitignored)
│
├── server/
│   └── src/
│       ├── core/
│       │   ├── server.ts             # Fastify bootstrap (entrypoint)
│       │   ├── database.ts           # SQLite schema + migrations
│       │   ├── routes/
│       │   │   ├── index.ts          # Health check route
│       │   │   ├── plugins.routes.ts # Plugin CRUD + OAuth + Execution
│       │   │   └── workflows.routes.ts # Workflow CRUD + Execution + Schema
│       │   └── modules/
│       │       ├── plugins/
│       │       │   ├── loader.ts     # Filesystem plugin scanner + validator
│       │       │   ├── manager.ts    # In-memory plugin registry
│       │       │   ├── executor.ts   # Method execution pipeline
│       │       │   ├── credential-store.ts  # SQLite credential persistence
│       │       │   └── vault.ts      # ENV-based secret management
│       │       └── workflows/
│       │           ├── executor.ts   # DAG engine (topological sort + retry)
│       │           ├── parser.ts     # Template expression resolver
│       │           ├── code-runner.ts # vm2 sandbox with context sanitization
│       │           └── repository.ts # SQLite workflow persistence + migration
│       │
│       ├── plugins/
│       │   ├── _template/            # Plugin boilerplate (skipped by loader)
│       │   └── forge/
│       │       ├── google-drive/     # Google Drive plugin (OAuth2, 9 methods)
│       │       ├── google-youtube/   # YouTube plugin (OAuth2, 17+ methods)
│       │       └── ollama/           # Ollama LLM plugin (no auth, 1 method)
│       │
│       └── shared/
│           ├── models/
│           │   ├── plugin-types.ts   # ForgePlugin, PluginManifest, JSON Schema types
│           │   ├── workflow-types.ts # WorkflowItem, node discriminated union
│           │   └── api-response.model.ts # Standard API response envelope
│           └── schemas/              # (reserved for Zod schemas)
│
├── client/
│   └── app/
│       ├── root.tsx                  # React root with Inter font + dark mode
│       ├── app.css                   # Global styles
│       ├── components/
│       │   ├── ui/                   # 15 reusable UI primitives
│       │   ├── forge/                # ForgeSidebar, GlobalView
│       │   └── views/               # ExplorerView, WorkflowsView
│       ├── modules/forge/
│       │   ├── plugins/
│       │   │   ├── components/      # PluginMenu, PluginMenuAuth, PluginMenuMethods
│       │   │   ├── hooks/           # useGetPlugins, useExecutePlugin, etc.
│       │   │   ├── renderers/       # CardRenderer, TableRenderer, PluginNode/Tree
│       │   │   ├── types/           # Plugin TypeScript interfaces
│       │   │   └── utils/           # Schema property resolvers, action executor
│       │   └── workflows/
│       │       ├── components/      # WorkflowEditor, WorkflowsList, panels
│       │       │   ├── node-editors/# PluginEditor, CodeEditor, IfEditor, etc.
│       │       │   ├── nodes/       # Custom ReactFlow node components
│       │       │   └── edges/       # Custom ReactFlow edge components
│       │       ├── hooks/           # useGetWorkflows, useExecuteWorkflow, etc.
│       │       ├── types/           # Workflow TypeScript interfaces
│       │       └── utils/           # Workflow utility functions
│       ├── providers/
│       │   └── ForgeProvider.tsx     # Global app context + view state
│       └── shared/
│           ├── constants.ts         # API_BASE_URL
│           ├── helpers/             # apiHandler (centralized fetch wrapper)
│           ├── types/               # Shared TypeScript types
│           └── utils/               # downloadFile, etc.
```

---

*This document was generated from a complete source code audit covering 32 commits, 50+ files, and ~15,000 lines of production code.*
