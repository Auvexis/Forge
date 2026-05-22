<template>
  <BaseModal :is-open="isOpen" max-width="1600px" height="85vh" @close="emit('close')">
    <div class="inspector-grid flex-1 min-h-0">
      <div class="inspector-pane">
        <div class="inspector-pane-header text-sm text-muted font-semibold flex items-center gap-2">
          <LucideIcon name="download" size="16" />
          INPUT (Past)
        </div>

        <div class="inspector-pane-content relative overflow-y-auto">
          <div class="plugin-creator-context-block">
            <p class="text-xs text-muted font-semibold mb-3">Method Context</p>
            <JsonTreeView :data="inputTreeData" :is-root="true" />
          </div>
        </div>
      </div>

      <div class="inspector-pane" style="background: var(--sailor-bg-surface)">
        <div class="inspector-pane-header flex-between text-sm text-muted font-semibold">
          <div class="flex items-center gap-2">
            <LucideIcon name="settings" size="16" />
            {{ activeTab === 'settings' ? 'SETTINGS' : 'CONFIGURATION' }}
          </div>

          <div class="flex items-center gap-2">
            <BaseButton
              :variant="isDirty ? 'primary' : 'ghost'"
              size="sm"
              icon-left="save"
              :loading="isSaving"
              :disabled="isSaving || !isDirty"
              title="Save Plugin"
              @click="emit('save')"
            >
              Save
            </BaseButton>
            <BaseButton
              variant="ghost"
              size="sm"
              :icon-left="activeTab === 'config' ? 'settings' : 'x'"
              title="Settings"
              @click="toggleSettings"
            />
            <BaseButton variant="ghost" size="sm" icon-left="x" title="Close" @click="emit('close')">
              Close
            </BaseButton>
          </div>
        </div>

        <div class="inspector-pane-content relative overflow-y-auto">
          <PluginCreatorNodeSettingsPanel
            v-if="activeTab === 'config'"
            :blueprint="blueprint"
            :node-id="nodeId"
            :last-test-result="lastTestResult"
            @update-node="forwardUpdateNode"
            @update-method="forwardUpdateMethod"
            @update-input="forwardUpdateInput"
            @update-credential="forwardUpdateCredential"
            @update-request="forwardUpdateRequest"
            @add-credential="emit('addCredential')"
          />
          <div v-else class="plugin-creator-node-settings-tab">
            <section class="plugin-creator-node-settings-card">
              <div class="plugin-creator-node-settings-card__header">
                <div>
                  <p class="plugin-creator-node-settings-card__eyebrow">Node identity</p>
                  <h3>Node Identifier (ID)</h3>
                  <p>
                    Used by edges, execution trace and variable paths. Example:
                    <code>{{ variableExample }}</code>
                  </p>
                </div>
                <span class="plugin-creator-node-settings-card__type">{{ nodeTypeLabel }}</span>
              </div>

              <BaseInput
                v-model="localNodeId"
                class="plugin-creator-node-settings-card__input"
                label="Node ID"
                placeholder="request_fetch_records"
                spellcheck="false"
                :error="nodeIdError"
                @blur="commitNodeId"
                @keydown.enter="commitNodeId"
              />
            </section>

            <section class="plugin-creator-node-settings-card">
              <div class="plugin-creator-node-settings-card__header">
                <div>
                  <p class="plugin-creator-node-settings-card__eyebrow">Canvas</p>
                  <h3>Position</h3>
                  <p>Current canvas coordinates for this node.</p>
                </div>
              </div>
              <div class="plugin-creator-node-settings-grid">
                <BaseInput :model-value="String(node?.position.x ?? 0)" label="X" disabled />
                <BaseInput :model-value="String(node?.position.y ?? 0)" label="Y" disabled />
              </div>
            </section>
          </div>
        </div>
      </div>

      <div class="inspector-pane">
        <div class="inspector-pane-header flex-between text-sm text-muted font-semibold">
          <div class="flex items-center gap-2">
            <LucideIcon name="upload" size="16" />
            OUTPUT (Future)
          </div>
          <BaseButton variant="ghost" size="sm" icon-left="play" @click="emit('run')">
            Run Step
          </BaseButton>
        </div>

        <div class="inspector-pane-content relative overflow-y-auto">
          <div class="plugin-creator-context-block">
            <p class="text-xs text-muted font-semibold mb-3">
              {{ lastTestResult ? 'Last Response' : 'Expected Response' }}
            </p>
            <JsonTreeView :data="outputTreeData" :is-root="true" />
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import JsonTreeView from '@/features/workflow-editor/components/settings/shared/JsonTreeView.vue'
import type {
  PluginBlueprint,
  PluginBlueprintCredentialField,
  PluginBlueprintInput,
  PluginBlueprintMethod,
  PluginBlueprintNode,
  PluginBlueprintRequest,
  PluginCreatorTestResult,
} from '@/core/types/plugin-creator.types'
import PluginCreatorNodeSettingsPanel from './PluginCreatorNodeSettingsPanel.vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    blueprint?: PluginBlueprint | null
    nodeId?: string | null
    lastTestResult?: PluginCreatorTestResult | null
    isDirty?: boolean
    isSaving?: boolean
  }>(),
  {
    blueprint: null,
    nodeId: null,
    lastTestResult: null,
    isDirty: false,
    isSaving: false,
  },
)

