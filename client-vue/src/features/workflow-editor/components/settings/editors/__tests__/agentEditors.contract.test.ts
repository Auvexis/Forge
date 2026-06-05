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

test('ai agent editor exposes prompt, input message, execution mode, limits, timeout, and output mode without approval policy controls', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiAgentEditor.vue')
  const inspector = read('src/features/workflow-editor/components/settings/NodeInspectorModal.vue')

  for (const field of ['prompt', 'inputMessage', 'executionMode', 'maxIterations', 'maxToolCalls', 'maxRetriesPerTool', 'timeoutMs', 'outputMode']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /Execution Mode/)
  assert.match(source, /EXECUTION_MODES/)
  assert.match(source, /value: 'loop'/)
  assert.match(source, /value: 'plan'/)
  assert.match(source, /User Input/)
  assert.match(source, /Max Iterations/)
  assert.match(source, /Max Tool Calls/)
  assert.match(source, /Maximum Retries Per Tool\/Step/)
  assert.match(source, /editor-limit-stack/)
  assert.doesNotMatch(source, /Approval Policy/)
  assert.doesNotMatch(source, /requireApprovalForSideEffects/)
  assert.match(source, /ExpressionTextarea/)
  assert.match(source, /BaseSelect/)
  assert.match(source, /agentDisplayName/)
  assert.match(source, /agentEmoji/)
  assert.doesNotMatch(source, /agentDescription/)
  assert.doesNotMatch(source, /Public Description/)
  assert.match(source, /ProfileAvatarPicker/)
  assert.doesNotMatch(source, /PluginMenuAuth/)
  assert.match(inspector, /PluginMenuAuth/)
  assert.match(inspector, /settingsAuthPluginId/)
})

test('ai model editor exposes plugin capability identity, model, generation labels, and base URL', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiModelEditor.vue')

  for (const field of ['pluginId', 'adapter', 'model', 'temperature', 'maxTokens', 'baseUrl']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /EditorField label="Temperature"/)
  assert.match(source, /EditorField label="Max Tokens"/)
  assert.doesNotMatch(source, /EditorField label="Credential"/)
  assert.doesNotMatch(source, /credentialId/)
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
  assert.match(pluginTypes, /'openai-compatible' \| 'generic' \| 'ollama'/)
  assert.match(pluginTypes, /searchMethodId/)
  assert.match(pluginTypes, /putMethodId/)

  assert.match(workflowTypes, /pluginId/)
  assert.match(workflowTypes, /adapter/)
  assert.match(workflowTypes, /inputMessage\?: string/)
  assert.match(workflowTypes, /maxRetriesPerTool\?: number/)
  assert.match(workflowTypes, /AgentModelAdapter/)
  assert.match(workflowTypes, /'openai-compatible' \| 'generic' \| 'ollama'/)
  assert.doesNotMatch(workflowTypes, /agentDescription/)
  assert.doesNotMatch(workflowTypes, /provider\?: 'openai' \| 'openrouter'/)

  assert.match(agentTypes, /pluginId/)
  assert.match(agentTypes, /adapter/)
  assert.match(agentTypes, /maxRetriesPerTool: number/)
  assert.match(agentTypes, /AgentModelAdapter/)
  assert.match(agentTypes, /'openai-compatible' \| 'generic' \| 'ollama'/)
  assert.doesNotMatch(agentTypes, /agentDisplayName/)
  assert.doesNotMatch(agentTypes, /agentEmoji/)
  assert.doesNotMatch(agentTypes, /agentDescription/)
  assert.doesNotMatch(agentTypes, /provider\?: 'openai' \| 'openrouter'/)
})

test('ai memory editor exposes long-term scope toggles and retrieval limits only for plugin memory', () => {
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
  assert.match(source, /isLongTermMemory/)
  assert.match(source, /v-if="isLongTermMemory"/)
  assert.match(picker, /BaseSwitch/)
  assert.doesNotMatch(source, /PluginMenuAuth/)
})

test('ai tool editor configures the selected tool without exposing side effect metadata', () => {
  const source = read('src/features/workflow-editor/components/settings/editors/AiToolEditor.vue')

  for (const field of ['pluginId', 'methodId', 'descriptionOverride', 'inputDefaults', 'sideEffect', 'requiresApproval', 'timeoutMs']) {
    assert.match(source, new RegExp(field))
  }

  assert.match(source, /Integration \(Plugin\)/)
  assert.match(source, /Action/)
  assert.match(source, /Tool Instructions/)
  assert.match(source, /Parameter Defaults/)
  assert.match(source, /pluginOptions/)
  assert.match(source, /actionOptions/)
  assert.match(source, /handlePluginChange/)
  assert.match(source, /handleMethodChange/)
  assert.match(source, /inputDefaults: \{\}/)
  assert.match(source, /name: 'AI Tool'/)
  assert.match(source, /methodDefaults/)
  assert.match(source, /pluginsApi\.getAll/)
  assert.match(source, /selectedAction\.parameters\?\.properties/)
  assert.match(source, /updateInputDefault/)
  assert.match(source, /ExpressionInput/)
  assert.match(source, /ExpressionTextarea/)
  assert.match(source, /BaseCodeEditor/)
  assert.match(source, /BaseSwitch/)
  assert.doesNotMatch(source, /EditorField label="Side Effect"/)
  assert.doesNotMatch(source, /const SIDE_EFFECTS/)
  assert.match(source, /<style scoped>/)
  assert.match(source, /\.pe-param-card/)
  assert.match(source, /\.pe-param-label/)
  assert.match(source, /\.pe-param-type/)
  assert.doesNotMatch(source, /JSON\.parse/)
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
