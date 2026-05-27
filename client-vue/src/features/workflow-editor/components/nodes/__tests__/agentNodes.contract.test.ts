import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('workflow canvas registers agent node renderers', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  for (const componentName of ['AiAgentNode', 'AiModelNode', 'AiMemoryNode', 'AiToolNode']) {
    assert.match(canvas, new RegExp(`import ${componentName} from './nodes/${componentName}\\.vue'`))
  }

  for (const slotName of ['ai-agent', 'ai-model', 'ai-memory', 'ai-tool']) {
    assert.match(canvas, new RegExp(`#node-${slotName}="nodeProps"`))
  }
})

test('workflow types expose agent config nodes without a separate chat-trigger node type', () => {
  const types = read('src/core/types/workflow.types.ts')

  for (const nodeType of ['ai-agent', 'ai-model', 'ai-memory', 'ai-tool']) {
    assert.match(types, new RegExp(`\\| '${nodeType}'`))
  }

  assert.doesNotMatch(types, /'chat-trigger'/)
  assert.match(types, /export interface AiAgentNode/)
  assert.match(types, /export interface AiModelNode/)
  assert.match(types, /export interface AiMemoryNode/)
  assert.match(types, /export interface AiToolNode/)
  assert.match(types, /type: 'manual' \| 'webhook' \| 'cron' \| 'plugin' \| 'form' \| 'chat'/)
})

