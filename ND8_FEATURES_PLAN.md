# Nod8: Product & Engineering Roadmap

**Document Owner:** Staff Engineer & Lead PM  
**Objective:** Outline the strategic phases to evolve Nod8 from its current stable state to a production-ready MVP, culminating in a fully decentralized, developer-driven plugin ecosystem.

---

## 🎯 Phase 1: The Showcase (MVP Launch)

**Goal:** Deliver a flawless, highly polished automation tool for the end-user. The focus is strictly on stability, user experience, and demonstrating immediate value through highly demanded integrations. At the end of this phase, Nod8 must be a product that users trust to run their daily workflows.

### ✅ Milestone 1.1: Architecture & Manifest Refinement [DONE]

_Before building more plugins, we must solidify the cbontract between Backend and Frontend._

- **JSON Schema Expansion:** Map out and implement any missing `x-input-type` variations needed for future plugins (e.g., advanced multi-selects, dynamic dropdowns populated by external API calls, conditional fields).
- **Validation & Security:** Ensure the execution engine rigorously validates incoming data against the `manifest.json` before executing the `methods.ts` logic.

### ✅ Milestone 1.2: The "Killer" Plugins Portfolio [DONE]

_A workflow engine is only as good as its integrations. We will focus on the 20% of tools that solve 80% of business problems._

- **Google Workspace Expansion:** Finalize and polish Google Drive and Gmail. Implement Google Sheets (Read/Write/Append rows).
- **Instant Messaging:** Implement Telegram (Bots, send message, receive webhooks) and WhatsApp Cloud API.
- **Standard Webhooks:** Ensure the core HTTP/Webhook nodes are bulletproof for inbound and outbound raw data.

### ✅ Milestone 1.3: Immersive Node UI & Data Pipeline Visualization [DONE]

_First impressions dictate retention. The editor must provide ultimate visibility into the data flow._

- **The 3-Column Node Modal:** Replace the cramped right-side drawer with a full-screen/large immersive modal when editing a node.
  - **Left Pane (Input):** Displays the raw JSON as a Tree-view and Buffers received from the previous nodes/webhook.
  - **Center Pane (Config):** The dynamic parameters form, along with the "Run Step" / "Listen for Event" execution buttons.
  - **Right Pane (Output):** Displays the immediate execution result (JSON/Errors) to facilitate rapid debugging and variable mapping.
- **Canvas Fluidity & Execution Resilience:** Ensure smooth drag-and-drop, stable transitions, and graceful error handling during background executions.

### ✅ Milestone 1.4: Global Settings & Configuration Menu [DONE]

_The missing piece of the application shell._

- **Global App Panel:** Implement the frontend UI for App Settings.
- **Features:** Management of Global Variables (Environment variables for workflows), Credential Management (OAuth tokens, API keys centralized view), and basic system preferences.

### ✅ Milestone 1.5: Frontend Architecture & Scalable CSS Refactoring [DONE]

_A complete structural cleanup of the Vue.js frontend to ensure long-term maintainability, dynamic theming, and UI scalability._

