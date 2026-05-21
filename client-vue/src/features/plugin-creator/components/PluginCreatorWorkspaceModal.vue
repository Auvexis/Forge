<template>
  <BaseModal :is-open="isOpen" max-width="1120px" height="82vh" @close="emit('close')">
    <section class="plugin-creator-workspace-modal">
      <header class="plugin-creator-workspace-modal__header">
        <div>
          <p>Plugin Creator</p>
          <h2>{{ title }}</h2>
        </div>
        <button type="button" aria-label="Close modal" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

      <div class="plugin-creator-workspace-modal__body">
        <PluginCreatorPluginSettings
          v-if="view === 'metadata'"
          :blueprint="blueprint"
          @update-metadata="emit('updateMetadata', $event)"
        />
        <PluginCreatorTestPanel
          v-else-if="view === 'test'"
          :blueprint="blueprint"
          :selected-node-id="selectedNodeId"
          :last-test-result="lastTestResult"
          :is-running="isRunning"
          @test-method="emit('testMethod', $event)"
        />
        <PluginCreatorVersionPanel
          v-else
          :versions="versions"
          :is-loading="isLoading"
          @load="emit('loadVersions')"
          @rollback="emit('rollback', $event)"
        />
      </div>
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
  PluginBlueprintMetadata,
  PluginBlueprintMethod,
  PluginBlueprintNode,
  PluginBlueprintRequest,
  PluginCreatorTestMethodPayload,
  PluginCreatorTestResult,
  PluginCreatorVersionsResult,
} from '@/core/types/plugin-creator.types'
import PluginCreatorPluginSettings from './PluginCreatorPluginSettings.vue'
import PluginCreatorTestPanel from './PluginCreatorTestPanel.vue'
import PluginCreatorVersionPanel from './PluginCreatorVersionPanel.vue'

export type PluginCreatorWorkspaceView = 'metadata' | 'test' | 'versions'

const props = defineProps<{
  isOpen: boolean
  view: PluginCreatorWorkspaceView
  blueprint?: PluginBlueprint | null
  selectedNodeId?: string | null
  lastTestResult?: PluginCreatorTestResult | null
  versions?: PluginCreatorVersionsResult | null
  isRunning?: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  close: []
  updateMetadata: [payload: Partial<PluginBlueprintMetadata>]
  updateNode: [nodeId: string, payload: Partial<PluginBlueprintNode>]
  updateMethod: [methodId: string, payload: Partial<PluginBlueprintMethod>]
  updateInput: [methodId: string, inputName: string, payload: Partial<PluginBlueprintInput>]
  updateCredential: [fieldName: string, payload: Partial<PluginBlueprintCredentialField>]
  updateRequest: [methodId: string, payload: Partial<PluginBlueprintRequest>]
  testMethod: [payload: PluginCreatorTestMethodPayload]
  loadVersions: []
  rollback: [snapshotId: string]
}>()

const title = computed(() => {
  if (props.view === 'test') return 'Test Panel'
  if (props.view === 'versions') return 'Version History'
  return 'Plugin Metadata'
})
</script>

<style scoped>
.plugin-creator-workspace-modal {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.plugin-creator-workspace-modal__header {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--sailor-border-subtle);
}

.plugin-creator-workspace-modal__header p,
.plugin-creator-workspace-modal__header h2 {
  margin: 0;
}

.plugin-creator-workspace-modal__header p {
  color: var(--sailor-text-secondary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.plugin-creator-workspace-modal__header h2 {
  margin-top: 4px;
  color: var(--sailor-text-primary);
  font-size: 18px;
  line-height: 1.2;
}

.plugin-creator-workspace-modal__header button {
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

.plugin-creator-workspace-modal__header button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.plugin-creator-workspace-modal__body {
  min-height: 0;
  flex: 1;
  overflow: auto;
}
</style>
