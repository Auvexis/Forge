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
  const inspector = read('src/features/workflow-editor/components/settings/NodeInspectorModal.vue')

  for (const field of ['prompt', 'maxIterations', 'maxToolCalls', 'timeoutMs', 'outputMode', 'requireApprovalForSideEffects']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /ExpressionTextarea/)
  assert.match(source, /BaseSelect/)
  assert.doesNotMatch(source, /PluginMenuAuth/)
  assert.match(inspector, /PluginMenuAuth/)
  assert.match(inspector, /settingsAuthPluginId/)
})

test('ai model editor exposes plugin capability identity, model, temperature, token limits, and credentials', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiModelEditor.vue')

  for (const field of ['pluginId', 'adapter', 'model', 'temperature', 'maxTokens', 'credentialId']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /Credential/)
  assert.match(source, /Provider Plugin/)
  assert.match(source, /Adapter/)
  assert.doesNotMatch(source, /const PROVIDERS/)
  assert.doesNotMatch(source, /value: 'openai'/)
  assert.doesNotMatch(source, /value: 'openrouter'/)
  assert.doesNotMatch(source, /updateNodeData\(\{ provider:/)
  assert.doesNotMatch(source, /PluginMenuAuth/)
  assert.doesNotMatch(source, /modelAuthPluginId/)
})

test('frontend agent runtime types expose plugin capability and generic model contracts', () => {
  const pluginTypes = read('src/core/types/plugin.types.ts')
  const workflowTypes = read('src/core/types/workflow.types.ts')
  const agentTypes = read('src/features/agent-runtime/types/agent.types.ts')

  assert.match(pluginTypes, /agentCapabilities/)
  assert.match(pluginTypes, /chatModel/)
  assert.match(pluginTypes, /memoryStore/)
  assert.match(pluginTypes, /AgentModelAdapter/)
  assert.match(pluginTypes, /searchMethodId/)
  assert.match(pluginTypes, /putMethodId/)

  assert.match(workflowTypes, /pluginId/)
  assert.match(workflowTypes, /adapter/)
  assert.match(workflowTypes, /AgentModelAdapter/)
  assert.doesNotMatch(workflowTypes, /provider\?: 'openai' \| 'openrouter'/)

  assert.match(agentTypes, /pluginId/)
  assert.match(agentTypes, /adapter/)
  assert.match(agentTypes, /AgentModelAdapter/)
  assert.doesNotMatch(agentTypes, /provider\?: 'openai' \| 'openrouter'/)
})

test('ai memory editor exposes scope, read and write toggles, and retrieval limits', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiMemoryEditor.vue')
  const picker = read('src/features/workflow-editor/components/agent/AgentMemoryScopePicker.vue')

  for (const field of ['scope', 'readEnabled', 'writeEnabled', 'maxRetrievedMemories', 'maxMemoryChars']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /AgentMemoryScopePicker/)
  assert.match(source, /Provider Plugin/)
  assert.match(source, /Adapter/)
  assert.match(source, /searchMethodId/)
  assert.match(source, /putMethodId/)
  assert.match(picker, /BaseSwitch/)
  assert.doesNotMatch(source, /PluginMenuAuth/)
})

test('ai tool editor configures the selected tool instead of re-opening the tool picker', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiToolEditor.vue')

  for (const field of ['pluginId', 'methodId', 'descriptionOverride', 'inputDefaults', 'sideEffect', 'requiresApproval', 'timeoutMs']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /Selected Tool/)
  assert.match(source, /Tool Instructions/)
  assert.match(source, /Parameter Defaults/)
  assert.match(source, /BaseTextarea/)
  assert.match(source, /BaseSwitch/)
  assert.match(source, /JSON\.parse/)
  assert.doesNotMatch(source, /AgentToolPicker/)
  assert.doesNotMatch(source, /PluginMenuAuth/)
})

test('plugin auth for agent config nodes lives in the node settings tab', () => {
  const inspector = read('src/features/workflow-editor/components/settings/NodeInspectorModal.vue')

  assert.match(inspector, /import PluginMenuAuth/)
  assert.match(inspector, /settingsAuthPluginId/)
  assert.match(inspector, /hasAuthSettings/)
  assert.match(inspector, /typeof data\.pluginId === 'string'/)
  assert.match(inspector, /return data\.pluginId/)
  assert.doesNotMatch(inspector, /provider === 'ollama' \? 'sailor-ollama' : provider/)
  assert.match(inspector, /v-if="hasAuthSettings"/)
  assert.match(inspector, /:plugin-id="settingsAuthPluginId"/)
})

test('chat trigger editor exposes slug, title, auth, session, and rate limit controls', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/ChatTriggerEditor.vue')
  const trigger = read('src/features/workflow-editor/components/settings/editors/TriggerEditor.vue')

  for (const field of ['chatSlug', 'chatTitle', 'chatAuthMode', 'chatSessionMode', 'chatRateLimitPerMinute']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /BaseSelect/)
  assert.match(source, /generateChatSlug/)
  assert.match(source, /chat-[a-z0-9]+/)
  assert.match(source, /onMounted/)
  assert.match(trigger, /ChatTriggerEditor/)
})

test('trigger editor exposes chat as a normal trigger type and renders chat settings in-place', () => {
  const trigger = read('src/features/workflow-editor/components/settings/editors/TriggerEditor.vue')

  assert.match(trigger, /value: 'chat'/)
  assert.match(trigger, /label: 'Chat'/)
  assert.match(trigger, /<ChatTriggerEditor\s+v-if="node\.data\.type === 'chat'"/)
  assert.match(trigger, /<EditorField label="Trigger Type">/)
})

test('chat trigger editor points users to the status bar chat panel instead of embedding chat', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/ChatTriggerEditor.vue')

  assert.doesNotMatch(source, /import ChatSessionPanel/)
  assert.doesNotMatch(source, /<ChatSessionPanel/)
  assert.match(source, /workflow status bar/)
  assert.match(source, /Open the Chat panel/)
})
