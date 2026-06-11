import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('add node panel exposes only the root AI Agent outside contextual agent quick-add', () => {
  const source = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(source, /const AI_NODES(?:: AddNodePickerPreset\[\])? = \[/)
  assert.match(source, /AI/)

  assert.match(source, /label: 'AI Agent'/)
  const aiNodesDefinition = source.slice(
    source.indexOf('const AI_NODES'),
    source.indexOf('const AGENT_MEMORY_PRESETS'),
  )
  assert.doesNotMatch(aiNodesDefinition, /label: 'AI Model'/)
  assert.doesNotMatch(aiNodesDefinition, /label: 'AI Memory'/)
  assert.doesNotMatch(aiNodesDefinition, /label: 'AI Tool'/)

  assert.doesNotMatch(source, /label: 'Chat Trigger'/)
  assert.match(source, /props\.onAddLogicNode\?\.\(item\.preset\.nodeType, item\.preset\.defaults\)/)
})

test('add node panel gets utility presets from the backend workflow node catalog', () => {
  const source = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')
  const model = read('src/features/workflow-editor/components/settings/addNodePickerModel.ts')

  assert.match(source, /workflowNodesApi/)
  assert.match(source, /loadWorkflowNodeCatalog/)
  assert.match(source, /catalogItemsToPickerPresets/)
  assert.doesNotMatch(source, /const LOGIC_NODES/)
  assert.match(model, /catalogItemsToPickerPresets/)
  assert.match(model, /WorkflowNodeCatalogItem/)
  assert.match(model, /style: item\.style/)
})

test('add node panel keeps trigger as a fixed top-level action and searchable preset', () => {
  const source = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(source, /const TRIGGER_PRESET(?:: AddNodePickerPreset)? = \{/)
  assert.match(source, /nodeType: 'trigger'/)
  assert.match(source, /showQuickTrigger/)
  assert.match(source, /class="add-node-cascade__quick-section"/)
  assert.match(source, /class="add-node-cascade__section-label">Trigger/)
  assert.match(source, /@click="addQuickTrigger"/)
  assert.match(source, /props\.onAddLogicNode\?\.\('trigger' as WorkflowNodeType/)
  assert.match(source, /const searchablePresets/)
  assert.match(source, /TRIGGER_PRESET,[\s\S]*pickerPresets\.value\.filter\(\(preset\) => preset\.nodeType !== 'trigger'\)/)
})

test('add node panel supports contextual agent quick-add presets', () => {
  const source = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(source, /agentConfigHandle\?: 'chatModel' \| 'memory' \| 'tool'/)
  assert.doesNotMatch(source, /AGENT_MODEL_PRESETS/)
  assert.doesNotMatch(source, /provider: 'openai'/)
  assert.doesNotMatch(source, /provider: 'openrouter'/)
  assert.match(source, /agentChatModelPlugins/)
  assert.match(source, /capability\?\.enabled === true/)
  assert.match(source, /SUPPORTED_CHAT_MODEL_ADAPTERS/)
  assert.match(source, /const adapter = capability\?\.adapter/)
  assert.match(source, /SUPPORTED_CHAT_MODEL_ADAPTERS\.has\(adapter\)/)
  assert.match(source, /addAgentModelNode\(item\.plugin\)/)
  assert.match(source, /pluginId: capability\.credentialPluginId \|\| plugin\.manifest\.metadata\.id/)
  assert.match(source, /adapter: capability\.adapter/)
  assert.match(source, /model: capability\.defaultModel/)
  assert.match(source, /baseUrl: capability\.defaultBaseUrl/)
  assert.match(source, /if \(isAgentModelContext\.value\) return agentChatModelPlugins\.value/)
  assert.match(source, /AGENT_MEMORY_PRESETS/)
  assert.match(source, /SQLite Memory/)
  assert.doesNotMatch(source, /label: 'PostgreSQL Memory'/)
  assert.doesNotMatch(source, /label: 'Supabase Memory'/)
  assert.match(source, /agentMemoryStorePlugins/)
  assert.match(source, /manifest\.metadata\.agentCapabilities\?\.memoryStore\?\.enabled === true/)
  assert.match(source, /manifest\.metadata\.agentCapabilities\.memoryStore\.adapter === 'plugin-memory-store'/)
  assert.match(source, /addAgentMemoryNode\(item\.plugin\)/)
  assert.match(source, /pluginId: plugin\.manifest\.metadata\.id/)
  assert.match(source, /adapter: capability\.adapter/)
  assert.match(source, /searchMethodId: capability\.searchMethodId/)
  assert.match(source, /putMethodId: capability\.putMethodId/)
  assert.match(source, /if \(isAgentMemoryContext\.value\) return agentMemoryStorePlugins\.value/)
  assert.match(source, /pickerPresets/)
  assert.match(source, /buildPickerSecondColumnItems/)
  assert.match(source, /isAgentModelContext/)
  assert.match(source, /isAgentMemoryContext/)
  assert.match(source, /isAgentToolContext/)
  assert.match(source, /pluginHasAgentTools/)
  assert.match(source, /if \(isAgentToolContext\.value\) return \(plugins\.value \?\? \[\]\)\.filter\(pluginHasAgentTools\)/)
  assert.match(source, /agentConfigHandle: props\.agentConfigHandle/)
  assert.match(source, /buildPickerActionItems/)
  assert.match(source, /add-node-cascade/)
})

test('canvas connects contextual quick-add nodes into agent config handles', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(canvas, /quickAddTargetId/)
  assert.match(canvas, /quickAddTargetHandle/)
  assert.match(canvas, /agentConfigHandle/)
  assert.match(canvas, /connectAgentConfigNode/)
  assert.match(canvas, /targetHandle: targetHandle/)
  assert.match(canvas, /sourceHandle: 'source'/)
  assert.match(canvas, /on-add-agent-tool-node/)
})

test('canvas recognizes vector store handles as configuration edges', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(canvas, /\['chatModel', 'memory', 'tool', 'embedding', 'document'\]/)
})

test('vector store picker creates a provider-configured utility node instead of a plugin action', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(panel, /buildVectorStoreProviderItems/)
  assert.match(panel, /item\.preset\.nodeType === 'vector-store'/)
  assert.match(panel, /onAddLogicNode\?\.\('vector-store'/)
  assert.match(panel, /ensureCollectionMethodId: 'ensureCollection'/)
  assert.doesNotMatch(canvas, /defaultData\.pluginId = 'sailor-qdrant'/)
})

test('embedding quick-add uses a vector config context separate from agent config', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(panel, /vectorConfigHandle\?: 'embedding' \| 'document'/)
  assert.match(panel, /buildEmbeddingProviderItems/)
  assert.match(panel, /pickerPlugins\.value\.length > 0/)
  assert.match(panel, /preset\.nodeType === 'embeddings'/)
  assert.match(panel, /onAddLogicNode\?\.\('embeddings'/)
  assert.match(canvas, /vectorConfigHandle: 'embedding' \| 'document' \| null/)
  assert.match(canvas, /:vector-config-handle="addNodePickerOverlay\.vectorConfigHandle \?\? undefined"/)
})

test('document quick-add exposes only dataset utility nodes', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /isDocumentContext/)
  assert.match(panel, /\['text-dataset', 'file-dataset', 'database-dataset'\]/)
})

