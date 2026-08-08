import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('add node panel gets the root AI Agent from the styled utility catalog', () => {
  const source = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.doesNotMatch(source, /const AI_NODES/)
  assert.match(source, /filterDefaultPickerPresets\(catalogPresets\.value\)/)

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

test('add node panel keeps Trigger only inside the Utilities category', () => {
  const source = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.doesNotMatch(source, /TRIGGER_PRESET/)
  assert.doesNotMatch(source, /showQuickTrigger/)
  assert.doesNotMatch(source, />Trigger<\/div>/)
  assert.match(source, /catalogItemsToPickerPresets/)
})

test('add node panel filters contextual quick-add through allowed node selectors', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')
  const canvas = read('src/features/workflow-editor/components/FabricWorkflowCanvas.vue')

  assert.match(canvas, /allowedNodes: AllowedNodes/)
  assert.match(panel, /allowedNodes\?: AllowedNodes/)
  assert.match(panel, /handlerId\?: string/)
  assert.match(panel, /allowedNodeSelectorsPermitPreset/)
  assert.match(panel, /allowedNodeSelectorsPermitPlugin/)
  assert.doesNotMatch(panel, /agentConfigHandle\?:/)
  assert.doesNotMatch(panel, /vectorConfigHandle\?:/)
  assert.doesNotMatch(panel, /agentChatModelPlugins/)
  assert.doesNotMatch(panel, /agentMemoryStorePlugins/)
  assert.doesNotMatch(panel, /pluginHasAgentTools/)
})

test('capability quick-add preserves target handle context', () => {
  const quickAdd = read('src/features/workflow-editor/components/QuickAddButton.vue')

  assert.match(quickAdd, /isConfigurationQuickAdd/)
  assert.match(quickAdd, /props\.mode !== 'source'/)
  assert.match(quickAdd, /handlerId: props\.targetHandleId \?\? props\.handleId/)
  assert.match(quickAdd, /allowedNodes: props\.allowedNodes/)
})

test('canvas connects contextual quick-add nodes into advanced config handles', () => {
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

  assert.match(canvas, /quickAddTargetId/)
  assert.match(canvas, /quickAddTargetHandle/)
  assert.match(canvas, /quickAddSourceHandle/)
  assert.match(canvas, /createWorkflowConnectionEdge/)
  assert.match(canvas, /targetHandle,/)
  assert.match(canvas, /sourceHandle: 'source'/)
})

test('canvas recognizes vector store handles as configuration edges', () => {
  const canvas = read('src/features/workflow-editor/components/WorkflowEdgeLayer.vue')

  assert.match(canvas, /getNodeDefinition/)
  assert.match(canvas, /handle\?\.accepts\?\.length/)
})

test('vector store picker creates a provider-configured utility node instead of a plugin action', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')
  const canvas = read('src/features/workflow-editor/components/FabricWorkflowCanvas.vue')

  assert.match(panel, /buildVectorStoreProviderItems/)
  assert.match(panel, /item\.preset\.nodeType === 'vector-store'/)
  assert.match(panel, /onAddLogicNode\?\.\('vector-store'/)
  assert.match(panel, /ensureCollectionMethodId: 'ensureCollection'/)
  assert.doesNotMatch(canvas, /defaultData\.pluginId = 'fabric-qdrant'/)
})

test('global add node panel opens vector store provider picker before adding a node', () => {
  const panel = read('src/features/workflow-editor/components/settings/GlobalAddNodePanel.vue')

  assert.match(panel, /buildVectorStoreProviderItems/)
  assert.match(panel, /vectorStoreProviderPickerOpen/)
  assert.match(panel, /item\.nodeType === 'vector-store'/)
  assert.match(panel, /addVectorStoreNodeAtCenter/)
  assert.match(panel, /onAddLogicNodeAtCenter\?\.\('vector-store'/)
  assert.doesNotMatch(panel, /@click="props\.onAddLogicNodeAtCenter\?\.\(item\.nodeType, item\.defaults\)"/)
})

test('embedding quick-add uses a vector config context separate from agent config', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')
  const host = read('src/features/workflow-editor/components/FabricWorkflowCanvas.vue')
  const definitions = read('src/features/workflow-editor/layout/advancedNodeDefinitions.ts')
  const selectors = read('src/features/workflow-editor/components/settings/allowedNodeSelectors.ts')

  assert.match(panel, /handlerId\?: string/)
  assert.match(panel, /buildEmbeddingProviderItems/)
  assert.match(panel, /buildEmbeddingModelItems/)
  assert.match(panel, /isEmbeddingContext\.value[\s\S]*openMethodSubmenu\(item\.plugin\)/)
  assert.match(panel, /addEmbeddingNode\(methodSubmenuPlugin, item\.methodKey\)/)
  assert.match(panel, /Embedding Model/)
  assert.match(panel, /allowedNodeSelectorsPermitPlugin/)
  assert.match(panel, /onAddLogicNode\?\.\('embeddings'/)
  assert.match(host, /handlerId: string \| null/)
  assert.match(host, /:allowed-nodes="addNodePickerOverlay\.allowedNodes"/)
  assert.match(definitions, /id: 'embedding'[\s\S]*capability:embedding-model/)
  assert.doesNotMatch(definitions, /id: 'embedding'[\s\S]*node:embeddings/)
  assert.match(host, /embedding: \['capability:embedding-model'\]/)
  assert.doesNotMatch(host, /embedding: \[[^\]]*node:embeddings/)
  assert.match(selectors, /capabilities\.push\('embedding-model'\)/)
  assert.doesNotMatch(selectors, /capabilities\.push\('embedding-provider'\)/)
})

test('embedding quick-add never offers the generic embeddings preset', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /if \(isEmbeddingContext\.value\) \{[\s\S]*preset\.nodeType !== 'embeddings'[\s\S]*\}/)
})

