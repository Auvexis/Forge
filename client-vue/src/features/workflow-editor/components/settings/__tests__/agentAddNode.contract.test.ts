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
  assert.match(source, /filteredAiNodes/)
  assert.match(source, /props\.onAddLogicNode\?\.\(item\.preset\.nodeType, item\.preset\.defaults\)/)
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
  assert.match(source, /add-node-picker-grid/)
})

test('canvas connects contextual quick-add nodes into agent config handles', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(canvas, /quickAddTargetId/)
  assert.match(canvas, /quickAddTargetHandle/)
  assert.match(canvas, /agentConfigHandle/)
  assert.match(canvas, /connectAgentConfigNode/)
  assert.match(canvas, /targetHandle: targetHandle/)
  assert.match(canvas, /sourceHandle: 'source'/)
  assert.match(canvas, /onAddAgentToolNode/)
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

  assert.match(panel, /label: 'Trigger'/)
  assert.match(panel, /description: 'Add another workflow entry point'/)
  assert.doesNotMatch(panel, /label: 'Chat Trigger'/)
  assert.doesNotMatch(panel, /trigger: \{\s*type: 'chat'/)
  assert.doesNotMatch(panel, /type: 'chat-trigger'/)
})

test('add node panel keeps the plugin methods view scrollable inside the panel', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /<div class="add-node-content" @wheel\.stop>/)
  assert.match(panel, /\.add-node-panel\s*\{[\s\S]*overflow: hidden;/)
  assert.match(panel, /\.add-node-content\s*\{[\s\S]*min-height: 0;[\s\S]*overflow-y: auto;[\s\S]*overflow-x: hidden;[\s\S]*overscroll-behavior: contain;/)
})

test('add node panel groups plugin choices by category with filter and collapse controls', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /buildPickerCategoryItems/)
  assert.match(panel, /buildPickerSecondColumnItems/)
  assert.match(panel, /buildPickerActionItems/)
  assert.match(panel, /selectedCategory/)
  assert.match(panel, /selectedPickerItemId/)
  assert.match(panel, /add-node-picker-shell/)
  assert.match(panel, /add-node-picker-grid/)
  assert.match(panel, /add-node-picker-column/)
  assert.match(panel, /add-node-picker-column__scroller/)
  assert.doesNotMatch(panel, /categoryFilterOpen/)
  assert.doesNotMatch(panel, /toggleCategory/)
  assert.doesNotMatch(panel, /view === 'actions'/)
  assert.doesNotMatch(panel, /goBack/)
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