- **Component Extraction:** Identify duplicated UI patterns across the app and extract them into reusable `Base*` components to ensure a DRY (Don't Repeat Yourself) UI architecture.
- **Tailwind & CSS Variable Integration:** Overhaul the `tailwind.config.js` to map semantic utility classes directly to CSS Variables (e.g., mapping `bg-primary` to `var(--color-primary)`). This unlocks dynamic, runtime theming without needing complex class-toggling logic.
- **Advanced Theme Management (Dark/Light Mode):** Implement a robust, scalable theming engine leveraging the new Tailwind CSS variable architecture. Ensure seamless switching between Light, Dark, and potential future custom themes, with user preferences persisted and applied without UI flashing.
- **Design Token Standardization:** Establish a strict, single source of truth for all design tokens (colors, spacing, typography scales, z-index hierarchy, borders). Eliminate "magic numbers" and arbitrary values across all Vue components to guarantee visual consistency as the app scales.
- **Separation of Concerns:** Strip all arbitrary and monolithic visual CSS from `.vue` `<style>` blocks. Vue files must strictly contain logic (`<script>`) and structure (`<template>`), relying entirely on the standardized Tailwind utility classes for styling.
- **Module-Scoped CSS:** For complex, unavoidable custom animations or third-party overrides, create dedicated `.css` files for each feature/module that strictly inherit from our centralized design tokens.

### ✅ Milestone 1.6: Plugin Triggers & Event-Driven Architecture [DONE]

_Moving beyond generic webhooks to provide a magical, app-specific trigger experience without punishing the plugin developer._

- **Schema-less Dynamic Outputs:** Triggers will capture raw JSON directly from the inbound webhook and display it in the new Left Pane UI, acting as the dynamic schema for downstream Variable Mapping.
- **Opt-in Lifecycle Hooks (DX):** Introduce optional `setup()` and `teardown()` hooks in the plugin's `index.ts`. If implemented, the Nod8 Engine automatically registers/unregisters the webhook URL with the 3rd party API (e.g., Telegram) when the workflow is published.
- **Listen for Event (UX):** A button in the Trigger UI that opens a temporary WebSocket/SSE connection to capture the next webhook payload live, instantly populating the output pane for easy mapping.

### ✅ Milestone 1.7: Advanced Utility Nodes [DONE]

_The foundational blocks for complex data routing and mapping._

- **Set (Edit Fields):** A node to visually map, edit, and create JSON fields without requiring JavaScript.
- **Switch:** Advanced branching capable of routing the flow into N different outputs based on value conditions.
- **Merge:** Re-combines divergent paths (e.g., after an IF or Switch branch) into a single unified flow.
- **Split In Batches:** Breaks down large arrays into smaller chunks or individual items to prevent API rate limits and facilitate granular processing.

---

## 🏗️ Phase 2: The Engine Rebuild (Pre-Launch Hardening)

**Goal:** Before adding powerful new features like the Video Editor and AI Agent, the backend engine must be refactored to support them cleanly. This phase eliminates the monolithic executor, establishes the first-party utility node architecture, and delivers the killer features that will define the launch narrative.

### ✅ Milestone 2.1: Executor Decomposition & SRP Refactoring [DONE]

_The `executor.ts` at ~1200 lines is a God Object. It must be surgically decomposed before new complex nodes are added._

- **Utility Node Registry:** Create a `server/src/core/nodes/` directory. Each utility node (`if`, `loop`, `switch`, `merge`, `set`, `split-in-batches`, `code`, `http`, `respond-webhook`) becomes its own isolated file exporting a `NodeHandler` interface.
- **Clean Executor Core:** Reduce `executor.ts` to ~300 lines of pure orchestration logic — graph traversal, retry policies, SSE event emission, and plugin dispatch. It calls handlers; it does not contain their logic.
- **Explicit Sandboxing Boundary:** Plugin execution stays in its own isolated path. The registry enforces a clear rule: utility nodes can import core internals freely; plugins cannot.
- **Full Test Coverage:** Each utility node handler becomes independently unit-testable without spinning up a full workflow.

### Milestone 2.2: Database Nodes (PostgreSQL, MySQL, SQLite)

_The most requested category of nodes in every automation tool. Unlocks nd8 for real backend workflows._

- **Unified `DatabaseNode` Architecture:** A single node type with a `driver` selector (postgres / mysql / sqlite). Under the hood, uses `pg`, `mysql2`, and `better-sqlite3` — all with identical async APIs.
- **Visual Query Builder (Alpha):** Simple mode with operation selector (SELECT / INSERT / UPDATE / DELETE) + field inputs. Advanced mode with raw SQL textarea. Both support `{{ steps.xxx }}` variable interpolation.
- **Connection from Global Credentials:** Database connection strings are stored in the Global Settings credential vault — never hardcoded in the workflow.

### Milestone 2.3: AI Agent Node (with Real Memory)

_The node that positions nd8 as a modern automation tool, not just a webhook router._

- **Core Agent Loop:** Connect any LLM (Ollama, OpenAI, Anthropic) with a set of tools (other nodes in the workflow). The agent decides which tool to call based on the prompt — standard `tool_calls` loop.
- **Short-Term Memory:** Conversation history passed as context on each call. Maintained in-memory per execution, zero config.
- **Long-Term Memory via pgvector:** Optional. When a PostgreSQL connection is available, the agent stores and retrieves embeddings from previous runs, giving it genuine persistent memory across workflow executions.
- **Variable-Aware Prompts:** System and user prompts fully support `{{ trigger.xxx }}` and `{{ steps.xxx }}` interpolation.

### Milestone 2.4: Video Editor Node

_The killer feature. The one that no competitor has. The one that makes the demo video go viral._

- **Exclusive UI Panel:** Not the generic `NodeInspectorModal`. A dedicated full-screen panel inspired by CapCut Web — timeline at the bottom, preview top-right, layer controls top-left.
- **Layer System (Alpha scope):**
  - Text layers with font, size, color, position (X/Y), and time range (start/end second)
  - Static image overlay (watermark, logo) with opacity and position
  - Trim (cut start/end of video)
  - Aspect ratio presets (16:9, 9:16, 1:1, 4:5)
- **`{{ steps.xxx }}` in Text Layers:** The definitive differentiator. Text content in any layer supports full workflow variable interpolation. Every video processed gets dynamically personalized content.
- **Backend Processing via FFmpeg:** The configured template is serialized as a JSON layer spec and executed server-side by FFmpeg. No client-side video processing.
- **Preview:** Single-frame static preview at the playhead position, rendered on-demand by the backend. Sufficient for alpha; avoids WebCodecs complexity.

### Milestone 2.5: Plugins Page (3D Galaxy View)

_The showcase that makes the first impression unforgettable._

- **3D Interactive Scene (Three.js):** Plugins rendered as floating cards in a spherical/galactic layout. `OrbitControls` for free camera movement. Plugins grouped by category as constellations.
- **Plugin Detail Modal:** Clicking a node opens a modal with the plugin's methods listed. Each method has a **"Test"** button — a Swagger-UI-style playground where the user fills in params and sees the real API response. The first time nd8 lets you test a plugin without creating a workflow.
- **Performance:** `InstancedMesh` for all plugin cards in a single draw call. Textures loaded from plugin logos. Lightweight even at 100+ plugins.

---

## 🚀 Phase 3: The Developer Ecosystem (Horizontal Scaling)

**Goal:** Open the gates for the community. Shift the burden of building plugins from the core team to solo developers around the world by providing a frictionless, "magical" Developer Experience (DX).

### Milestone 3.1: The `@nod8/sdk` (Node.js Library)

_Developers shouldn't need to understand the Nod8 monorepo to build a plugin._

- **Decoupling:** Extract the core types (`PluginContext`, `Nod8Manifest`, execution interfaces) from the backend.
- **Publishing:** Release it as an official NPM package. This allows a solo dev to open an empty folder, run `npm install @nod8/sdk`, and get full TypeScript autocomplete for their plugin development.

### Milestone 3.2: The Nod8 CLI (`npx nd8`)

_Zero-config boilerplate and compilation._

- **Scaffolding (`nd8 create plugin`):** A command that generates a ready-to-use folder structure (based on the `_template` dir) with `manifest.json`, `methods.ts`, and test files.
- **Build System (`nd8 build`):** A command that validates the `manifest.json` against the SDK schema and transpiles the TypeScript code locally for testing.
- **Release Manager (`nd8 release -v 1.0.0`):** Automates the packaging. It creates a `release/` folder, bundles the transpiled code, and generates a `plugin-deps.json` containing only the specific NPM packages used by the plugin, preparing it for distribution.

### Milestone 3.3: Decentralized Plugin Installation (The "Homebrew" Model)

_The absolute Game Changer. No central plugin store required._

- **UI Integration:** Add an "Install External Plugin" button in the Nod8 frontend.
- **Github Integration:** The user pastes a Github Repository URL.
- **Backend Automation:**
  1. The Nod8 backend fetches the repo and locates the `release/` directory.
  2. It downloads the bundle into the internal `plugins/` directory.
  3. It reads `plugin-deps.json` and runs `npm install` specifically for those dependencies in a secure/isolated manner.
  4. It triggers a hot-reload of the plugin engine, instantly making the new nodes available in the Canvas.

---

## 📈 Success Metrics for Phase 3

- A solo developer should be able to go from `npx nd8 create` to having a functional, custom plugin running in their local Nod8 instance in **under 15 minutes**.
- Users should be able to install community plugins with **one click and zero terminal commands**.
