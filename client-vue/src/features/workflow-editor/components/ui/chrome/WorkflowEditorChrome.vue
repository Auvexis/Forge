<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { WorkflowItem } from '@/core/types/workflow.types'
import WorkflowChromeHeader from './WorkflowChromeHeader.vue'
import WorkflowChromeMenuBar from './WorkflowChromeMenuBar.vue'
import WorkflowChromeToolbar from './WorkflowChromeToolbar.vue'
import type { WorkflowChromeCommandId } from './workflowChrome.types'

const props = defineProps<{
  workflowName: string
  workflowId: string
  workflow?: WorkflowItem
  isSaving?: boolean
  isExecuting?: boolean
  isStreaming?: boolean
  isLogsOpen?: boolean
  isDirty?: boolean
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error' | 'conflict'
  lastAutosavedAt?: number | null
  isAutosaveEnabled?: boolean
  canUndo?: boolean
  canRedo?: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'add-node'): void
  (e: 'run'): void
  (e: 'stop'): void
  (e: 'export-workflow'): void
  (e: 'import-workflow'): void
  (e: 'create-workflow'): void
  (e: 'toggle-logs'): void
  (e: 'variables'): void
  (e: 'settings'): void
  (e: 'close'): void
  (e: 'workflow-updated', workflow: WorkflowItem): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'toggle-autosave', enabled: boolean): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'zoom-reset'): void
  (e: 'fit-view'): void
}>()

const route = useRoute()
const headerRef = ref<InstanceType<typeof WorkflowChromeHeader> | null>(null)
const isBusy = computed(() => props.isExecuting || props.isStreaming)
const isUnsavedDraft = computed(() => !route.params.id)

function handleCommand(id: WorkflowChromeCommandId) {
  const handlers: Partial<Record<WorkflowChromeCommandId, () => void>> = {
    'file.new': () => emit('create-workflow'),
    'file.open': () => window.setTimeout(() => headerRef.value?.openWorkflowMenu(), 0),
    'file.import': () => emit('import-workflow'),
    'file.export': () => emit('export-workflow'),
    'file.save': () => emit('save'),
    'file.close': () => emit('close'),
    'edit.undo': () => emit('undo'),
    'edit.redo': () => emit('redo'),
    'view.zoom-out': () => emit('zoom-out'),
    'view.zoom-in': () => emit('zoom-in'),
    'view.zoom-reset': () => emit('zoom-reset'),
    'view.fit': () => emit('fit-view'),
    'view.logs': () => emit('toggle-logs'),
    'go.add-node': () => emit('add-node'),
    'go.variables': () => emit('variables'),
    'go.settings': () => emit('settings'),
    'run.workflow': () => emit('run'),
    'run.stop': () => emit('stop'),
  }

  handlers[id]?.()
}
</script>

<template>
  <section class="wec-shell" aria-label="Workflow editor toolbar">
    <WorkflowChromeHeader
      ref="headerRef"
      :workflow-name="workflowName"
      :workflow-id="workflowId"
      :workflow="workflow"
      :autosave-status="autosaveStatus"
      :last-autosaved-at="lastAutosavedAt"
      :is-dirty="isDirty"
      :is-autosave-enabled="isAutosaveEnabled"
      :is-busy="isBusy"
      :is-saving="isSaving"
      :is-unsaved-draft="isUnsavedDraft"
      @toggle-autosave="emit('toggle-autosave', $event)"
      @workflow-updated="emit('workflow-updated', $event)"
    />

    <div class="wec-row wec-toolbar-row">
      <WorkflowChromeMenuBar @command="handleCommand" />
      <div class="wec-divider" />
      <WorkflowChromeToolbar
        :can-undo="canUndo"
        :can-redo="canRedo"
        :is-executing="isExecuting"
        :is-streaming="isStreaming"
        :is-saving="isSaving"
        :is-dirty="isDirty"
        :is-logs-open="isLogsOpen"
        @command="handleCommand"
      />
    </div>
  </section>
</template>
