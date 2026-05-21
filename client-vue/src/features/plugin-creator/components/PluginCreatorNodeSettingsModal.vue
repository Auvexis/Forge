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
            CONFIGURATION
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
            <BaseButton variant="ghost" size="sm" icon-left="x" title="Close" @click="emit('close')">
              Close
            </BaseButton>
          </div>
        </div>

        <div class="inspector-pane-content relative overflow-y-auto">
          <PluginCreatorNodeSettingsPanel
            :blueprint="blueprint"
            :node-id="nodeId"
            :last-test-result="lastTestResult"
            @update-node="forwardUpdateNode"
            @update-method="forwardUpdateMethod"
            @update-input="forwardUpdateInput"
            @update-credential="forwardUpdateCredential"
            @update-request="forwardUpdateRequest"
          />
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
import { computed } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
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
  updateMethod: [methodId: string, payload: Partial<PluginBlueprintMethod>]
  updateInput: [methodId: string, inputName: string, payload: Partial<PluginBlueprintInput>]
  updateCredential: [fieldName: string, payload: Partial<PluginBlueprintCredentialField>]
  updateRequest: [methodId: string, payload: Partial<PluginBlueprintRequest>]
}>()

const node = computed(() =>
  props.blueprint && props.nodeId ? props.blueprint.canvas.nodes[props.nodeId] : null,
)

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
</style>