test('document quick-add exposes only dataset utility nodes', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /allowedNodeSelectorsPermitPreset/)
  assert.match(panel, /effectiveAllowedNodes/)
})

test('canvas auto-arranges advanced node children through the shared presentation registry', () => {
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

  assert.match(canvas, /getAdvancedChildPosition/)
  assert.match(canvas, /getAdvancedNodeHandlersForCanvas/)
  assert.match(canvas, /getAdvancedParentBounds/)
  assert.match(canvas, /arrangeAdvancedConfigNodes/)
  assert.match(canvas, /siblingIndex/)
  assert.doesNotMatch(canvas, /AGENT_CONFIG_LAYOUT/)
  assert.doesNotMatch(canvas, /getAgentConfigLayoutPosition/)
  assert.doesNotMatch(canvas, /arrangeAgentConfigNodes/)
})

test('ai node defaults are safe and backend-compatible', () => {
  const canvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

  assert.match(canvas, /type === 'ai-agent'/)
  assert.match(canvas, /prompt: 'You are a helpful workflow agent\. Use tools only when needed\.'/)
  assert.match(canvas, /maxToolCalls: 12/)
  assert.match(canvas, /maxRetriesPerTool: 3/)
  assert.match(canvas, /timeoutMs: 180000/)
  assert.match(canvas, /requireApprovalForSideEffects: \[/)
  assert.match(canvas, /'write'/)
  assert.match(canvas, /'delete'/)
  assert.match(canvas, /'external-message'/)
  assert.match(canvas, /'external-payment'/)
  assert.match(canvas, /'filesystem'/)
  assert.match(canvas, /outputMode: 'text'/)

  assert.match(canvas, /type === 'ai-tool'/)
  assert.match(canvas, /requiresApproval: true/)
  assert.match(canvas, /sideEffect: 'write'/)
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
  const canvas = read('src/features/workflow-editor/components/FabricWorkflowCanvas.vue')
  const baseNode = read('src/features/workflow-editor/components/BaseNode.vue')
  const quickAddButton = read('src/features/workflow-editor/components/QuickAddButton.vue')
  const edgeLayer = read('src/features/workflow-editor/components/WorkflowEdgeLayer.vue')
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
  assert.match(edgeLayer, /clientX: event\.clientX/)
  assert.match(triggerNode, /clientX: event\.clientX/)
  assert.match(triggerNode, /anchorRect/)
})

test('workflow chrome add node opens a global right panel separate from the canvas picker', () => {
  const page = read('src/app/pages/WorkflowEditorPage.vue')

  assert.match(page, /GlobalAddNodePanel/)
  assert.match(page, /useAppPanelStore/)
  assert.match(page, /function openGlobalAddNodePanel\(toggle = false\)/)
  assert.match(page, /id: 'workflow-global-add-node-panel'/)
  assert.match(page, /position: 'right'/)
  assert.match(page, /resizable: true/)
  assert.match(page, /resizeSide: 'left'/)
  assert.match(page, /appPanelStore\.togglePanel\(panel\)/)
  assert.match(page, /'workflow-tool-rail__button--active': isGlobalAddNodePanelOpen/)
  assert.match(page, /@click="openGlobalAddNodePanel\(true\)"/)
  assert.match(page, /@add-node="openGlobalAddNodePanel\(\)"/)
  assert.doesNotMatch(page, /@add-node="canvasRef\?\.openAddNodePanel\(\)"/)
})

test('global add node panel exposes only Utilities and Integrations sections', () => {
  const panel = read('src/features/workflow-editor/components/settings/GlobalAddNodePanel.vue')

  assert.match(panel, /global-add-node-panel/)
  assert.match(panel, /Utilities/)
  assert.match(panel, /Integrations/)
  assert.match(panel, /name="wrench"/)
  assert.match(panel, /name="puzzle"/)
  assert.doesNotMatch(panel, />Actions</)
  assert.doesNotMatch(panel, />Storage</)
  assert.match(panel, /@pointerdown="handlePointerDragStart/)
  assert.match(panel, /onAddLogicNodeAtCenter/)
  assert.match(panel, /onAddPluginNodeAtCenter/)
})

test('global add node panel groups utility plugins and opens multi-method plugins in a method view', () => {
  const panel = read('src/features/workflow-editor/components/settings/GlobalAddNodePanel.vue')

  assert.match(panel, /plugin\.manifest\.metadata\.utility === true/)
  assert.match(panel, /utilityPluginItems/)
  assert.match(panel, /integrationItems/)
  assert.match(panel, /pluginActionItems\(plugin\)\.length > 1/)
  assert.match(panel, /global-add-node-panel__method-more/)
  assert.match(panel, /name="plus"/)
  assert.match(panel, /selectedPlugin/)
  assert.match(panel, /methodSearch/)
  assert.match(panel, /BaseButton/)
  assert.match(panel, /closePluginMethodView/)
  assert.match(panel, /filteredSelectedPluginActions/)
  assert.match(panel, /global-add-node-panel__method-icon/)
  assert.match(panel, /name="workflow"/)
  assert.doesNotMatch(panel, /global-add-node-panel__method-count/)
  assert.doesNotMatch(panel, /expandedPluginId/)
})

test('global add node panel animates section expand and collapse', () => {
  const panel = read('src/features/workflow-editor/components/settings/GlobalAddNodePanel.vue')

  assert.match(panel, /<Transition name="global-add-node-section">/)
  assert.match(panel, /\.global-add-node-section-enter-active/)
  assert.match(panel, /\.global-add-node-section-leave-active/)
})

test('workflow canvas exposes center and drop coordinate add node actions', () => {
  const canvas = read('src/features/workflow-editor/components/FabricWorkflowCanvas.vue')
  const baseCanvas = read('src/features/workflow-editor/components/WorkflowBaseCanvas.vue')

  assert.match(baseCanvas, /addLogicNodeAtViewportCenter/)
  assert.match(baseCanvas, /addPluginNodeAtViewportCenter/)
  assert.match(baseCanvas, /addLogicNodeAtScreenPoint/)
  assert.match(baseCanvas, /addPluginNodeAtScreenPoint/)
  assert.match(baseCanvas, /screenToCanvasWorld/)
  assert.match(baseCanvas, /if \(type === 'trigger'\) return \{ trigger: \{ type: 'manual' \} \}/)
  assert.match(canvas, /handleGlobalAddNodeDrop/)
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
