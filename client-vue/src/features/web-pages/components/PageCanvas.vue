<template>
  <main class="web-page-canvas">
    <section
      class="web-page-canvas__body"
      :style="bodyStyles"
      @click.self="$emit('select-body')"
      @dragover.prevent="onRootDragOver"
      @dragleave="$emit('clear-drag-intent')"
      @drop="dropOnRoot"
    >
      <span
        v-if="dropIntent?.targetId === 'root'"
        class="web-page-drop-indicator web-page-drop-indicator--root"
      />
      <div v-if="blocks.length === 0" class="web-page-canvas__empty">
        Empty canvas
      </div>
      <BlockRenderer
        v-for="block in blocks"
        :key="block.id"
        :block="block"
        :selected-block-id="selectedBlockId"
        :drop-intent="dropIntent"
        :readonly="readonly"
        @select="$emit('select', $event)"
        @drop-block="$emit('drop-block', $event)"
        @drag-intent="$emit('drag-intent', $event)"
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
  dropIntent?: { targetId: string | 'root'; position: InsertPosition } | null
  bodyStyles?: Record<string, string | number>
  readonly?: boolean
}>()

const emit = defineEmits<{
  select: [blockId: string]
  'select-body': []
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; draggedId?: string }]
  'drop-root': [payload: { tag?: PageBlockTag; draggedId?: string }]
  'drag-intent': [payload: { targetId: string | 'root'; position: InsertPosition }]
  'clear-drag-intent': []
}>()

function dropOnRoot(event: DragEvent) {
  if (props.readonly) return
  if (event.target !== event.currentTarget && props.blocks.length > 0) return
  const payload = readDragPayload(event)
  if (!payload) return
  emit('drop-root', payload)
  emit('clear-drag-intent')
}

function onRootDragOver(event: DragEvent) {
  if (props.readonly) return
  if (event.target !== event.currentTarget && props.blocks.length > 0) return
  emit('drag-intent', { targetId: 'root', position: 'after' })
}

function readDragPayload(event: DragEvent): { tag?: PageBlockTag; draggedId?: string } | null {
  const raw = event.dataTransfer?.getData('application/x-sailor-page-block')
  if (!raw) return null
  const parsed = JSON.parse(raw) as { tag?: PageBlockTag; blockId?: string }
  return { tag: parsed.tag, draggedId: parsed.blockId }
}
</script>