test('ai agent node renders the title inside a wide plugin-colored card without count summary', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiAgentNode.vue')

  assert.match(source, /NodeProps<AiAgentNode>/)
  assert.match(source, /BaseNode/)
  assert.match(source, /width="236px"/)
  assert.match(source, /height="100px"/)
  assert.match(source, /ai-agent-node__card-content/)
  assert.match(source, /ai-agent-node__title/)
  assert.match(source, /AI Agent/)
  assert.match(source, /Tools Agent/)
  assert.match(source, /color="var\(--sailor-text-muted\)"/)
  assert.match(source, /bg="transparent"/)
  assert.match(source, /border-color="var\(--sailor-node-border\)"/)
  assert.doesNotMatch(source, /models \|/)
  assert.doesNotMatch(source, /memories \|/)
  assert.doesNotMatch(source, /tools`\)/)
})

test('ai agent node exposes clickable diamond config handles with contextual quick-add', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiAgentNode.vue')

  assert.match(source, /QuickAddButton/)
  assert.match(source, /id="chatModel"/)
  assert.match(source, /id="memory"/)
  assert.match(source, /id="tool"/)
  assert.match(source, /Chat Model\*/)
  assert.match(source, /Memory/)
  assert.match(source, /Tool/)
  assert.match(source, /has-target/)
  assert.match(source, /has-source/)
  assert.doesNotMatch(source, /Model required/)
  assert.doesNotMatch(source, /missingRequiredModel/)
  assert.doesNotMatch(source, /hasChatModelConnection/)
  assert.doesNotMatch(source, /ai-agent-node--missing-model/)
  assert.match(source, /variant="diamond"/)
  assert.match(
    source,
    /<BaseHandle id="chatModel" type="target" :position="Position\.Bottom" variant="diamond" \/>\s*<span>Chat Model\*<\/span>\s*<QuickAddButton/,
  )
  assert.match(
    source,
    /<BaseHandle id="memory" type="target" :position="Position\.Bottom" variant="diamond" \/>\s*<span>Memory<\/span>\s*<QuickAddButton/,
  )
  assert.match(
    source,
    /<BaseHandle id="tool" type="target" :position="Position\.Bottom" variant="diamond" \/>\s*<span>Tool<\/span>\s*<QuickAddButton/,
  )
  assert.match(source, /mode="agent-config"/)
  assert.match(source, /target-handle-id="chatModel"/)
  assert.match(source, /target-handle-id="memory"/)
  assert.match(source, /target-handle-id="tool"/)
  assert.match(source, /always-visible/)
  assert.match(source, /pointer-events:\s*all/)
  assert.match(source, /z-index:\s*2110/)
  assert.match(source, /grid-template-columns:\s*repeat\(3,\s*1fr\)/)
  assert.match(source, /width:\s*236px/)
  assert.match(source, /height:\s*86px/)
  assert.match(source, /--qab-size:\s*19px/)
  assert.match(source, /--qab-cable-length:\s*48px/)
  assert.match(source, /:deep\(.qab-wrap--down\)/)
})

test('ai model node shows plugin capability and model identity', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiModelNode.vue')

  assert.match(source, /NodeProps<AiModelNode>/)
  assert.match(source, /pluginId/)
  assert.match(source, /model/)
  assert.match(source, /BaseNode/)
  assert.match(source, /apiRequest/)
  assert.match(source, /resolvePluginIcon/)
  assert.match(source, /BaseHandle/)
  assert.match(source, /Position\.Top/)
  assert.match(source, /variant="diamond"/)
  assert.match(source, /agent-config-node/)
  assert.match(source, /agent-config-node--round/)
  assert.match(source, /border-radius:\s*9999px/)
  assert.match(source, /var\(--sailor-node-plugin-bg\)/)
  assert.doesNotMatch(source, /provider/)
  assert.doesNotMatch(source, /openrouter/)
  assert.doesNotMatch(source, /openai/)
  assert.doesNotMatch(source, /sailor-ollama/)
  assert.doesNotMatch(source, /has-source/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.doesNotMatch(source, /has-target/)
})

test('ai memory node shows memory scope', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiMemoryNode.vue')

  assert.match(source, /NodeProps<AiMemoryNode>/)
  assert.match(source, /scope/)
  assert.match(source, /BaseNode/)
  assert.match(source, /apiRequest/)
  assert.match(source, /resolvePluginIcon/)
  assert.match(source, /BaseHandle/)
  assert.match(source, /Position\.Top/)
  assert.match(source, /variant="diamond"/)
  assert.match(source, /agent-config-node/)
  assert.match(source, /agent-config-node--round/)
  assert.match(source, /border-radius:\s*9999px/)
  assert.match(source, /var\(--sailor-node-plugin-bg\)/)
  assert.doesNotMatch(source, /has-source/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.doesNotMatch(source, /has-target/)
})

test('ai tool node shows plugin, method, and side effect policy', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiToolNode.vue')

  assert.match(source, /NodeProps<AiToolNode>/)
  assert.match(source, /pluginId/)
  assert.match(source, /methodId/)
  assert.match(source, /sideEffect/)
  assert.match(source, /requiresApproval/)
  assert.match(source, /apiRequest/)
  assert.match(source, /resolvePluginIcon/)
  assert.match(source, /BaseHandle/)
  assert.match(source, /Position\.Top/)
  assert.match(source, /variant="diamond"/)
  assert.match(source, /agent-config-node/)
  assert.match(source, /agent-config-node--round/)
  assert.match(source, /border-radius:\s*9999px/)
  assert.match(source, /var\(--sailor-node-plugin-bg\)/)
  assert.doesNotMatch(source, /has-source/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.doesNotMatch(source, /has-target/)
})

test('agent config edges are rendered as dashed connections', () => {
  const source = read('src/features/workflow-editor/components/BaseEdge.vue')

  assert.match(source, /AGENT_CONFIG_TARGET_HANDLES/)
  assert.match(source, /chatModel/)
  assert.match(source, /memory/)
  assert.match(source, /tool/)
  assert.match(source, /strokeDasharray/)
})

test('chat trigger node renders through the normal trigger node subtype', () => {
  const source = read('src/features/workflow-editor/components/nodes/ChatTriggerNode.vue')
  const trigger = read('src/features/workflow-editor/components/nodes/TriggerNode.vue')

  assert.match(source, /NodeProps<TriggerNode>/)
  assert.match(source, /chatSlug/)
  assert.match(source, /chatAuthMode/)
  assert.match(trigger, /triggerData\.value\?\.type === 'chat'/)
  assert.match(trigger, /ChatTriggerNode/)
  assert.match(trigger, /When chat message received/)
})
