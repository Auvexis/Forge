import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../../../../../../..')

function read(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

test('editor registry maps AI workflow nodes to dedicated editors', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/index.ts')

  for (const editor of ['AiAgentEditor', 'AiModelEditor', 'AiMemoryEditor', 'AiToolEditor']) {
    assert.match(source, new RegExp(`import ${editor} from './${editor}\\.vue'`))
  }

  assert.match(source, /'ai-agent': AiAgentEditor/)
  assert.match(source, /'ai-model': AiModelEditor/)
  assert.match(source, /'ai-memory': AiMemoryEditor/)
  assert.match(source, /'ai-tool': AiToolEditor/)
})

test('ai agent editor exposes prompt, limits, timeout, approvals, and output mode', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue')

  for (const field of ['prompt', 'maxIterations', 'maxToolCalls', 'timeoutMs', 'outputMode', 'requireApprovalForSideEffects']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /ExpressionTextarea/)
  assert.match(source, /BaseSelect/)
})

test('ai model editor exposes provider, model, temperature, token limits, and credentials', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiModelEditor.vue')

  for (const field of ['provider', 'model', 'temperature', 'maxTokens', 'credentialId']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /Credential/)
  assert.match(source, /BaseSelect/)
})

test('ai memory editor exposes scope, read and write toggles, and retrieval limits', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue')

  for (const field of ['scope', 'readEnabled', 'writeEnabled', 'maxRetrievedMemories', 'maxMemoryChars']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /BaseSwitch/)
})

test('ai tool editor exposes picker placeholder and side-effect policy', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiToolEditor.vue')

  for (const field of ['AgentToolPicker', 'pluginId', 'methodId', 'sideEffect', 'requiresApproval', 'timeoutMs']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /BaseSwitch/)
})

test('chat trigger editor exposes slug, title, auth, session, and rate limit controls', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/ChatTriggerEditor.vue')
  const trigger = read('src/features/workflow-editor/components/settings/editors/TriggerEditor.vue')

  for (const field of ['chatSlug', 'chatTitle', 'chatAuthMode', 'chatSessionMode', 'chatRateLimitPerMinute']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /BaseSelect/)
  assert.match(trigger, /ChatTriggerEditor/)
})
