# Nod8: Milestone 1.4 Implementation Plan
**Feature:** Global Settings & Configuration Menu

## 1. Overview
The **Global Settings & Configuration Menu** is the missing piece of the application shell. It acts as the centralized hub for environment variables (for workflows), credential management (OAuth tokens, API keys), and system preferences.

Crucially, **the logic of a plugin never leaks to the core engines**. The core engine evaluates dependencies, variables, and credentials, injecting them transparently so the plugin only receives validated, final data.

## 2. Architecture Principles
* **Separation of Concerns:** Global variables and system preferences will reside in `app.db`. Plugin credentials and OAuth tokens will reside in `credentials.db`. This enforces our isolated database approach via `DatabaseManager`.
* **Zero Plugin Awareness:** Plugins must remain agnostic to how credentials and variables are acquired. The Core Engine (specifically the `executor` and `parser`) handles resolving the `{{env.VAR_NAME}}` expressions and injecting required credentials before invoking `methods.ts`.
* **Declarative UI Engine:** The Frontend uses the robust `SidebarGlobalPanel` component. This aligns with our existing pattern for global overlays (like the Production Monitor) without disrupting the canvas routing.

## 3. Database & Schema Architecture
We will use our custom `umzug` migration engine to manage these tables.

### 3.1. App Settings & Global Variables (`app.db`)
Create a new migration inside `server/src/core/database/migrations/app/`.

**Table: `app_preferences`**
Stores basic system configurations.
* `key` (TEXT, PK)
* `value` (TEXT - JSON serialized)
* `updated_at` (TEXT)

**Table: `global_variables`**
Environment variables accessible in workflows via `{{env.VARIABLE_NAME}}`.
* `key` (TEXT, PK)
* `value` (TEXT) - Encrypted or raw based on future security requirements.
* `description` (TEXT)
* `created_at` (TEXT)

### 3.2. Credential Management (`credentials.db`)
Create a new migration inside `server/src/core/database/migrations/credentials/`.

**Table: `plugin_credentials`**
* `id` (TEXT, PK)
* `plugin_id` (TEXT) - The plugin this credential belongs to.
* `name` (TEXT) - User-friendly name (e.g., "My Google Workspace").
* `type` (TEXT) - e.g., "oauth2", "api_key".
* `data` (TEXT) - Encrypted JSON containing access tokens, refresh tokens, or API keys.
* `created_at` (TEXT)
* `updated_at` (TEXT)

## 4. Backend Implementation (Core Engine Integration)

### 4.1. The `env` Namespace Context Injection
Modify `server/src/core/modules/workflows/executor.ts`.
When initializing the execution context, inject the global variables under an `env` namespace.
```typescript
const envVars = AppRepository.getAllGlobalVariables();

const context = {
  _workflowId: workflow.metadata.id,
  trigger: triggerPayload,
  steps: {} as Record<string, any>,
  variables: initializeVariables(workflow.variables),
  env: envVars, // Allows {{env.API_KEY}} to be parsed by WorkflowParser
  _event_payloads: {} as Record<string, any>,
};
```

### 4.2. Credential Injection
When `executePluginNode` is called, the execution engine must check the `manifest.json` of the plugin for required credentials. It will fetch the selected credential from `credentials.db`, decrypt it, and pass it to the `PluginExecutor` context so the plugin's `methods.ts` can use `context.auth`.
Plugins **do not** interact with the database directly.

### 4.3. API Routes
Create modular route files:
* `server/src/core/routes/app.routes.ts`: Handles GET/POST/PUT for preferences and global variables.
* `server/src/core/routes/credentials.routes.ts`: Handles CRUD for plugin credentials and OAuth callback redirects.

## 5. Frontend Implementation (Client-Vue)

### 5.1. GlobalSettingsPanel Component
Create `client-vue/src/shared/components/layout/GlobalSettingsPanel.vue`.
This component uses a tabbed layout to separate concerns:
1. **Variables Tab:** A datatable or key-value input list for global variables.
2. **Credentials Tab:** A list of configured connections. Contains an "Add Credential" button that reads the installed plugins' manifests to show available connection types (e.g., "Connect to Google").
3. **Preferences Tab:** Theme settings, log retention periods, etc.

### 5.2. Sidebar Integration
Modify `client-vue/src/app/App.vue`.
Bind the settings icon button to the `sidebarStore`:
```typescript
import GlobalSettingsPanel from '@/shared/components/layout/GlobalSettingsPanel.vue'

function toggleSettings() {
  sidebarStore.togglePanel({
    title: 'Settings & Credentials',
    component: GlobalSettingsPanel,
    width: 'lg',
  })
}
```

## 6. Development Milestones & Checklist
- [ ] **DB Migrations:** Write and run `umzug` migrations for `app.db` and `credentials.db`.
- [ ] **Repositories:** Create `AppRepository` and `CredentialsRepository`.
- [ ] **Engine Update:** Inject `env` global variables into `executor.ts` context.
- [ ] **Engine Update:** Implement credential resolution before plugin execution.
- [ ] **API Layer:** Implement REST endpoints for settings, variables, and credentials.
- [ ] **Frontend Stores:** Create Pinia stores for app settings and credentials.
- [ ] **UI Component:** Build `GlobalSettingsPanel.vue` with tabs.
- [ ] **Integration:** Hook up the sidebar button to launch the global settings panel.

By adhering to this plan, Nod8 will maintain strict decoupling between the framework and plugin logic, ensuring horizontal scaling remains frictionless in Phase 2.
