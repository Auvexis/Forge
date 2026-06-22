<template>
  <main
    class="web-page-canvas"
    :class="{
      'web-page-canvas--active-tool-cursor': !props.activeTool || props.activeTool === 'cursor',
      'web-page-canvas--active-tool-delete': props.activeTool === 'delete',
      'web-page-canvas--active-tool-pan': props.activeTool === 'pan',
    }"
    @pointerdown.stop
  >
    <section
      class="web-page-canvas__body"
      :style="resolvedBodyStyles"
      @click.self="handleBodyClick"
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
      <TransitionGroup name="web-page-block">
        <BlockRenderer
          v-for="block in blocks"
          :key="block.id"
          :block="block"
          :selected-block-id="selectedBlockId"
          :drop-intent="dropIntent"
          :deleting-block-ids="deletingBlockIds"
          :active-tool="activeTool"
          :readonly="readonly"
          @select="handleBlockSelect"
          @drop-block="$emit('drop-block', $event)"
          @drag-intent="$emit('drag-intent', $event)"
          @duplicate-block="$emit('duplicate-block', $event)"
          @delete-block="$emit('delete-block', $event)"
          @inspect-block="$emit('inspect-block', $event)"
          @resize-block="$emit('resize-block', $event)"
          @rename-block="$emit('rename-block', $event)"
          @patch-block="$emit('patch-block', $event)"
        />
      </TransitionGroup>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { DropEdge } from '../stores/page-editor.store.ts'
import BlockRenderer from './BlockRenderer.vue'

const props = defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
  dropIntent?: { targetId: string | 'root'; position: InsertPosition; dropEdge?: DropEdge } | null
  deletingBlockIds?: string[]
  bodyStyles?: Record<string, string | number>
  readonly?: boolean
  activeTool?: 'cursor' | 'pan' | 'delete'
}>()

const emit = defineEmits<{
  select: [blockId: string]
  'select-body': []
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; preset?: string; draggedId?: string }]
  'drop-root': [payload: { tag?: PageBlockTag; preset?: string; draggedId?: string }]
  'drag-intent': [payload: { targetId: string | 'root'; position: InsertPosition; dropEdge?: DropEdge }]
  'clear-drag-intent': []
  'duplicate-block': [blockId: string]
  'delete-block': [blockId: string]
  'inspect-block': [blockId: string]
  'resize-block': [payload: { blockId: string; styles: PageBlock['styles'] }]
  'rename-block': [payload: { blockId: string; nextId: string }]
  'patch-block': [payload: { blockId: string; patch: Partial<PageBlock> }]
}>()

const resolvedBodyStyles = computed(() => ({
  ...normalizeEditorBodyStyles({
    width: '100vw',
    minHeight: '100vh',
    margin: '0',
    padding: '0',
    gap: '0',
    ...props.bodyStyles,
  }),
}))

function normalizeEditorBodyStyles(styles: Record<string, string | number>) {
  if (styles.width === '100vw') return { ...styles, width: '960px' }
  return styles
}

function dropOnRoot(event: DragEvent) {
  if (props.readonly) return
  if (event.target !== event.currentTarget && props.blocks.length > 0) return
  const payload = readDragPayload(event)
  if (!payload) return
  emit('drop-root', payload)
  emit('clear-drag-intent')
}

function handleBlockSelect(blockId: string) {
  if (props.activeTool === 'delete') {
    emit('delete-block', blockId)
    return
  }
  if (props.activeTool === 'pan') return
  emit('select', blockId)
}

function handleBodyClick() {
  if (props.activeTool === 'pan' || props.activeTool === 'delete') return
  emit('select-body')
}

function onRootDragOver(event: DragEvent) {
  if (props.readonly) return
  if (event.target !== event.currentTarget && props.blocks.length > 0) return
  emit('drag-intent', { targetId: 'root', position: 'after' })
}

function readDragPayload(event: DragEvent): { tag?: PageBlockTag; preset?: string; draggedId?: string } | null {
  const raw = event.dataTransfer?.getData('application/x-sailor-page-block')
  if (!raw) return null
  const parsed = JSON.parse(raw) as { tag?: PageBlockTag; preset?: string; blockId?: string }
  return { tag: parsed.tag, preset: parsed.preset, draggedId: parsed.blockId }
}
</script>
