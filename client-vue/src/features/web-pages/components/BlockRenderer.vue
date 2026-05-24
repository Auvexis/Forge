<template>
  <div
    class="web-page-block-frame"
    :class="{ 'web-page-block-frame--selected': selectedBlockId === block.id }"
  >
    <div v-if="!readonly" class="web-page-block-toolbar" @click.stop>
      <BaseButton variant="ghost" size="sm" icon-left="copy" @click="$emit('duplicate-block', block.id)">
        Duplicate
      </BaseButton>
      <BaseButton variant="ghost" size="sm" icon-left="trash-2" @click="$emit('delete-block', block.id)">
        Delete
      </BaseButton>
    </div>
    <component
      :is="renderTag"
      v-bind="blockAttributes"
      :id="block.elementId || undefined"
      class="web-page-block"
      :class="blockClasses"
      :style="block.styles"
      draggable="true"
      tabindex="0"
      @click.stop="$emit('select', block.id)"
      @dblclick.stop="$emit('inspect-block', block.id)"
      @focus="$emit('select', block.id)"
      @dragstart.stop="onDragStart"
      @dragover.prevent.stop="onDragOver"
      @drop.prevent.stop="onDrop"
    >
      <span
        v-if="dropIntent?.targetId === block.id && dropIntent.position !== 'inside'"
        class="web-page-drop-indicator"
        :class="`web-page-drop-indicator--${dropIntent.position}`"
      />
      <span
        v-if="dropIntent?.targetId === block.id"
        class="web-page-drop-arrow"
        :class="`web-page-drop-arrow--${dropIntent.dropEdge ?? 'center'}`"
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
      <template v-else-if="(block.children ?? []).length === 0">
        <span class="web-page-block__placeholder">{{ block.props?.label ?? block.tag }}</span>
      </template>
      <BlockRenderer
        v-for="child in block.children ?? []"
        :key="child.id"
        :block="child"
        :selected-block-id="selectedBlockId"
        :drop-intent="dropIntent"
        :readonly="readonly"
        @select="$emit('select', $event)"
        @drop-block="$emit('drop-block', $event)"
        @drag-intent="$emit('drag-intent', $event)"
        @duplicate-block="$emit('duplicate-block', $event)"
        @delete-block="$emit('delete-block', $event)"
        @inspect-block="$emit('inspect-block', $event)"
      />
    </component>
    <style v-if="block.customCss">{{ customCssRule }}</style>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { DropEdge } from '../stores/page-editor.store.ts'

const props = defineProps<{
  block: PageBlock
  selectedBlockId: string | null
  dropIntent?: { targetId: string; position: InsertPosition; dropEdge?: DropEdge } | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  select: [blockId: string]
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; draggedId?: string }]
  'drag-intent': [payload: { targetId: string; position: InsertPosition; dropEdge?: DropEdge }]
  'duplicate-block': [blockId: string]
  'delete-block': [blockId: string]
  'inspect-block': [blockId: string]
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
  [blockClass(props.block.id)]: true,
  ...(props.block.className ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .reduce<Record<string, boolean>>((classes, className) => {
      classes[className] = true
      return classes
    }, {}),
  'web-page-block--selected': props.selectedBlockId === props.block.id,
  'web-page-block--drop-before': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'before',
  'web-page-block--drop-after': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'after',
  'web-page-block--drop-inside': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'inside',
}))

const blockAttributes = computed(() => sanitizeAttributes(props.block.attributes ?? {}))
const customCssRule = computed(() => {
  const css = props.block.customCss?.trim()
  if (!css) return ''
  if (css.includes('{')) return css
  return `.${blockClass(props.block.id)} { ${css} }`
})

function onDragStart(event: DragEvent) {
  if (props.readonly) return
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ blockId: props.block.id }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  setDragPreview(event, props.block.id)
}

function onDrop(event: DragEvent) {
  if (props.readonly) return
  const payload = readDragPayload(event)
  if (!payload) return
  emit('drop-block', { targetId: props.block.id, position: dropPosition(event), ...payload })
}

function onDragOver(event: DragEvent) {
  if (props.readonly) return
  emit('drag-intent', { targetId: props.block.id, position: dropPosition(event), dropEdge: dropEdge(event) })
}

function dropPosition(event: DragEvent): InsertPosition {
  const edge = dropEdge(event)
  if (edge === 'top') return 'before'
  if (edge === 'bottom') return 'after'
  return isContainer.value ? 'inside' : 'after'
}

function dropEdge(event: DragEvent): DropEdge {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height

  if (y < 0.22) return 'top'
  if (y > 0.78) return 'bottom'
  if (x < 0.22) return 'left'
  if (x > 0.78) return 'right'
  return 'center'
}

function readDragPayload(event: DragEvent): { tag?: PageBlockTag; draggedId?: string } | null {
  const raw = event.dataTransfer?.getData('application/x-sailor-page-block')
  if (!raw) return null
  const parsed = JSON.parse(raw) as { tag?: PageBlockTag; blockId?: string }
  return { tag: parsed.tag, draggedId: parsed.blockId }
}

function setDragPreview(event: DragEvent, label: string) {
  if (!event.dataTransfer) return
  const preview = document.createElement('div')
  preview.className = 'web-page-drag-preview'
  preview.textContent = label
  document.body.appendChild(preview)
  event.dataTransfer.setDragImage(preview, 16, 16)
  window.setTimeout(() => preview.remove(), 0)
}

function blockClass(id: string): string {
  return `sailor-block-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function sanitizeAttributes(attributes: Record<string, string | number | boolean>) {
  const safe: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (!isSafeAttributeName(key) || value === false) continue
    safe[key] = value
  }
  return safe
}

function isSafeAttributeName(name: string) {
  return /^(data-[a-z0-9_.:-]+|aria-[a-z0-9_.:-]+|role|title|name|placeholder|target|rel)$/i.test(name)
}
</script>