test('canvas auto-arranges agent config nodes with model and memory on the left and tools in a grid', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(canvas, /AGENT_CONFIG_TOOLS_PER_ROW = 4/)
  assert.match(canvas, /getAgentConfigLayoutPosition/)
  assert.match(canvas, /arrangeAgentConfigNodes/)
  assert.match(canvas, /targetHandle === 'tool'/)
  assert.match(canvas, /toolIndex % AGENT_CONFIG_TOOLS_PER_ROW/)
  assert.match(canvas, /Math\.floor\(toolIndex \/ AGENT_CONFIG_TOOLS_PER_ROW\)/)
  assert.match(canvas, /arrangeAgentConfigNodes\(targetId\)/)
})

test('ai node defaults are safe and backend-compatible', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(canvas, /type === 'ai-agent'/)
  assert.match(canvas, /defaultData\.prompt = 'You are a helpful workflow agent\. Use tools only when needed\.'/)
  assert.match(canvas, /defaultData\.maxIterations = 8/)
  assert.match(canvas, /defaultData\.maxToolCalls = 12/)
  assert.match(canvas, /defaultData\.maxRetriesPerTool = 3/)
  assert.match(canvas, /defaultData\.timeoutMs = 180000/)
  assert.match(canvas, /defaultData\.requireApprovalForSideEffects = \[/)
  assert.match(canvas, /'write'/)
  assert.match(canvas, /'delete'/)
  assert.match(canvas, /'external-message'/)
  assert.match(canvas, /'external-payment'/)
  assert.match(canvas, /'filesystem'/)
  assert.match(canvas, /defaultData\.outputMode = 'text'/)

  assert.match(canvas, /type === 'ai-tool'/)
  assert.match(canvas, /defaultData\.requiresApproval = true/)
  assert.match(canvas, /defaultData\.sideEffect = 'write'/)
})

test('chat trigger is configured through the normal trigger node, not an AI palette item', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')
  const model = read('src/features/workflow-editor/components/settings/addNodePickerModel.ts')

  assert.match(panel, /catalogItemsToPickerPresets/)
  assert.match(model, /id: item\.type/)
  assert.match(model, /nodeType: item\.type/)
  assert.doesNotMatch(panel, /label: 'Chat Trigger'/)
  assert.doesNotMatch(panel, /trigger: \{\s*type: 'chat'/)
  assert.doesNotMatch(panel, /type: 'chat-trigger'/)
})

