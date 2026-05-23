<template>
  <main class="web-page-canvas">
    <section
      class="web-page-canvas__body"
      :style="bodyStyles"
      @dragover.prevent
      @drop="dropOnRoot"
    >
      <div v-if="blocks.length === 0" class="web-page-canvas__empty">
        Empty canvas
      </div>
      <BlockRenderer
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :selected-block-id="selectedBlockId"
        @select="$emit('select', $event)"
        @drop-block="$emit('drop-block', $event)"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import BlockRenderer from './BlockRenderer.vue'

const props = defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
  bodyStyles?: Record<string, string | number>
}>()

const emit = defineEmits<{
  select: [blockId: string]
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; draggedId?: string }]
  'drop-root': [payload: { tag?: PageBlockTag; draggedId?: string }]
}>()

function dropOnRoot(event: DragEvent) {
  if (event.target !== event.currentTarget && props.blocks.length > 0) return
  const payload = readDragPayload(event)
  if (!payload) return
  emit('drop-root', payload)
}

function readDragPayload(event: DragEvent): { tag?: PageBlockTag; draggedId?: string } | null {
  const raw = event.dataTransfer?.getData('application/x-sailor-page-block')
  if (!raw) return null
  const parsed = JSON.parse(raw) as { tag?: PageBlockTag; blockId?: string }
  return { tag: parsed.tag, draggedId: parsed.blockId }
}
</script>
