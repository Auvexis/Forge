<template>
  <div
    class="sailor-workflow-base-canvas__node"
    @dblclick.stop="$emit('open-inspector', item)"
  >
    <component
      :is="component"
      v-if="component"
      :id="item.id"
      :type="nodeType"
      :data="item.data"
      :selected="selected"
      :status="status"
      :has-outgoing-connection="hasOutgoingConnection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, type Component } from 'vue'
import type { BaseCanvasItem } from '@/shared/base-canvas/index.ts'
import { workflowCanvasNodeIdKey } from '../workflow-canvas/workflowCanvasHandles'

const props = defineProps<{
  item: BaseCanvasItem
  component?: Component
  selected: boolean
  status: string
  hasOutgoingConnection: boolean
}>()

defineEmits<{
  'open-inspector': [item: BaseCanvasItem]
}>()

provide(workflowCanvasNodeIdKey, props.item.id)

const nodeType = computed(() => {
  if (props.item.id === 'trigger') return 'trigger'
  return String((props.item.data as { type?: string } | undefined)?.type ?? '')
})
</script>

<style scoped>
.sailor-workflow-base-canvas__node {
  position: relative;
}
</style>
