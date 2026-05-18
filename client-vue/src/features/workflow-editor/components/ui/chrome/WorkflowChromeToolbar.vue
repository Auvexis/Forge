<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { workflowChromeToolbarGroups } from './workflowChromeActions'
import type { WorkflowChromeActionOverrides, WorkflowChromeCommandId } from './workflowChrome.types'

const props = defineProps<{
  canUndo?: boolean
  canRedo?: boolean
  isExecuting?: boolean
  isStreaming?: boolean
  isSaving?: boolean
  isDirty?: boolean
  isLogsOpen?: boolean
  hasExecutionState?: boolean
  actionOverrides?: WorkflowChromeActionOverrides
}>()

const emit = defineEmits<{
  (e: 'command', id: WorkflowChromeCommandId): void
}>()

function isDisabled(id: WorkflowChromeCommandId) {
  if (id === 'edit.undo') return !props.canUndo || props.isExecuting || props.isStreaming
  if (id === 'edit.redo') return !props.canRedo || props.isExecuting || props.isStreaming
  if (id === 'run.workflow') return props.isExecuting === true
  if (id === 'run.stop') return props.isStreaming !== true
  if (id === 'run.clean-execution') {
    return props.isExecuting || props.isStreaming || !props.hasExecutionState
  }
  if (id === 'run.publish') return props.isSaving || props.isExecuting || props.isStreaming
  if (id === 'file.save') return props.isSaving || !props.isDirty || props.isExecuting || props.isStreaming
  return false
}

function isVisible(id: WorkflowChromeCommandId) {
  if (id === 'run.workflow') return !props.isStreaming
  if (id === 'run.stop') return props.isStreaming
  return true
}

function isActive(id: WorkflowChromeCommandId) {
  return id === 'view.logs' && props.isLogsOpen
}

function showsLabel(id: WorkflowChromeCommandId, kind?: string) {
  return kind === 'primary' || id === 'go.add-node' || id === 'file.save' || id === 'run.publish'
}

function actionLabel(action: { id: WorkflowChromeCommandId; label: string }) {
  return props.actionOverrides?.[action.id]?.label ?? action.label
}

function actionIcon(action: { id: WorkflowChromeCommandId; icon: string }) {
  return props.actionOverrides?.[action.id]?.icon ?? action.icon
}
</script>

<template>
  <div class="wec-row wec-toolbar">
    <template v-for="(group, groupIndex) in workflowChromeToolbarGroups" :key="group.id">
      <div v-if="groupIndex > 0" class="wec-divider" />
      <div class="wec-group">
        <button
          v-for="action in group.actions.filter((item) => isVisible(item.id))"
          :key="action.id"
          type="button"
          class="wec-control"
          :class="{
            'wec-control--primary': action.kind === 'primary',
            'wec-control--danger': action.kind === 'danger',
            'wec-control--active': isActive(action.id),
          }"
          :disabled="isDisabled(action.id)"
          :title="actionLabel(action)"
          @click="emit('command', action.id)"
        >
          <span
            v-if="action.id === 'file.save'"
            class="wec-save-dot"
            :class="{
              'wec-save-dot--dirty': isDirty,
              'wec-save-dot--saving': isSaving,
            }"
            aria-hidden="true"
          />
          <LucideIcon v-else :name="actionIcon(action)" :size="15" />
          <span v-if="showsLabel(action.id, action.kind)">{{ actionLabel(action) }}</span>
        </button>
      </div>
    </template>
  </div>
</template>
