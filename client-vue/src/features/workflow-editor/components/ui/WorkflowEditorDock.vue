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
          <AppDropdownMenu position="bottom-start" :offset="3">
            <template #trigger>
              <div class="flex flex-col gap-1">
                <div class="wed-name-wrap">
                  <span class="wed-name">{{ workflowName }}</span>
                  <LucideIcon name="chevron-down" :size="12" class="wed-name__chevron" />
                </div>

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
                    <template v-else-if="isDirty">Unsaved Changes</template>
                    <template v-else>{{ workflowId?.slice(0, 14) }}</template>
                  </span>
                </div>
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
