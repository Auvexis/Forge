# Vector Store Node and Picker UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Vector Store use the AI Agent card pattern with provider-aware appearance and contextual quick-add controls, while hiding configuration-only nodes from the default picker.

**Architecture:** Extend the existing picker preset filter instead of changing the backend catalog, preserving old workflow compatibility and contextual access. Rebuild `VectorStoreNode.vue` with the established `BaseNode`, plugin appearance API, and `QuickAddButton` patterns already used by AI Agent and AI configuration nodes.

**Tech Stack:** Vue 3, TypeScript, Vue Flow, Node test runner, Vite.

---

### Task 1: Hide configuration-only nodes from the default picker

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts`
- Modify: `client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts`

- [x] **Step 1: Expand the failing picker filter test**

Update the existing default picker test to supply all configuration-only presets and assert that only root nodes remain:

```ts
const visibleTypes = filterDefaultPickerPresets([
  preset('ai-agent'),
  preset('ai-model'),
  preset('ai-memory'),
  preset('ai-tool'),
  preset('embeddings'),
  preset('vector-store'),
  preset('retriever'),
]).map((item) => item.nodeType)

assert.deepEqual(visibleTypes, ['ai-agent', 'vector-store'])
```

- [x] **Step 2: Run the test and verify RED**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts
```

Expected: FAIL because `ai-model`, `ai-memory`, `ai-tool`, and `embeddings` are still returned.

- [x] **Step 3: Implement the configuration-only filter**

Use one explicit set in `addNodePickerModel.ts`:

```ts
const CONTEXTUAL_ONLY_NODE_TYPES = new Set<WorkflowNodeType>([
  'ai-model',
  'ai-memory',
  'ai-tool',
  'embeddings',
  'retriever',
])

export function filterDefaultPickerPresets(presets: readonly AddNodePickerPreset[]): AddNodePickerPreset[] {
  return presets.filter((preset) => !CONTEXTUAL_ONLY_NODE_TYPES.has(preset.nodeType))
}
```

- [x] **Step 4: Run the focused picker tests and verify GREEN**

Run the command from Step 2. Expected: all picker model tests pass.

- [x] **Step 5: Commit the picker change**

```powershell
git add client-vue/src/features/workflow-editor/components/settings/addNodePickerModel.ts client-vue/src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts
git commit -m "fix: hide contextual nodes from default picker"
```

---

### Task 2: Match Vector Store to the AI Agent card pattern

**Files:**
- Modify: `client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue`
- Modify: `client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts`

- [x] **Step 1: Write failing Vector Store structure assertions**

Extend the Vector Store contract test to require:

```ts
assert.match(source, /QuickAddButton/)
assert.match(source, /mode="vector-config"/)
assert.match(source, /handle-id="embedding"/)
assert.match(source, /handle-id="document"/)
assert.match(source, /width="236px"/)
assert.match(source, /height="100px"/)
assert.match(source, /resolvePluginIcon/)
assert.match(source, /ENDPOINTS\.PLUGIN_BY_ID/)
assert.match(source, /<template #icon>/)
```

Also remove the old generic-shell expectation that requires `icon="database-zap"` directly on Vector Store.

- [x] **Step 2: Run the contract test and verify RED**

Run:

```powershell
cd client-vue
node --test src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
```

Expected: FAIL because Vector Store has no contextual quick-add controls or plugin appearance loading.

- [x] **Step 3: Load provider appearance**

In `VectorStoreNode.vue`, follow the existing AI Tool pattern:

```ts
const pluginId = computed(() => props.data?.pluginId || '')
const pluginIcon = ref('database-zap')
const customBg = ref<string | undefined>()
const customBorder = ref<string | undefined>()
const customIconColor = ref<string | undefined>()

async function loadPluginAppearance() {
  pluginIcon.value = 'database-zap'
  customBg.value = undefined
  customBorder.value = undefined
  customIconColor.value = undefined
  if (!pluginId.value) return

  const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pluginId.value))
  const metadata = plugin?.manifest?.metadata
  if (!metadata) return
  pluginIcon.value = resolvePluginIcon(metadata, { isDark: isDark.value, fallback: 'database-zap' })
  customBg.value = metadata.style?.bgColor
  customBorder.value = metadata.style?.borderColor
  customIconColor.value = metadata.style?.iconColor
}
```