const emit = defineEmits<{
  close: []
  run: []
  save: []
  updateNode: [nodeId: string, payload: Partial<PluginBlueprintNode>]
  renameNode: [payload: { oldId: string; newId: string }]
  updateMethod: [methodId: string, payload: Partial<PluginBlueprintMethod>]
  updateInput: [methodId: string, inputName: string, payload: Partial<PluginBlueprintInput>]
  updateCredential: [fieldName: string, payload: Partial<PluginBlueprintCredentialField>]
  updateRequest: [methodId: string, payload: Partial<PluginBlueprintRequest>]
  addCredential: []
}>()

const node = computed(() =>
  props.blueprint && props.nodeId ? props.blueprint.canvas.nodes[props.nodeId] : null,
)
const activeTab = ref<'config' | 'settings'>('config')
const localNodeId = ref('')
const nodeIdError = ref('')

const nodeTypeLabel = computed(() => {
  const type = node.value?.type
  if (!type) return 'Node'
  return type.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
})

const variableExample = computed(() => `{{ steps.${localNodeId.value || 'node_id'}.output }}`)

const method = computed(() => {
  if (!props.blueprint) return null
  const methodId = node.value?.data.methodId
  if (typeof methodId === 'string') {
    return props.blueprint.methods.find((candidate) => candidate.id === methodId) ?? null
  }
  return props.blueprint.methods[0] ?? null
})

const inputTreeData = computed(() => ({
  plugin: {
    name: props.blueprint?.metadata.name ?? 'Plugin',
    handle: props.blueprint?.metadata.handle ?? 'plugin',
    authType: props.blueprint?.auth.type ?? 'none',
  },
  method: method.value
    ? {
        id: method.value.id,
        handle: method.value.handle,
        inputs: method.value.inputs,
        credentials: props.blueprint?.auth.fields ?? [],
        request: method.value.request,
      }
    : {},
}))

const outputTreeData = computed(
  () =>
    props.lastTestResult?.body ?? {
      body: {
        data: {
          id: 'example',
          name: 'Example payload',
        },
      },
  },
)

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return
    activeTab.value = 'config'
    localNodeId.value = props.nodeId ?? ''
    nodeIdError.value = ''
  },
)

watch(
  () => props.nodeId,
  (nodeId) => {
    localNodeId.value = nodeId ?? ''
    nodeIdError.value = ''
  },
  { immediate: true },
)

function toggleSettings() {
  activeTab.value = activeTab.value === 'config' ? 'settings' : 'config'
}

function commitNodeId() {
  const oldId = props.nodeId
  const newId = localNodeId.value.trim()
  nodeIdError.value = ''
  if (!oldId || !newId || newId === oldId) {
    localNodeId.value = oldId ?? ''
    return
  }
  if (props.blueprint?.canvas.nodes[newId]) {
    nodeIdError.value = 'A node with this ID already exists.'
    localNodeId.value = oldId
    return
  }
  emit('renameNode', { oldId, newId })
}

function forwardUpdateNode(nodeId: string, payload: Partial<PluginBlueprintNode>) {
  emit('updateNode', nodeId, payload)
}

function forwardUpdateMethod(methodId: string, payload: Partial<PluginBlueprintMethod>) {
  emit('updateMethod', methodId, payload)
}

function forwardUpdateInput(
  methodId: string,
  inputName: string,
  payload: Partial<PluginBlueprintInput>,
) {
  emit('updateInput', methodId, inputName, payload)
}

function forwardUpdateCredential(
  fieldName: string,
  payload: Partial<PluginBlueprintCredentialField>,
) {
  emit('updateCredential', fieldName, payload)
}

function forwardUpdateRequest(methodId: string, payload: Partial<PluginBlueprintRequest>) {
  emit('updateRequest', methodId, payload)
}
</script>

<style scoped>
.plugin-creator-context-block {
  height: 100%;
  min-height: 0;
}

.plugin-creator-context-block p {
  margin: 0 0 12px;
}

.plugin-creator-node-settings-tab {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 840px;
}

.plugin-creator-node-settings-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 2px;
}

.plugin-creator-node-settings-card + .plugin-creator-node-settings-card {
  padding-top: 20px;
  border-top: 1px solid var(--sailor-border);
}

.plugin-creator-node-settings-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.plugin-creator-node-settings-card__header h3,
.plugin-creator-node-settings-card__header p {
  margin: 0;
}

.plugin-creator-node-settings-card__header h3 {
  color: var(--sailor-text-primary);
  font-size: 14px;
  font-weight: 750;
}

.plugin-creator-node-settings-card__header p {
  margin-top: 6px;
  color: var(--sailor-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.plugin-creator-node-settings-card__header code {
  padding: 1px 5px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 4px;
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
}

.plugin-creator-node-settings-card__eyebrow {
  margin: 0 0 8px !important;
  color: var(--sailor-text-muted) !important;
  font-size: 10px !important;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.plugin-creator-node-settings-card__type {
  flex: 0 0 auto;
  padding: 3px 7px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.plugin-creator-node-settings-card__input {
  font-family: var(--sailor-font-mono);
}

.plugin-creator-node-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
</style>
