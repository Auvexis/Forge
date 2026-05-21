<template>
  <BaseModal :is-open="isOpen" max-width="920px" height="78vh" @close="emit('close')">
    <section class="plugin-creator-node-settings-modal">
      <header class="plugin-creator-node-settings-modal__header">
        <div>
          <p>Plugin Creator</p>
          <h2>{{ title }}</h2>
        </div>
        <button type="button" aria-label="Close modal" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

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
    </section>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import BaseModal from '@/shared/components/base/BaseModal.vue'
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

const props = defineProps<{
  isOpen: boolean
  blueprint?: PluginBlueprint | null
  nodeId?: string | null
  lastTestResult?: PluginCreatorTestResult | null
}>()

const emit = defineEmits<{
  close: []
  updateNode: [nodeId: string, payload: Partial<PluginBlueprintNode>]
  updateMethod: [methodId: string, payload: Partial<PluginBlueprintMethod>]
  updateInput: [methodId: string, inputName: string, payload: Partial<PluginBlueprintInput>]
  updateCredential: [fieldName: string, payload: Partial<PluginBlueprintCredentialField>]
  updateRequest: [methodId: string, payload: Partial<PluginBlueprintRequest>]
}>()

const title = computed(() => {
  const node = props.blueprint && props.nodeId ? props.blueprint.canvas.nodes[props.nodeId] : null
  return node ? String(node.data.name ?? node.data.label ?? node.id) : 'Configure Block'
})

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
.plugin-creator-node-settings-modal {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.plugin-creator-node-settings-modal__header {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--sailor-border-subtle);
}

.plugin-creator-node-settings-modal__header p,
.plugin-creator-node-settings-modal__header h2 {
  margin: 0;
}

.plugin-creator-node-settings-modal__header p {
  color: var(--sailor-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.plugin-creator-node-settings-modal__header h2 {
  margin-top: 4px;
  color: var(--sailor-text-primary);
  font-size: 18px;
  line-height: 1.2;
}

.plugin-creator-node-settings-modal__header button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
}

.plugin-creator-node-settings-modal__header button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}
</style>
