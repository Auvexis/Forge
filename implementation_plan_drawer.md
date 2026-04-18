# NodeEditorDrawer Completion Plan

Complete the migration of the Node Editor system from React to Vue. This includes the main drawer component (`NodeEditorDrawer.vue`), all specialized editors (`Http`, `Code`, `If`, `Loop`, `Plugin`, etc.), and the authorization tab for plugins.

## User Review Required

> [!IMPORTANT]
> **Component Registry**: I will use a registry pattern in `editors/index.ts` to dynamically load the correct editor based on the node type.
> [!NOTE]
> **Pure CSS**: All styling will follow the established vanilla CSS patterns, avoiding Tailwind as requested.
> [!NOTE]
> **Dynamic Parameters**: The `PluginEditor` will dynamically generate form fields based on the plugin's JSON schema (manifest), including a variable picker logic.

## Proposed Changes

### [Workflow Editor Feature]

#### [MODIFY] [NodeEditorDrawer.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/NodeEditorDrawer.vue)
- Rewrite the shell to include:
    - **Header**: Label + Editable Node ID.
    - **Tabs**: "Parameters" and "Authorization" (visible for plugin nodes).
    - **Content**: Dynamic mounting of the registered editor.
    - **Footer**: Cancel/Confirm (Save) buttons.

#### [NEW] [PluginMenuAuth.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/editors/PluginMenuAuth.vue)
- Component to handle plugin credentials and OAuth flows, as seen in the React original.

#### [NEW] [CodeEditor.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/editors/CodeEditor.vue)
- Visual editor for JavaScript blocks with textarea and syntax hints.

#### [NEW] [IfEditor.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/editors/IfEditor.vue)
- Editor for conditional logic expressions.

#### [NEW] [LoopEditor.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/editors/LoopEditor.vue)
- Editor to configure iteration collections.

#### [NEW] [PluginEditor.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/editors/PluginEditor.vue)
- **The Core Engine**:
    - Integration/Action selectors.
    - Dynamic form field generation (String, Number, Boolean, Textarea, Enum/Select).
    - **Variable Tree Component**: Built-in searchable path picker for injecting variables like `{{ steps.node.output }}`.

#### [NEW] [SubWorkflowEditor.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/editors/SubWorkflowEditor.vue)
- Simple editor to select another workflow to execute.

#### [NEW] [EventEditor.vue / EventListenerEditor.vue](file:///c:/Workspace/Projects/forge/client-vue/src/features/workflow-editor/components/settings/editors/EventEditors.vue)
- Simple editors for events.

## Verification Plan

### Automated Tests
- I will verify the rendering of each node type by clicking on different nodes in the canvas using the browser tool.
- I will verify that `updateNodeData` correctly triggers the `isDirty` state in the Pinia store.

### Manual Verification
- Testing variable injection from the search tree.
- Testing ID renaming and conflict detection.
- Testing tab switching between Parameters and Auth.
