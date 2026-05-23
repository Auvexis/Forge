<template>
  <nav class="web-page-tree" role="tree">
    <div
      v-for="block in blocks"
      :key="block.id"
      class="web-page-tree__item"
      :class="{ 'web-page-tree__item--selected': block.id === selectedBlockId }"
      draggable="true"
      role="treeitem"
      @dragstart="onDragStart($event, block.id)"
      @click="$emit('select', block.id)"
    >
      <span class="web-page-tree__tag">{{ block.tag }}</span>
      <span class="web-page-tree__name">{{ labelFor(block) }}</span>
    </div>
    <div v-for="block in blocks" :key="`${block.id}-children`" class="web-page-tree__children" role="group">
      <BlockTreePanel
        v-if="block.children?.length"
        :blocks="block.children"
        :selected-block-id="selectedBlockId"
        @select="$emit('select', $event)"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { PageBlock } from '../types/page.types.ts'

defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
}>()

defineEmits<{
  select: [blockId: string]
}>()

function labelFor(block: PageBlock): string {
  return String(block.props?.text ?? block.props?.name ?? block.props?.label ?? block.id)
}

function onDragStart(event: DragEvent, blockId: string) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ blockId }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
</script>
