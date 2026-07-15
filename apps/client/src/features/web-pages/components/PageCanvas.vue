<template>
  <main
    class="web-page-canvas"
    :class="{
      'web-page-canvas--active-tool-cursor': !props.activeTool || props.activeTool === 'cursor',
      'web-page-canvas--active-tool-delete': props.activeTool === 'delete',
      'web-page-canvas--active-tool-pan': props.activeTool === 'pan',
    }"
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
      <div v-if="blocks.length === 0" class="web-page-canvas__empty" @click.stop="handleBodyClick">
        Empty canvas
      </div>
      <TransitionGroup name="web-page-block">
        <div
          v-for="block in blocks"
          :key="block.id"
          class="web-page-block-flow-item"
        >
          <div
            v-if="isDropPlaceholder(block.id, 'before')"
            class="web-page-drop-placeholder"
          />
          <BlockRenderer
            :block="block"
            :selected-block-id="selectedBlockId"
            :selected-block-ids="selectedBlockIds"
            :drop-intent="dropIntent"
            :deleting-block-ids="deletingBlockIds"
            :active-tool="activeTool"
            :canvas-viewport="canvasViewport"
            :canvas-zoom="canvasZoom"
            :readonly="readonly"
            @select="handleBlockSelect"
            @drop-block="$emit('drop-block', $event)"
            @drag-intent="$emit('drag-intent', $event)"
            @duplicate-block="$emit('duplicate-block', $event)"
            @delete-block="$emit('delete-block', $event)"
            @inspect-block="$emit('inspect-block', $event)"
            @open-blueprint="$emit('open-blueprint', $event)"
            @resize-start="suppressBodySelectionAfterResize"
            @resize-end="suppressBodySelectionAfterResize"
            @resize-block="$emit('resize-block', $event)"
            @rename-block="$emit('rename-block', $event)"
            @patch-block="$emit('patch-block', $event)"
          />
          <div
            v-if="isDropPlaceholder(block.id, 'after')"
            class="web-page-drop-placeholder"
          />
        </div>
      </TransitionGroup>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { DropEdge } from '../stores/page-editor.store.ts'
import BlockRenderer from './BlockRenderer.vue'

const props = defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
  selectedBlockIds?: string[]
  dropIntent?: { targetId: string | 'root'; position: InsertPosition; dropEdge?: DropEdge } | null
  deletingBlockIds?: string[]
  bodyStyles?: Record<string, string | number>
  readonly?: boolean
  activeTool?: 'cursor' | 'pan' | 'delete'
  canvasViewport?: BaseCanvasViewport
  canvasZoom?: number
}>()

const emit = defineEmits<{
  select: [payload: { blockId: string; additive?: boolean }]
  'select-body': []
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; preset?: string; draggedId?: string }]
  'drop-root': [payload: { tag?: PageBlockTag; preset?: string; draggedId?: string }]
  'drag-intent': [payload: { targetId: string | 'root'; position: InsertPosition; dropEdge?: DropEdge }]
  'clear-drag-intent': []
  'duplicate-block': [blockId: string]
  'delete-block': [blockId: string]
  'inspect-block': [blockId: string]
  'open-blueprint': [blockId: string]
  'resize-block': [payload: { blockId: string; styles: PageBlock['styles'] }]
  'rename-block': [payload: { blockId: string; nextId: string }]
  'patch-block': [payload: { blockId: string; patch: Partial<PageBlock> }]
}>()
const suppressBodySelectionUntil = ref(0)

const resolvedBodyStyles = computed(() => ({
  width: '100vw',
  height: '100vh',
  minHeight: '100vh',
  margin: '0',
  padding: '0',
  gap: '0',
  ...props.bodyStyles,
  ...(props.bodyStyles?.height ? {} : { height: props.bodyStyles?.minHeight ?? '100vh' }),
  ...(props.bodyStyles?.minHeight ? {} : { minHeight: props.bodyStyles?.height ?? '100vh' }),
}))

function dropOnRoot(event: DragEvent) {
  if (props.readonly) return
  if (event.target !== event.currentTarget && props.blocks.length > 0) return
  const payload = readDragPayload(event)
  if (!payload) return
  emit('drop-root', payload)
  emit('clear-drag-intent')
}

function handleBlockSelect(payload: { blockId: string; additive?: boolean }) {
  if (props.activeTool === 'delete') {
    emit('delete-block', payload.blockId)
    return
  }
  if (props.activeTool === 'pan') return
  emit('select', payload)
}

function handleBodyClick(event: MouseEvent) {
  if (Date.now() < suppressBodySelectionUntil.value) return
  if (props.activeTool === 'pan' || props.activeTool === 'delete') return
  emit('select-body')
}

function suppressBodySelectionAfterResize() {
  suppressBodySelectionUntil.value = Date.now() + 240
}

function isDropPlaceholder(blockId: string, position: InsertPosition) {
  return props.dropIntent?.targetId === blockId && props.dropIntent.position === position
}

function onRootDragOver(event: DragEvent) {
  if (props.readonly) return
  if (event.target !== event.currentTarget && props.blocks.length > 0) return
  emit('drag-intent', { targetId: 'root', position: 'after' })
}

function readDragPayload(event: DragEvent): { tag?: PageBlockTag; preset?: string; draggedId?: string } | null {
  const raw = event.dataTransfer?.getData('application/x-fabric-page-block')
  if (!raw) return null
  const parsed = JSON.parse(raw) as { tag?: PageBlockTag; preset?: string; blockId?: string }
  return { tag: parsed.tag, preset: parsed.preset, draggedId: parsed.blockId }
}
</script>
