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

test('ai agent node uses the advanced base and shared contextual handlers', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiAgentNode.vue')
  const definitions = read('src/features/workflow-editor/layout/advancedNodeDefinitions.ts')

  assert.match(source, /NodeProps<AiAgentNode>/)
  assert.match(source, /BaseAdvancedNode/)
  assert.match(source, /AI_AGENT_HANDLERS/)
  assert.match(source, /auto-organize/)
  assert.match(source, /agentDisplayName/)
  assert.match(source, /agentEmoji/)
  assert.match(source, /displayTitle/)
  assert.match(source, /displayAvatar/)
  assert.match(source, /Tools Agent/)
  assert.match(definitions, /capability:chat-model/)
  assert.match(definitions, /preset:sqlite-memory/)
  assert.match(definitions, /capability:memory-store/)
  assert.match(definitions, /capability:agent-tool/)
  assert.match(source, /has-target/)
  assert.match(source, /has-source/)
  assert.doesNotMatch(source, /BaseHandle/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.doesNotMatch(source, /config-handles/)
})

test('ai model node shows plugin capability and model identity as a circular top-output child', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiModelNode.vue')

  assert.match(source, /NodeProps<AiModelNode>/)
  assert.match(source, /pluginId/)
  assert.match(source, /model/)
  assert.match(source, /BaseNode/)
  assert.match(source, /apiRequest/)
  assert.match(source, /resolvePluginIcon/)
  assert.match(source, /rounded="full"/)
  assert.match(source, /CONFIGURATION_SOURCE_HANDLER/)
  assert.match(source, /width="100px"/)
  assert.match(source, /height="100px"/)
  assert.match(source, /var\(--sailor-node-plugin-bg\)/)
  assert.doesNotMatch(source, /provider/)
  assert.doesNotMatch(source, /openrouter/)
  assert.doesNotMatch(source, /openai/)
  assert.doesNotMatch(source, /sailor-ollama/)
  assert.match(source, /:handlers="\[CONFIGURATION_SOURCE_HANDLER\]"/)
  assert.doesNotMatch(source, /has-source/)
  assert.doesNotMatch(source, /BaseHandle/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.doesNotMatch(source, /has-target/)
})

test('ai memory node shows memory scope as a circular top-output child', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiMemoryNode.vue')

  assert.match(source, /NodeProps<AiMemoryNode>/)
  assert.match(source, /scope/)
  assert.match(source, /BaseNode/)
  assert.match(source, /apiRequest/)
  assert.match(source, /resolvePluginIcon/)
  assert.match(source, /rounded="full"/)
  assert.match(source, /CONFIGURATION_SOURCE_HANDLER/)
  assert.match(source, /width="100px"/)
  assert.match(source, /height="100px"/)
  assert.match(source, /var\(--sailor-node-plugin-bg\)/)
  assert.match(source, /:handlers="\[CONFIGURATION_SOURCE_HANDLER\]"/)
  assert.doesNotMatch(source, /has-source/)
  assert.doesNotMatch(source, /BaseHandle/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.doesNotMatch(source, /has-target/)
})

test('ai tool node shows plugin and method as a circular top-output child', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiToolNode.vue')

  assert.match(source, /NodeProps<AiToolNode>/)
  assert.match(source, /pluginId/)
  assert.match(source, /methodId/)
  assert.doesNotMatch(source, /sideEffect/)
  assert.doesNotMatch(source, /requiresApproval/)
  assert.doesNotMatch(source, /ai-tool-node__badge/)
  assert.match(source, /apiRequest/)
  assert.match(source, /watch/)
  assert.match(source, /loadPluginAppearance/)
  assert.match(source, /\(\) => pluginId\.value/)
  assert.match(source, /resolvePluginIcon/)
  assert.match(source, /rounded="full"/)
  assert.match(source, /CONFIGURATION_SOURCE_HANDLER/)
  assert.match(source, /width="100px"/)
  assert.match(source, /height="100px"/)
  assert.match(source, /var\(--sailor-node-plugin-bg\)/)
  assert.match(source, /:handlers="\[CONFIGURATION_SOURCE_HANDLER\]"/)
  assert.doesNotMatch(source, /has-source/)
  assert.doesNotMatch(source, /BaseHandle/)
  assert.doesNotMatch(source, /QuickAddButton/)
  assert.doesNotMatch(source, /has-target/)
})

test('declared configuration edges use dashed presentation for Agent and Vector Store', () => {
  const source = read('src/features/workflow-editor/components/BaseEdge.vue')

  assert.match(source, /CONFIGURATION_TARGET_HANDLES/)
  for (const handle of ['chatModel', 'memory', 'tool', 'embedding', 'document']) {
    assert.match(source, new RegExp(`'${handle}'`))
  }
  assert.match(source, /strokeDasharray/)
  assert.match(source, /strokeLinecap/)
  assert.doesNotMatch(source, /AGENT_CONFIG_TARGET_HANDLES/)
  assert.doesNotMatch(source, /isAgentConfigEdge/)
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
