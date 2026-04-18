<template>
  <Panel position="bottom-center" class="mb-6 z-50">
    <div class="dock-container">
      <!-- ── Run / Stop ── -->
      <BaseButton
        v-if="isStreaming"
        size="sm"
        variant="danger"
        class="dock-btn"
        icon-left="square"
        @click="$emit('stop')"
      >
        Stop
      </BaseButton>

      <BaseButton
        v-else
        size="sm"
        variant="ghost"
        :disabled="isExecuting"
        :loading="isExecuting"
        icon-left="play"
        class="dock-btn"
        :class="{ 'opacity-60 cursor-not-allowed': isExecuting }"
        @click="$emit('run')"
      >
        Run
      </BaseButton>

      <!-- ── Add Node ── -->
      <BaseButton
        size="sm"
        variant="ghost"
        :disabled="isStreaming"
        icon-left="plus"
        class="dock-btn"
        :class="{ 'opacity-60 cursor-not-allowed': isStreaming }"
        @click="$emit('add-node')"
      >
        Node
      </BaseButton>

      <!-- ── Save ── -->
      <BaseButton
        size="sm"
        variant="ghost"
        :disabled="isSaving || !workflowStore.isDirty || isStreaming"
        :loading="isSaving"
        icon-left="save"
        class="dock-btn"
        :class="{
          'opacity-60 cursor-not-allowed': isSaving || !workflowStore.isDirty || isStreaming,
        }"
        @click="$emit('save')"
      >
        {{ isSaving ? 'Saving…' : 'Save' }}
      </BaseButton>

      <!-- ── Logs ── -->
      <BaseButton
        size="sm"
        variant="ghost"
        icon-left="scroll-text"
        class="dock-btn"
        :class="{ 'dock-btn--active': isLogsOpen }"
        @click="$emit('toggle-logs')"
      >
        Logs
      </BaseButton>

      <div :style="{ height: '24px', width: '1.5px', backgroundColor: 'var(--nod8-border)' }"></div>

      <!-- ── Custom Zoom Slider ── -->
      <div
        v-if="viewport"
        class="flex flex-center gap-2"
        :style="{ padding: '0 var(--nod8-space-1)' }"
      >
        <BaseButton
          size="sm"
          variant="ghost"
          class="text-muted-foreground"
          @click="zoomOut({ duration: 300 })"
        >
          <LucideIcon name="minus" :size="14" />
        </BaseButton>

        <input
          type="range"
          class="zoom-slider-input"
          :min="minZoom"
          :max="maxZoom"
          step="0.01"
          :value="viewport.zoom"
          @input="onSliderChange"
        />

        <BaseButton size="sm" variant="ghost" @click="zoomIn({ duration: 300 })">
          <LucideIcon name="plus" :size="14" />
        </BaseButton>

        <BaseButton
          variant="ghost"
          size="sm"
          @click="zoomTo(1, { duration: 300 })"
          :style="{ width: '40px' }"
        >
          {{ (100 * viewport.zoom).toFixed(0) }}%
        </BaseButton>

        <BaseButton
          size="sm"
          variant="ghost"
          class="text-muted-foreground"
          @click="fitView({ duration: 300 })"
        >
          <LucideIcon name="maximize" :size="12" />
        </BaseButton>
      </div>
    </div>
  </Panel>
</template>

<script setup lang="ts">
import { Panel, useVueFlow } from '@vue-flow/core'
import { useWorkflowStore } from '@/features/workflow-editor/stores/workflow.store'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  isSaving?: boolean
  isExecuting?: boolean
  isStreaming?: boolean
  isLogsOpen?: boolean
}>()

defineEmits<{
  (e: 'run'): void
  (e: 'stop'): void
  (e: 'add-node'): void
  (e: 'import'): void
  (e: 'save'): void
  (e: 'toggle-logs'): void
}>()

const workflowStore = useWorkflowStore()
const { zoomIn, zoomOut, zoomTo, fitView, viewport, minZoom, maxZoom } = useVueFlow()

const onSliderChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  zoomTo(Number(target.value))
}
</script>

<style scoped>
.dock-container {
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: var(--nod8-space-2);
  border-radius: var(--nod8-radius-sm);
}

.dock-btn--active {
  background-color: var(--nod8-accent-subtle) !important;
  color: var(--nod8-text-primary) !important;
}

.text-primary {
  color: var(--nod8-text-primary);
}

.text-muted-foreground {
  color: var(--nod8-text-muted);
}

/* Customizações do Input Type Range (Zoom Slider) */
.zoom-slider-input {
  width: 100px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.zoom-slider-input:focus {
  outline: none;
}

/* Chrome / Safari / Edge */
.zoom-slider-input::-webkit-slider-runnable-track {
  height: 4px;
  background: var(--nod8-border);
  border-radius: var(--nod8-radius-full);
}

.zoom-slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 12px;
  width: 12px;
  background: var(--nod8-text-primary);
  border-radius: 50%;
  margin-top: -4px; /* (Track Height / 2) - (Thumb Height / 2) */
  box-shadow: var(--nod8-shadow-sm);
  transition: transform 0.1s;
}

.zoom-slider-input::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Firefox */
.zoom-slider-input::-moz-range-track {
  height: 4px;
  background: var(--nod8-border);
  border-radius: var(--nod8-radius-full);
}

.zoom-slider-input::-moz-range-thumb {
  border: none;
  height: 12px;
  width: 12px;
  background: var(--nod8-text-primary);
  border-radius: 50%;
  box-shadow: var(--nod8-shadow-sm);
  transition: transform 0.1s;
}

.zoom-slider-input::-moz-range-thumb:hover {
  transform: scale(1.2);
}
</style>
