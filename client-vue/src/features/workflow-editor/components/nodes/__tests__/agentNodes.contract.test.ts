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

test('ai agent node summarizes provider, memory, and tool counts from node data', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiAgentNode.vue')

  assert.match(source, /NodeProps<AiAgentNode>/)
  assert.match(source, /providerCount/)
  assert.match(source, /memoryCount/)
  assert.match(source, /toolCount/)
  assert.match(source, /BaseNode/)
})

test('ai agent node exposes n8n-style config handles with a required chat model', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiAgentNode.vue')

  assert.match(source, /id="chatModel"/)
  assert.match(source, /id="memory"/)
  assert.match(source, /id="tool"/)
  assert.match(source, /Chat Model\*/)
  assert.match(source, /Memory/)
  assert.match(source, /Tool/)
  assert.match(source, /has-target/)
  assert.match(source, /has-source/)
  assert.match(source, /missingRequiredModel/)
  assert.match(source, /ai-agent-node--missing-model/)
})

test('ai model node shows provider and model identity', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiModelNode.vue')

  assert.match(source, /NodeProps<AiModelNode>/)
  assert.match(source, /provider/)
  assert.match(source, /model/)
  assert.match(source, /BaseNode/)
  assert.match(source, /agent-config-node/)
  assert.match(source, /has-source/)
  assert.doesNotMatch(source, /has-target/)
})

test('ai memory node shows memory scope', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiMemoryNode.vue')

  assert.match(source, /NodeProps<AiMemoryNode>/)
  assert.match(source, /scope/)
  assert.match(source, /BaseNode/)
  assert.match(source, /agent-config-node/)
  assert.match(source, /has-source/)
  assert.doesNotMatch(source, /has-target/)
})

test('ai tool node shows plugin, method, and side effect policy', () => {
  const source = read('src/features/workflow-editor/components/nodes/AiToolNode.vue')

  assert.match(source, /NodeProps<AiToolNode>/)
  assert.match(source, /pluginId/)
  assert.match(source, /methodId/)
  assert.match(source, /sideEffect/)
  assert.match(source, /requiresApproval/)
  assert.match(source, /agent-config-node/)
  assert.match(source, /has-source/)
  assert.doesNotMatch(source, /has-target/)
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