Catch request failures, keep the fallback, and watch both `pluginId` and theme.

- [x] **Step 4: Implement the card and contextual handles**

Render a `236x100` `BaseNode` with a custom icon slot and two lower controls:

```vue
<BaseNode
  :id="props.id"
  :selected="props.selected"
  :status="props.status"
  :has-outgoing-connection="props.hasOutgoingConnection"
  has-target
  has-source
  :bg="customBg || 'transparent'"
  :border-color="customBorder || 'var(--sailor-node-border)'"
  width="236px"
  height="100px"
>
  <template #icon>
    <!-- provider icon, title, and collection subtitle -->
  </template>

  <div class="vector-store-node__config-handles">
    <div class="vector-store-node__config-handle">
      <BaseHandle id="embedding" type="target" :position="Position.Bottom" variant="diamond" />
      <span>Embedding</span>
      <QuickAddButton node-id="props.id" handle-id="embedding" target-handle-id="embedding" mode="vector-config" direction="down" />
    </div>
    <div class="vector-store-node__config-handle">
      <BaseHandle id="document" type="target" :position="Position.Bottom" variant="diamond" />
      <span>Document</span>
      <QuickAddButton node-id="props.id" handle-id="document" target-handle-id="document" mode="vector-config" direction="down" />
    </div>
  </div>
</BaseNode>
```

Use the AI Agent spacing pattern with two columns and preserve BaseNode's normal right-side quick-add.

- [x] **Step 5: Run focused node and picker tests**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts
```

Expected: all tests pass.

- [x] **Step 6: Commit the Vector Store node change**

```powershell
git add client-vue/src/features/workflow-editor/components/nodes/VectorStoreNode.vue client-vue/src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts
git commit -m "feat: align vector store with agent config ux"
```

---

### Task 3: Full frontend verification and browser QA

**Files:**
- Modify only if QA reveals a regression.

- [x] **Step 1: Run the focused frontend matrix**

```powershell
cd client-vue
node --test src/features/workflow-editor/components/settings/__tests__/addNodePickerModel.test.ts src/features/workflow-editor/components/settings/__tests__/agentAddNode.contract.test.ts src/features/workflow-editor/components/nodes/__tests__/retrievalNodes.contract.test.ts src/features/workflow-editor/components/settings/editors/__tests__/retrievalEditors.contract.test.ts
```

Expected: 0 failures.

- [x] **Step 2: Run the production build**

```powershell
cd client-vue
npm run build
```

Expected: type-check and Vite build complete successfully.

- [x] **Step 3: Start local services for QA**

Start the server on `23801` and client on `23802`, then open `http://localhost:23802/workflows`.

- [x] **Step 4: Verify the default picker**

Confirm the AI category includes `AI Agent` and `Vector Store`, and excludes `AI Model`, `AI Memory`, `AI Tool`, `Embeddings`, and `Retriever`.

- [x] **Step 5: Verify Vector Store rendering and quick-add**

Add Pinecone or Qdrant Vector Store and confirm:

- rectangular Agent-style card;
- provider icon is shown;
- output quick-add is visible on the right;
- Embedding and Document controls are visible below;
- both contextual quick-add buttons open the correct restricted picker.

- [x] **Step 6: Stop QA Node processes**

Stop the server and client Node processes after browser verification.

- [x] **Step 7: Commit any QA-only correction**

If QA required a correction, stage only its files and commit with a focused message. Otherwise, record that no additional commit was necessary.

Browser QA found that the Embedding contextual picker was empty when no installed
plugin exposed an embedding method. The picker now falls back to the catalog
`Embeddings` config node in that case, while retaining direct provider choices when
compatible plugins are available.
