<template>
  <component
    :is="renderTag"
    class="web-page-block"
    :class="blockClasses"
    draggable="true"
    @click.stop="$emit('select', block.id)"
    @dragstart.stop="onDragStart"
    @dragover.prevent.stop="onDragOver"
    @drop.prevent.stop="onDrop"
  >
    <span
      v-if="dropIntent?.targetId === block.id && dropIntent.position !== 'inside'"
      class="web-page-drop-indicator"
      :class="`web-page-drop-indicator--${dropIntent.position}`"
    />
    <template v-if="block.tag === 'text' || block.tag === 'button' || block.tag === 'link'">
      {{ block.props?.text ?? block.tag }}
    </template>
    <template v-else-if="block.tag === 'image'">
      <span>{{ block.props?.alt || 'Image' }}</span>
    </template>
    <template v-else-if="block.tag === 'input'">
      <span>{{ block.props?.label || block.props?.name || 'Input' }}</span>
    </template>
    <BlockRenderer
      v-for="child in block.children ?? []"
      :key="child.id"
      :block="child"
      :selected-block-id="selectedBlockId"
      :drop-intent="dropIntent"
      @select="$emit('select', $event)"
      @drop-block="$emit('drop-block', $event)"
      @drag-intent="$emit('drag-intent', $event)"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'

const props = defineProps<{
  block: PageBlock
  selectedBlockId: string | null
  dropIntent?: { targetId: string; position: InsertPosition } | null
}>()

const emit = defineEmits<{
  select: [blockId: string]
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; draggedId?: string }]
  'drag-intent': [payload: { targetId: string; position: InsertPosition }]
}>()

const isContainer = computed(() =>
  ['header', 'section', 'div', 'footer', 'form'].includes(props.block.tag),
)

const renderTag = computed(() => {
  if (props.block.tag === 'text') return 'span'
  if (props.block.tag === 'image') return 'div'
  if (props.block.tag === 'link') return 'a'
  return props.block.tag
})

const blockClasses = computed(() => ({
  'web-page-block--selected': props.selectedBlockId === props.block.id,
  'web-page-block--drop-before': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'before',
  'web-page-block--drop-after': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'after',
  'web-page-block--drop-inside': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'inside',
}))

function onDragStart(event: DragEvent) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ blockId: props.block.id }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDrop(event: DragEvent) {
  const payload = readDragPayload(event)
  if (!payload) return
  emit('drop-block', { targetId: props.block.id, position: dropPosition(event), ...payload })
}

function onDragOver(event: DragEvent) {
  emit('drag-intent', { targetId: props.block.id, position: dropPosition(event) })
}

function dropPosition(event: DragEvent): InsertPosition {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (event.clientY - rect.top) / rect.height
  if (ratio < 0.25) return 'before'
  if (ratio > 0.75) return 'after'
  return isContainer.value ? 'inside' : 'after'
}

function readDragPayload(event: DragEvent): { tag?: PageBlockTag; draggedId?: string } | null {
  const raw = event.dataTransfer?.getData('application/x-sailor-page-block')
  if (!raw) return null
  const parsed = JSON.parse(raw) as { tag?: PageBlockTag; blockId?: string }
  return { tag: parsed.tag, draggedId: parsed.blockId }
}
</script>
