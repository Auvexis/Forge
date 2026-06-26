<template>
  <BaseCanvas
    v-model:viewport="viewport"
    :items="[]"
    :selection="[]"
    :snap-to-grid="true"
    :grid-size="20"
    :marquee-selection="false"
    background-color="var(--sailor-canvas-bg)"
    pattern-color="var(--sailor-canvas-grid)"
    pattern-style="dot"
    :pattern-size="20"
    class="sailor-workflow-base-canvas"
    :data-workflow-items-count="workflowItemsPreview.length"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseCanvas } from '@/shared/base-canvas/components.ts'
import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import { useWorkflowStore } from '../stores/workflow.store'
import { shouldRenderLegacyTriggerNode } from '../utils/workflowRunTrigger'
import { workflowToBaseCanvasItems } from '../workflow-canvas/workflowCanvasAdapter'

const workflowStore = useWorkflowStore()
const viewport = ref<BaseCanvasViewport>({ x: 0, y: 0, zoom: 1 })

const workflowItemsPreview = computed(() => {
  const workflow = workflowStore.activeWorkflow
  if (!workflow) return []
  return workflowToBaseCanvasItems(workflow, {
    includeLegacyTrigger: shouldRenderLegacyTriggerNode(workflow),
  })
})
</script>

<style scoped>
.sailor-workflow-base-canvas {
  width: 100%;
  height: 100%;
}
</style>
