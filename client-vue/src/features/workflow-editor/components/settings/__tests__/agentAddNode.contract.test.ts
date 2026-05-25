import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('add node panel exposes an AI category with agent building blocks', () => {
  const source = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(source, /const AI_NODES(?:: AddNodeDefinition\[\])? = \[/)
  assert.match(source, /AI/)

  for (const label of ['AI Agent', 'AI Model', 'AI Memory', 'AI Tool', 'Chat Trigger']) {
    assert.match(source, new RegExp(`label: '${label}'`))
  }

  assert.match(source, /filteredAiNodes/)
  assert.match(source, /onAddLogicNode\?\.\(def\.type, def\.defaults\)/)
})

test('ai node defaults are safe and backend-compatible', () => {
  const canvas = read('src/features/workflow-editor/components/SailorWorkflowCanvas.vue')

  assert.match(canvas, /type === 'ai-agent'/)
  assert.match(canvas, /defaultData\.prompt = 'You are a helpful workflow agent\. Use tools only when needed\.'/)
  assert.match(canvas, /defaultData\.maxIterations = 8/)
  assert.match(canvas, /defaultData\.maxToolCalls = 12/)
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

test('chat trigger palette item creates a trigger subtype instead of a new node type', () => {
  const panel = read('src/features/workflow-editor/components/settings/AddNodePanel.vue')

  assert.match(panel, /label: 'Chat Trigger'/)
  assert.match(panel, /type: 'trigger' as WorkflowNodeType/)
  assert.match(panel, /trigger: \{\s*type: 'chat'/)
  assert.doesNotMatch(panel, /type: 'chat-trigger'/)
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
