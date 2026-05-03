# Nod8: Milestone 1.4 Implementation Plan
**Feature:** Global Settings & Configuration Menu

## 1. Overview
The **Global Settings & Configuration Menu** is the missing piece of the application shell. It acts as the centralized hub for environment variables (for workflows), credential management (OAuth tokens, API keys), and system preferences.

Crucially, **the logic of a plugin never leaks to the core engines**. The core engine evaluates dependencies, variables, and credentials, injecting them transparently so the plugin only receives validated, final data.

## 2. Architecture Principles
* **Separation of Concerns:** Global variables and system preferences will reside in `app.db`. Plugin credentials and OAuth tokens will reside in `credentials.db`. This enforces our isolated database approach via `DatabaseManager`.
* **Zero Plugin Awareness:** Plugins must remain agnostic to how credentials and variables are acquired. The Core Engine (specifically the `executor` and `parser`) handles resolving the `{{env.VAR_NAME}}` expressions and injecting required credentials before invoking `methods.ts`.
* **Declarative UI Engine:** The Frontend will use a dedicated mobile-style slide-over panel for the Global Settings. This menu will not rely on `SidebarGlobalPanel`, but will instead be a unique component with its own independent state to provide a fluid, app-like transition.

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

### 5.1. Mobile-Style Slide-Over Menu Component
Create `client-vue/src/shared/components/layout/AppGlobalSettings.vue` (and its own local state/store).
This menu will behave like a native mobile app view:
* **Animation:** It slides in from the right, overlaying the current screen, and slides out to the right when closed (using Vue `<Transition name="slide-right">`).
* **Header:** Contains a back/left-arrow icon (using `@/shared/icons/LucideIcon.vue` with `name="arrow-left"`) and the text "Settings".
* **Base Components:** Strictly use existing base UI elements from `@/shared/components/base/` (e.g., `BaseButton.vue`, `BaseSelect.vue`) to ensure consistency, avoiding raw HTML/SVGs.

The component uses a tabbed layout to separate concerns:
1. **Variables Tab:** A key-value input list for global variables.
2. **Credentials Tab:** A list of configured connections. Contains a `BaseButton` "Add Credential" that reads installed plugins to show available connection types.
3. **Preferences Tab:** Theme settings, log retention periods, using `BaseSelect` for dropdowns.

### 5.2. Independent State & Integration
Modify `client-vue/src/app/App.vue` to mount `<AppGlobalSettings />` at the root level, independent of the `sidebarStore`.
Bind the settings icon button in the sidebar footer to a dedicated store (e.g. `settingsStore.open()`) to trigger the slide-in animation.

## 6. Development Milestones & Checklist
- [ ] **DB Migrations:** Write and run `umzug` migrations for `app.db` and `credentials.db`.
- [ ] **Repositories:** Create `AppRepository` and `CredentialsRepository`.
- [ ] **Engine Update:** Inject `env` global variables into `executor.ts` context.
- [ ] **Engine Update:** Implement credential resolution before plugin execution.
- [ ] **API Layer:** Implement REST endpoints for settings, variables, and credentials.
- [ ] **Frontend Stores:** Create Pinia stores for app settings and credentials.
- [ ] **UI Component:** Build `AppGlobalSettings.vue` with a mobile-style slide-in transition, `LucideIcon`, and Base Components (`BaseButton`, `BaseSelect`).
- [ ] **Integration:** Hook up the sidebar button to an independent state to launch the settings view.

By adhering to this plan, Nod8 will maintain strict decoupling between the framework and plugin logic, ensuring horizontal scaling remains frictionless in Phase 2.
