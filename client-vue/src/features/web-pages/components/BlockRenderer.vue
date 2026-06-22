<template>
  <div
    class="web-page-block-frame"
    :class="{
      'web-page-block-frame--selected': selectedBlockId === block.id,
      'web-page-block-frame--deleting': deletingBlockIds?.includes(block.id),
    }"
  >
    <span
      v-if="dropIntent?.targetId === block.id"
      class="web-page-block-frame__drop-layer"
      aria-hidden="true"
    >
      <span
        v-if="dropIntent.position !== 'inside'"
        class="web-page-drop-indicator"
        :class="`web-page-drop-indicator--${dropIntent.position}`"
      />
      <span
        class="web-page-drop-arrow"
        :class="`web-page-drop-arrow--${dropIntent.dropEdge ?? 'center'}`"
      />
    </span>
    <component
      ref="blockElementRef"
      :is="renderTag"
      v-bind="blockAttributes"
      :id="block.elementId || undefined"
      class="web-page-block web-page-block-frame__inner"
      :class="blockClasses"
      :style="resolvedBlockStyles"
      :draggable="!readonly && activeTool === 'cursor'"
      tabindex="0"
      @click.stop="$emit('select', block.id)"
      @dblclick.stop="$emit('inspect-block', block.id)"
      @focus="$emit('select', block.id)"
      @dragstart.stop="onDragStart"
      @dragover.prevent.stop="onDragOver"
      @drop.prevent.stop="onDrop"
    >
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
      <TransitionGroup name="web-page-block">
        <BlockRenderer
          v-for="child in block.children ?? []"
          :key="child.id"
          :block="child"
          :selected-block-id="selectedBlockId"
          :drop-intent="dropIntent"
          :deleting-block-ids="deletingBlockIds"
          :active-tool="activeTool"
          :readonly="readonly"
          @select="$emit('select', $event)"
          @drop-block="$emit('drop-block', $event)"
          @drag-intent="$emit('drag-intent', $event)"
          @duplicate-block="$emit('duplicate-block', $event)"
          @delete-block="$emit('delete-block', $event)"
          @inspect-block="$emit('inspect-block', $event)"
          @resize-block="$emit('resize-block', $event)"
          @rename-block="$emit('rename-block', $event)"
        />
      </TransitionGroup>
    </component>
    <template v-if="!readonly && selectedBlockId === block.id">
      <div class="web-page-block-selection__id" @pointerdown.stop @click.stop @dblclick.stop="startBlockIdEdit">
        <input
          v-if="editingBlockId"
          ref="blockIdInputRef"
          v-model="draftBlockId"
          class="web-page-block-selection__id-input"
          aria-label="Element ID"
          @keydown.enter.prevent="commitBlockIdEdit"
          @keydown.esc.prevent="cancelBlockIdEdit"
          @blur="commitBlockIdEdit"
        />
        <span v-else>{{ block.id }}</span>
      </div>
      <div class="web-page-block-selection__actions" @pointerdown.stop @click.stop>
        <BaseButton
          variant="ghost"
          size="icon"
          icon-left="copy"
          title="Duplicate element"
          @click="$emit('duplicate-block', block.id)"
        />
        <BaseButton
          variant="ghost"
          size="icon"
          icon-left="trash-2"
          title="Delete element"
          @click="$emit('delete-block', block.id)"
        />
      </div>
      <button
        v-for="corner in resizeCorners"
        :key="corner"
        type="button"
        class="web-page-block-resize__handle"
        :class="`web-page-block-resize__handle--${corner}`"
        :aria-label="`Resize from ${corner}`"
        @pointerdown.stop.prevent="startResize($event, corner)"
      />
      <span v-if="resizeLabel" class="web-page-block-resize__indicator">{{ resizeLabel }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { DropEdge } from '../stores/page-editor.store.ts'
import { resolveBlockDropIntent } from '../utils/dropIntent.ts'
import { calculateBlockResize, type ResizeCorner } from '../utils/blockResize.ts'

const props = withDefaults(defineProps<{
  block: PageBlock
  selectedBlockId: string | null
  dropIntent?: { targetId: string; position: InsertPosition; dropEdge?: DropEdge } | null
  deletingBlockIds?: string[]
  activeTool?: 'cursor' | 'pan' | 'delete'
  readonly?: boolean
}>(), {
  activeTool: 'cursor',
  deletingBlockIds: () => [],
})

const emit = defineEmits<{
  select: [blockId: string]
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; draggedId?: string }]
  'drag-intent': [payload: { targetId: string; position: InsertPosition; dropEdge?: DropEdge }]
  'duplicate-block': [blockId: string]
  'delete-block': [blockId: string]
  'inspect-block': [blockId: string]
  'resize-block': [payload: { blockId: string; styles: PageBlock['styles'] }]
  'rename-block': [payload: { blockId: string; nextId: string }]
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
const blockElementRef = ref<HTMLElement | null>(null)
const previewStyles = ref<PageBlock['styles'] | null>(null)
const resizeLabel = ref('')
const editingBlockId = ref(false)
const draftBlockId = ref('')
const blockIdInputRef = ref<HTMLInputElement | null>(null)
const resizeCorners: ResizeCorner[] = ['north-west', 'north-east', 'south-west', 'south-east']
const resolvedBlockStyles = computed(() => ({ ...props.block.styles, ...previewStyles.value }))
let resizeState: {
  corner: ResizeCorner
  startX: number
  startY: number
  width: number
  height: number
  fontSize: number
} | null = null
const customCssRule = computed(() => {
  const css = props.block.customCss?.trim()
  if (!css) return ''
  if (css.includes('{')) return css
  return `.${blockClass(props.block.id)} { ${css} }`
})
const customCssStyleEl = ref<HTMLStyleElement | null>(null)
const lastDragIntentKey = ref('')

