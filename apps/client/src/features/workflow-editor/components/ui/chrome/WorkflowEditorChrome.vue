<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { WorkflowItem } from '@/core/types/workflow.types'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import WorkflowChromeHeader from './WorkflowChromeHeader.vue'
import WorkflowChromeMenuBar from './WorkflowChromeMenuBar.vue'
import WorkflowChromeToolbar from './WorkflowChromeToolbar.vue'
import type { WorkflowChromeActionOverrides, WorkflowChromeCommandId } from './workflowChrome.types'

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
  hasExecutionState?: boolean
  gitRepoPath?: string | null
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'add-node'): void
  (e: 'run'): void
  (e: 'stop'): void
  (e: 'clean-execution'): void
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
  (e: 'duplicate-selection'): void
  (e: 'delete-selection'): void
  (e: 'select-all'): void
  (e: 'clear-selection'): void
  (e: 'toggle-autosave', enabled: boolean): void
  (e: 'zoom-in'): void
  (e: 'zoom-out'): void
  (e: 'zoom-reset'): void
  (e: 'fit-view'): void
  (e: 'command-palette'): void
  (e: 'publish'): void
  (e: 'git-create-snapshot'): void
  (e: 'git-refresh-status'): void
  (e: 'git-copy-repo-path'): void
}>()

const route = useRoute()
const headerRef = ref<InstanceType<typeof WorkflowChromeHeader> | null>(null)
const isBusy = computed(() => props.isExecuting || props.isStreaming)
const isUnsavedDraft = computed(() => !route.params.id)
const isWorkflowPublished = computed(
  () => props.workflow?.metadata.isActive === true && props.workflow.metadata.isDraft === false,
)
const publishToolbarLabel = computed(() => (isWorkflowPublished.value ? 'Unpublish' : 'Publish'))
const dynamicMenuOverrides = computed<WorkflowChromeActionOverrides>(() => ({
  'run.publish': {
    label: isWorkflowPublished.value ? 'Unpublish Workflow' : 'Publish Workflow',
    icon: isWorkflowPublished.value ? 'pause' : 'radio',
  },
}))
const disabledMenuReasons = computed<Partial<Record<WorkflowChromeCommandId, string>>>(() => ({
  ...(isUnsavedDraft.value || !props.workflow
    ? { 'run.publish': 'Save workflow before publishing' }
    : {}),
  ...(isUnsavedDraft.value || !props.workflow
    ? {
        'git.create-snapshot': 'Save workflow before creating git snapshots',
        'git.refresh-status': 'Save workflow before checking git status',
      }
    : {}),
  ...(!props.gitRepoPath ? { 'git.copy-repo-path': 'Git repository is not available yet' } : {}),
}))

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
    'edit.duplicate-selection': () => emit('duplicate-selection'),
    'edit.delete-selection': () => emit('delete-selection'),
    'view.zoom-out': () => emit('zoom-out'),
    'view.zoom-in': () => emit('zoom-in'),
    'view.zoom-reset': () => emit('zoom-reset'),
    'view.fit': () => emit('fit-view'),
    'view.logs': () => emit('toggle-logs'),
    'select.all': () => emit('select-all'),
    'select.clear': () => emit('clear-selection'),
    'go.add-node': () => emit('add-node'),
    'go.variables': () => emit('variables'),
    'go.settings': () => emit('settings'),
    'go.command-palette': () => emit('command-palette'),
    'run.workflow': () => emit('run'),
    'run.stop': () => emit('stop'),
    'run.clean-execution': () => emit('clean-execution'),
    'run.publish': () => emit('publish'),
    'git.create-snapshot': () => emit('git-create-snapshot'),
    'git.refresh-status': () => emit('git-refresh-status'),
    'git.copy-repo-path': () => emit('git-copy-repo-path'),
  }

  handlers[id]?.()
}
</script>

<template>
  <section class="wec-shell" aria-label="Workflow editor toolbar">
    <Teleport to="#fabric-topbar-left">
      <WorkflowChromeMenuBar
        :disabled-reasons="disabledMenuReasons"
        :action-overrides="dynamicMenuOverrides"
        @command="handleCommand"
      />
    </Teleport>

    <Teleport to="#fabric-topbar-context">
      <WorkflowChromeHeader
        ref="headerRef"
        variant="topbar"
        :show-meta="false"
        :workflow-name="workflowName"
        :workflow-id="workflowId"
        :workflow="workflow"
        :autosave-status="autosaveStatus"
        :last-autosaved-at="lastAutosavedAt"
        :is-dirty="isDirty"
        :is-busy="isBusy"
        :is-saving="isSaving"
      />
    </Teleport>

    <div class="wec-row wec-toolbar-row">
      <WorkflowChromeToolbar
        :can-undo="canUndo"
        :can-redo="canRedo"
        :is-executing="isExecuting"
        :is-streaming="isStreaming"
        :is-saving="isSaving"
        :is-dirty="isDirty"
        :is-logs-open="isLogsOpen"
        :has-execution-state="hasExecutionState"
        :action-overrides="{
          ...dynamicMenuOverrides,
          'run.publish': {
            ...dynamicMenuOverrides['run.publish'],
            label: publishToolbarLabel,
          },
        }"
        @command="handleCommand"
      />
      <div class="wec-divider" />
      <BaseSwitch
        class="wec-autosave"
        :model-value="!!isAutosaveEnabled"
        :disabled="isBusy || isSaving"
        title="Toggle autosave for this workflow"
        @update:model-value="emit('toggle-autosave', $event)"
      >
        Autosave
      </BaseSwitch>
    </div>
  </section>
</template>