test('add node panel keeps the plugin methods view scrollable inside the panel', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /<div class="add-node-content" @wheel\.stop>/)
  assert.match(panel, /\.add-node-panel\s*\{[\s\S]*overflow: visible;/)
  assert.match(panel, /\.add-node-cascade__scroller\s*\{[\s\S]*min-height: 0;[\s\S]*overflow-y: auto;[\s\S]*overflow-x: hidden;[\s\S]*overscroll-behavior: contain;/)
})

test('add node panel renders the floating picker and removes the old category/actions flow', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /buildPickerCategoryItems/)
  assert.match(panel, /buildPickerSecondColumnItems/)
  assert.match(panel, /buildPickerActionItems/)
  assert.match(panel, /hoveredCategory/)
  assert.match(panel, /methodSubmenuPlugin/)
  assert.match(panel, /categories\.includes\(hoveredCategory\.value\)/)
  assert.match(panel, /add-node-cascade/)
  assert.match(panel, /add-node-cascade__primary/)
  assert.match(panel, /add-node-cascade__secondary/)
  assert.match(panel, /add-node-cascade__methods/)
  assert.match(panel, /@mouseenter="hoverCategory\(item\.category\)"/)
  assert.match(panel, /openMethodSubmenu\(item\.plugin\)/)
  assert.match(panel, /addSinglePluginMethod\(item\.plugin\)/)
  assert.doesNotMatch(panel, /add-node-picker-grid/)
  assert.doesNotMatch(panel, /title="Actions"/)
  assert.doesNotMatch(panel, /add-node-search-wrapper/)
  assert.doesNotMatch(panel, /categoryFilterOpen/)
  assert.doesNotMatch(panel, /toggleCategory/)
  assert.doesNotMatch(panel, /view === 'actions'/)
  assert.doesNotMatch(panel, /goBack/)
})

test('workflow canvas opens add node picker as cursor anchored canvas overlay', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')
  const baseNode = read('src/features/workflow-editor/components/BaseNode.vue')
  const quickAddButton = read('src/features/workflow-editor/components/QuickAddButton.vue')
  const baseEdge = read('src/features/workflow-editor/components/BaseEdge.vue')
  const triggerNode = read('src/features/workflow-editor/components/nodes/TriggerNode.vue')

  assert.match(canvas, /addNodePickerOverlay/)
  assert.match(canvas, /openAddNodePanel[\s\S]*anchor\?: AddNodePickerAnchor/)
  assert.match(canvas, /<div\s+v-if="addNodePickerOverlay"/)
  assert.match(canvas, /<AddNodePanel/)
  assert.match(canvas, /closeAddNodePicker/)
  assert.match(canvas, /anchorRect/)
  assert.match(canvas, /bottomAlignedTop/)
  assert.match(canvas, /secondarySide/)
  assert.match(canvas, /ADD_NODE_PICKER_CASCADE_WIDTH/)
  assert.match(canvas, /:secondary-side="addNodePickerOverlay\.secondarySide"/)
  assert.doesNotMatch(canvas, /panelStore\.togglePanel\(\{\s*id: 'add-node-panel'/)

  assert.match(baseNode, /clientX: event\.clientX/)
  assert.match(quickAddButton, /clientX: event\.clientX/)
  assert.match(baseEdge, /clientX: event\.clientX/)
  assert.match(triggerNode, /clientX: event\.clientX/)
  assert.match(triggerNode, /anchorRect/)
})

test('add node panel supports focused global fuzzy search in the primary panel', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /searchInput/)
  assert.match(panel, /searchInput\.value\?\.focus\(\)/)
  assert.match(panel, /matchesFuzzyLetters/)
  assert.match(panel, /isSearching/)
  assert.match(panel, /globalSearchItems/)
  assert.match(panel, /selectGlobalSearchItem/)
  assert.match(panel, /add-node-cascade__search/)
  assert.match(panel, /secondarySide/)
  assert.match(panel, /add-node-panel--secondary-left/)
  assert.match(panel, /else \{[\s\S]*item\.preset\.categories\[0\][\s\S]*hoverCategory\(category\)/)
})

test('add node panel primary column animates in from the left with fade-in', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /\.add-node-cascade__primary\s*\{[\s\S]*animation: add-node-primary-in/)
  assert.match(panel, /@keyframes add-node-primary-in\s*\{[\s\S]*opacity: 0;[\s\S]*transform: translateX\(-12px\);[\s\S]*opacity: 1;[\s\S]*transform: translateX\(0\);/)
  assert.match(panel, /@media \(prefers-reduced-motion: reduce\)/)
})

test('node inspector previews summarize provider, memory, tools, and chat trigger', () => {
  const source = read('src/features/workflow-editor/components/settings/nodeInspectorPreview.ts')

  assert.match(source, /buildAgentNodePreview/)
  assert.match(source, /provider/)
  assert.match(source, /memory/)
  assert.match(source, /tools/)
  assert.match(source, /chat/)
  assert.match(source, /chatAuthMode/)
})
