# Nod8: Product & Engineering Roadmap

**Document Owner:** Staff Engineer & Lead PM  
**Objective:** Outline the strategic phases to evolve Nod8 from its current stable state to a production-ready MVP, culminating in a fully decentralized, developer-driven plugin ecosystem.

---

## 🎯 Phase 1: The Showcase (MVP Launch)
**Goal:** Deliver a flawless, highly polished automation tool for the end-user. The focus is strictly on stability, user experience, and demonstrating immediate value through highly demanded integrations. At the end of this phase, Nod8 must be a product that users trust to run their daily workflows.

### Milestone 1.1: Architecture & Manifest Refinement
*Before building more plugins, we must solidify the contract between Backend and Frontend.*
* **JSON Schema Expansion:** Map out and implement any missing `x-input-type` variations needed for future plugins (e.g., advanced multi-selects, dynamic dropdowns populated by external API calls, conditional fields).
* **Validation & Security:** Ensure the execution engine rigorously validates incoming data against the `manifest.json` before executing the `methods.ts` logic.

### Milestone 1.2: The "Killer" Plugins Portfolio
*A workflow engine is only as good as its integrations. We will focus on the 20% of tools that solve 80% of business problems.*
* **Google Workspace Expansion:** Finalize and polish Google Drive and Gmail. Implement Google Sheets (Read/Write/Append rows).
* **Instant Messaging:** Implement Telegram (Bots, send message, receive webhooks) and WhatsApp Cloud API.
* **Standard Webhooks:** Ensure the core HTTP/Webhook nodes are bulletproof for inbound and outbound raw data.

### Milestone 1.3: Immersive Node UI & Data Pipeline Visualization
*First impressions dictate retention. The editor must provide ultimate visibility into the data flow.*
* **The 3-Column Node Modal:** Replace the cramped right-side drawer with a full-screen/large immersive modal when editing a node.
  * **Left Pane (Input):** Displays the raw JSON and Buffers received from the previous nodes/webhook.
  * **Center Pane (Config):** The dynamic parameters form, along with the "Run Step" / "Listen for Event" execution buttons.
  * **Right Pane (Output):** Displays the immediate execution result (JSON/Errors) to facilitate rapid debugging and variable mapping.
* **Canvas Fluidity & Execution Resilience:** Ensure smooth drag-and-drop, stable transitions, and graceful error handling during background executions.

### Milestone 1.4: Global Settings & Configuration Menu
*The missing piece of the application shell.*
* **Global App Panel:** Implement the frontend UI for App Settings.
* **Features:** Management of Global Variables (Environment variables for workflows), Credential Management (OAuth tokens, API keys centralized view), and basic system preferences.

### Milestone 1.5: Plugin Triggers & Event-Driven Architecture
*Moving beyond generic webhooks to provide a magical, app-specific trigger experience without punishing the plugin developer.*
* **Schema-less Dynamic Outputs:** Triggers will capture raw JSON directly from the inbound webhook and display it in the new Left Pane UI, acting as the dynamic schema for downstream Variable Mapping.
* **Opt-in Lifecycle Hooks (DX):** Introduce optional `setup()` and `teardown()` hooks in the plugin's `index.ts`. If implemented, the Nod8 Engine automatically registers/unregisters the webhook URL with the 3rd party API (e.g., Telegram) when the workflow is published.
* **Listen for Event (UX):** A button in the Trigger UI that opens a temporary WebSocket/SSE connection to capture the next webhook payload live, instantly populating the output pane for easy mapping.

---

## 🚀 Phase 2: The Developer Ecosystem (Horizontal Scaling)
**Goal:** Open the gates for the community. Shift the burden of building plugins from the core team to solo developers around the world by providing a frictionless, "magical" Developer Experience (DX).

### Milestone 2.1: The `@nod8/sdk` (Node.js Library)
*Developers shouldn't need to understand the Nod8 monorepo to build a plugin.*
* **Decoupling:** Extract the core types (`PluginContext`, `Nod8Manifest`, execution interfaces) from the backend.
* **Publishing:** Release it as an official NPM package. This allows a solo dev to open an empty folder, run `npm install @nod8/sdk`, and get full TypeScript autocomplete for their plugin development.

### Milestone 2.2: The Nod8 CLI (`npx nd8`)
*Zero-config boilerplate and compilation.*
* **Scaffolding (`nd8 create plugin`):** A command that generates a ready-to-use folder structure (based on the `_template` dir) with `manifest.json`, `methods.ts`, and test files.
* **Build System (`nd8 build`):** A command that validates the `manifest.json` against the SDK schema and transpiles the TypeScript code locally for testing.
* **Release Manager (`nd8 release -v 1.0.0`):** Automates the packaging. It creates a `release/` folder, bundles the transpiled code, and generates a `plugin-deps.json` containing only the specific NPM packages used by the plugin, preparing it for distribution.

### Milestone 2.3: Decentralized Plugin Installation (The "Homebrew" Model)
*The absolute Game Changer. No central plugin store required.*
* **UI Integration:** Add an "Install External Plugin" button in the Nod8 frontend.
* **Github Integration:** The user pastes a Github Repository URL.
* **Backend Automation:** 
  1. The Nod8 backend fetches the repo and locates the `release/` directory.
  2. It downloads the bundle into the internal `plugins/` directory.
  3. It reads `plugin-deps.json` and runs `npm install` specifically for those dependencies in a secure/isolated manner.
  4. It triggers a hot-reload of the plugin engine, instantly making the new nodes available in the Canvas.

---

## 📈 Success Metrics for Phase 2
- A solo developer should be able to go from `npx nd8 create` to having a functional, custom plugin running in their local Nod8 instance in **under 15 minutes**.
- Users should be able to install community plugins with **one click and zero terminal commands**.