onMounted(() => {
  updateCustomCssStyle()
})

onBeforeUnmount(() => {
  customCssStyleEl.value?.remove()
  customCssStyleEl.value = null
  stopResizeListeners()
})

watch(customCssRule, () => {
  updateCustomCssStyle()
})

watch(
  () => props.dropIntent,
  (dropIntent) => {
    if (!dropIntent) lastDragIntentKey.value = ''
  },
)

function updateCustomCssStyle() {
  if (!customCssRule.value) {
    customCssStyleEl.value?.remove()
    customCssStyleEl.value = null
    return
  }

  if (!customCssStyleEl.value) {
    customCssStyleEl.value = document.createElement('style')
    customCssStyleEl.value.dataset.sailorBlockCss = props.block.id
    document.head.appendChild(customCssStyleEl.value)
  }

  customCssStyleEl.value.textContent = customCssRule.value
}

function startBlockIdEdit() {
  editingBlockId.value = true
  draftBlockId.value = props.block.id
  void nextTick(() => blockIdInputRef.value?.select())
}

function cancelBlockIdEdit() {
  editingBlockId.value = false
  draftBlockId.value = ''
}

function commitBlockIdEdit() {
  if (!editingBlockId.value) return
  const nextId = draftBlockId.value.trim().replace(/\s+/g, '_')
  if (nextId && nextId !== props.block.id) emit('rename-block', { blockId: props.block.id, nextId })
  cancelBlockIdEdit()
}

function startResize(event: PointerEvent, corner: ResizeCorner) {
  const element = blockElementRef.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  resizeState = {
    corner,
    startX: event.clientX,
    startY: event.clientY,
    width: rect.width,
    height: rect.height,
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize) || 16,
  }
  window.addEventListener('pointermove', resizeFromPointer)
  window.addEventListener('pointerup', finishResize, { once: true })
}

function resizeFromPointer(event: PointerEvent) {
  if (!resizeState) return
  const result = calculateBlockResize({
    corner: resizeState.corner,
    deltaX: event.clientX - resizeState.startX,
    deltaY: event.clientY - resizeState.startY,
    width: resizeState.width,
    height: resizeState.height,
    fontSize: resizeState.fontSize,
    tag: props.block.tag,
    freeAspectRatio: event.shiftKey,
  })
  previewStyles.value = result.styles
  resizeLabel.value = result.label
}

function finishResize() {
  if (previewStyles.value) emit('resize-block', { blockId: props.block.id, styles: previewStyles.value })
  previewStyles.value = null
  resizeLabel.value = ''
  resizeState = null
  stopResizeListeners()
}

function stopResizeListeners() {
  window.removeEventListener('pointermove', resizeFromPointer)
  window.removeEventListener('pointerup', finishResize)
}

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
  const intent = getDropIntent(event)
  emit('drop-block', { targetId: props.block.id, position: intent.position, ...payload })
}

function onDragOver(event: DragEvent) {
  if (props.readonly) return
  emitDragIntent(getDropIntent(event))
}

function getDropIntent(event: DragEvent): { position: InsertPosition; dropEdge: DropEdge } {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return resolveBlockDropIntent({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
    isContainer: isContainer.value,
  })
}

function emitDragIntent(intent: { position: InsertPosition; dropEdge?: DropEdge }) {
  const key = `${props.block.id}:${intent.position}:${intent.dropEdge ?? 'center'}`
  if (key === lastDragIntentKey.value) return
  lastDragIntentKey.value = key
  emit('drag-intent', { targetId: props.block.id, ...intent })
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
