<template>
  <AppDock>
    <!-- ── Left: Brand badge + Workflow name + status ── -->
    <template #left>
      <div class="wed-brand">
        <!-- Icon tile -->
        <div class="wed-brand__icon">
          <LucideIcon name="workflow" :size="14" />
        </div>

        <!-- Name + status row -->
        <div class="wed-brand__meta">
          <!-- Workflow name → opens dropdown -->
          <AppDropdownMenu position="bottom-start" :offset="17">
            <template #trigger>
              <div class="wed-name-wrap">
                <span class="wed-name">{{ workflowName }}</span>
                <LucideIcon name="chevron-down" :size="12" class="wed-name__chevron" />
              </div>
            </template>

            <AppDropdownItem icon="download" :danger="false" @click="$emit('export-workflow')">
              Export workflow
            </AppDropdownItem>

            <!-- "Close workflow" action -->
            <AppDropdownItem icon="x" :danger="false" @click="$emit('close')">
              Close workflow
            </AppDropdownItem>
          </AppDropdownMenu>

          <!-- Status / ID sub-row -->
          <div class="wed-status-row">
            <span
              class="wed-status-dot"
              :class="{
                'wed-status-dot--streaming': isStreaming,
                'wed-status-dot--dirty': isDirty && !isStreaming,
              }"
            />
            <span class="wed-status-text">
              <template v-if="isStreaming">Running</template>
              <template v-else-if="isDirty">Unsaved changes</template>
              <template v-else>{{ workflowId?.slice(0, 14) }}</template>
            </span>
          </div>
        </div>
      </div>

      <!-- Section divider -->
      <div class="wed-divider-v" />
    </template>

    <!-- ── Right: All action buttons ── -->
    <template #right>
      <!-- Add Node -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="plus"
        :disabled="isBusy"
        @click="$emit('add-node')"
      >
        Add Node
      </BaseButton>

      <!-- Settings -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="settings"
        :disabled="isBusy"
        title="Workflow settings"
        @click="$emit('settings')"
      />

      <div class="wed-divider-v" />

      <!-- Logs -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="scroll-text"
        :class="{ 'wed-btn--active': isLogsOpen }"
        @click="$emit('toggle-logs')"
      >
        Logs
      </BaseButton>

      <!-- Stop (shown while streaming) -->
      <BaseButton
        v-if="isStreaming"
        size="sm"
        variant="danger"
        icon-left="square"
        @click="$emit('stop')"
      >
        Stop
      </BaseButton>

      <!-- Run -->
      <BaseButton
        v-else
        size="sm"
        variant="ghost"
        :disabled="isExecuting"
        :loading="isExecuting"
        icon-left="play"
        class="wed-btn--run"
        @click="$emit('run')"
      >
        Run
      </BaseButton>

      <div class="wed-divider-v" />

      <!-- Save -->
      <BaseButton
        size="sm"
        :variant="isDirty ? 'primary' : 'ghost'"
        :disabled="isSaving || !isDirty || isBusy"
        :loading="isSaving"
        icon-left="save"
        @click="$emit('save')"
      >
        {{ isSaving ? 'Saving…' : 'Save' }}
      </BaseButton>

      <div class="wed-divider-v" />

      <!-- Publish/Unpublish -->
      <WorkflowPublishButton
        v-if="workflow"
        :workflow="workflow"
        @updated="$emit('workflow-updated', $event)"
      />

      <!-- Close -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="x"
        title="Close editor"
        class="wed-btn--close"
        @click="$emit('close')"
      />
    </template>
  </AppDock>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppDock from '@/shared/components/layout/AppDock.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import WorkflowPublishButton from './WorkflowPublishButton.vue'
import type { WorkflowItem } from '@/core/types/workflow.types'

// ── Props ─────────────────────────────────────────────────────────────────

const props = defineProps<{
  workflowName: string
  workflowId: string
  workflow?: WorkflowItem
  isSaving?: boolean
  isExecuting?: boolean
  isStreaming?: boolean
  isLogsOpen?: boolean
  isDirty?: boolean
}>()

// ── Emits ─────────────────────────────────────────────────────────────────

defineEmits<{
  (e: 'run'): void
  (e: 'stop'): void
  (e: 'add-node'): void
  (e: 'save'): void
  (e: 'settings'): void
  (e: 'toggle-logs'): void
  (e: 'close'): void
  (e: 'export-workflow'): void
  (e: 'workflow-updated', workflow: WorkflowItem): void
}>()


// ── Derived ───────────────────────────────────────────────────────────────

const isBusy = computed(() => props.isExecuting || props.isStreaming)
</script>

<style scoped>
/* ── Brand area ──────────────────────────────────────────────────────────── */
.wed-brand {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.wed-brand__icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nod8-radius-sm);
  background-color: var(--nod8-bg-overlay);
  border: 1px solid var(--nod8-border);
  color: var(--nod8-text-secondary);
  flex-shrink: 0;
}

.wed-brand__meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

/* ── Workflow name trigger ────────────────────────────────────────────────── */
.wed-name-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.wed-name {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
  line-height: 1;
  white-space: nowrap;
}

.wed-name__chevron {
  color: var(--nod8-text-muted);
  flex-shrink: 0;
}

/* ── Status row ──────────────────────────────────────────────────────────── */
.wed-status-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-left: 2px;
}

.wed-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--nod8-text-muted);
  flex-shrink: 0;
  opacity: 0.5;
  transition: background-color var(--nod8-duration-fast) var(--nod8-ease-standard);
}

.wed-status-dot--streaming {
  background-color: #10b981;
  opacity: 1;
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.wed-status-dot--dirty {
  background-color: #f59e0b;
  opacity: 1;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.wed-status-text {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-family: monospace;
  line-height: 1;
}

/* ── Vertical divider ────────────────────────────────────────────────────── */
.wed-divider-v {
  width: 1px;
  height: 16px;
  background-color: var(--nod8-border);
  flex-shrink: 0;
}

/* ── Button state modifiers ──────────────────────────────────────────────── */
.wed-btn--active {
  background-color: var(--nod8-accent-subtle) !important;
  color: var(--nod8-text-primary) !important;
}

.wed-btn--run:hover {
  color: #10b981 !important;
  background-color: rgba(16, 185, 129, 0.1) !important;
}

.wed-btn--close:hover {
  color: var(--nod8-red-500) !important;
  background-color: rgba(239, 68, 68, 0.1) !important;
}
</style>
