<template>
  <div
    ref="frameElementRef"
    class="web-page-block-frame"
    :data-block-id="block.id"
    v-bind="bindingTargetAttributes"
    :class="{
      'web-page-block-frame--selected': isSelectedBlock,
      'web-page-block-frame--deleting': deletingBlockIds?.includes(block.id),
      'web-page-block-frame--binding-target': isBindingTarget,
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
      :draggable="!readonly && activeTool === 'cursor' && !isInlineEditing"
      :contenteditable="isInlineEditing ? 'true' : undefined"
      tabindex="0"
      @click.stop="selectBlockFromPointer"
      @dblclick.stop="handleBlockDoubleClick"
      @focus="emit('select', { blockId: block.id })"
      @keydown="handleInlineEditKeydown"
      @blur="commitInlineEdit"
      @dragstart.stop="onDragStart"
      @dragover.prevent.stop="onDragOver"
      @dragleave.stop="onDragLeave"
      @drop.prevent.stop="onDrop"
    >
      <template v-if="block.tag === 'text' || block.tag === 'button' || block.tag === 'link'">
        {{ block.props?.text ?? block.tag }}
      </template>
      <template v-else-if="block.tag === 'input'">
        <span>{{ block.props?.label || block.props?.name || 'Input' }}</span>
      </template>
      <template v-else-if="!mediaOnlyTags.includes(block.tag) && (block.children ?? []).length === 0">
        <span class="web-page-block__placeholder">{{ block.props?.label ?? block.tag }}</span>
      </template>
      <TransitionGroup name="web-page-block">
        <BlockRenderer
          v-for="child in block.children ?? []"
          :key="child.id"
          :block="child"
          :selected-block-id="selectedBlockId"
          :selected-block-ids="selectedBlockIds"
          :drop-intent="dropIntent"
          :deleting-block-ids="deletingBlockIds"
          :active-tool="activeTool"
          :canvas-viewport="canvasViewport"
          :canvas-zoom="canvasZoom"
          :readonly="readonly"
          @select="$emit('select', $event)"
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
    </component>
    <Teleport to="body">
      <div
        v-if="!readonly && isSelectedBlock && !isGroupSelectedBlock"
        class="web-page-block-selection"
        :style="selectionPortalStyle"
      >
        <div v-if="isPrimarySelectedBlock" class="web-page-block-selection__chrome" :style="selectionChromeStyle">
          <div class="web-page-block-selection__id" @pointerdown.stop.prevent @mousedown.stop.prevent @click.stop @dblclick.stop="startBlockIdEdit">
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
          <div class="web-page-block-context-toolbar" @pointerdown.stop.prevent @mousedown.stop.prevent @click.stop>
            <span class="web-page-block-context-toolbar__label">{{ contextToolbarLabel }}</span>
            <span v-if="contextToolbarActions.length" class="web-page-block-context-toolbar__group">
              <button
                v-for="action in contextToolbarActions"
                :key="action.id"
                type="button"
                class="web-page-block-context-toolbar__action"
                :class="{ 'web-page-block-context-toolbar__action--active': isContextToolbarActionActive(action) }"
                :aria-pressed="isContextToolbarActionActive(action)"
                :title="action.label"
                @click="applyContextToolbarAction(action)"
              >
                {{ action.shortLabel }}
              </button>
            </span>
            <BaseButton
              variant="ghost"
              size="icon"
              icon-left="settings-2"
              title="Inspect element"
              @click="$emit('inspect-block', block.id)"
            />
          </div>
          <div class="web-page-block-selection__actions" @pointerdown.stop.prevent @mousedown.stop.prevent @click.stop>
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
        </div>
        <template v-if="isPrimarySelectedBlock">
          <button
            v-for="corner in resizeCorners"
            :key="corner"
            type="button"
            class="web-page-block-resize__handle"
            :class="[
              `web-page-block-resize__handle--${corner}`,
              { 'web-page-block-resize__handle--active': activeResizeCorner === corner },
            ]"
            :aria-label="`Resize from ${corner}`"
            @pointerdown.stop.prevent="startResize($event, corner)"
          />
        </template>
        <span
          v-for="guide in activeResizeGuides"
          :key="`${guide.axis}:${guide.position}`"
          class="web-page-block-alignment-guide"
          :class="`web-page-block-alignment-guide--${guide.axis}`"
          :style="resizeGuideStyle(guide)"
        />
        <span v-if="isPrimarySelectedBlock" class="web-page-block-selection__metric">{{ selectionSizeLabel }}</span>
        <span v-if="isPrimarySelectedBlock && resizeState && !isFreeResizeActive" class="web-page-block-selection__ratio">Locked</span>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { API_BASE_URL } from '@/core/constants/app.ts'
import type { BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { DropEdge } from '../stores/page-editor.store.ts'
import { resolveBlockDropIntent } from '../utils/dropIntent.ts'
import { calculateBlockResize, type ResizeCorner } from '../utils/blockResize.ts'

const props = withDefaults(defineProps<{
  block: PageBlock
  selectedBlockId: string | null
  selectedBlockIds?: string[]
  dropIntent?: { targetId: string; position: InsertPosition; dropEdge?: DropEdge } | null
  deletingBlockIds?: string[]
  activeTool?: 'cursor' | 'pan' | 'delete'
  readonly?: boolean
  canvasViewport?: BaseCanvasViewport
  canvasZoom?: number
}>(), {
  activeTool: 'cursor',
  deletingBlockIds: () => [],
  selectedBlockIds: () => [],
})

const emit = defineEmits<{
  select: [payload: { blockId: string; additive?: boolean }]
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; preset?: string; draggedId?: string }]
  'drag-intent': [payload: { targetId: string; position: InsertPosition; dropEdge?: DropEdge }]
  'duplicate-block': [blockId: string]
  'delete-block': [blockId: string]
  'inspect-block': [blockId: string]
  'resize-start': []
  'resize-end': []
  'resize-block': [payload: { blockId: string; styles: PageBlock['styles'] }]
  'rename-block': [payload: { blockId: string; nextId: string }]
  'patch-block': [payload: { blockId: string; patch: Partial<PageBlock> }]
}>()

const isContainer = computed(() =>
  ['header', 'section', 'div', 'footer', 'form'].includes(props.block.tag),
)
const renderTag = computed(() => {
  if (props.block.tag === 'text') return 'span'
  if (props.block.tag === 'image') return 'img'
  if (props.block.tag === 'youtube') return 'iframe'
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
  'web-page-block--selected': isSelectedBlock.value,
  'web-page-block--drop-before': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'before',
  'web-page-block--drop-after': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'after',
  'web-page-block--drop-inside': props.dropIntent?.targetId === props.block.id && props.dropIntent.position === 'inside',
}))

const blockAttributes = computed(() => ({
  ...sanitizeAttributes(props.block.attributes ?? {}),
  ...renderPropAttributes(props.block),
}))
const isBindingTarget = computed(() => ['input', 'text', 'button', 'link'].includes(props.block.tag))
const bindingTargetAttributes = computed(() => {
  if (!isBindingTarget.value) return {}
  return {
    'data-page-action-binding-target': 'true',
    'data-page-action-binding-element-id': props.block.id,
    'data-page-action-binding-property': bindingProperty(props.block),
    'data-page-action-binding-label': bindingTargetLabel(props.block),
  }
})
const frameElementRef = ref<HTMLElement | null>(null)
const blockElementRef = ref<HTMLElement | null>(null)
const previewStyles = ref<PageBlock['styles'] | null>(null)
const activeResizeGuides = ref<Array<{ axis: 'x' | 'y'; position: number }>>([])
const activeResizeCorner = ref<ResizeCorner | null>(null)
const isFreeResizeActive = ref(false)
const selectionFrameStyle = ref<Record<string, string>>({})
const selectionScale = ref(1)
const editingBlockId = ref(false)
const draftBlockId = ref('')
const blockIdInputRef = ref<HTMLInputElement | null>(null)
const isInlineEditing = ref(false)
const originalInlineText = ref('')
const inlineEditableTags: PageBlockTag[] = ['text', 'button', 'link']
const mediaOnlyTags: PageBlockTag[] = ['image', 'audio', 'video', 'youtube']
const resizeCorners: ResizeCorner[] = ['north-west', 'north-east', 'south-west', 'south-east']
const resolvedBlockStyles = computed(() => ({ ...props.block.styles, ...previewStyles.value }))
const isSelectedBlock = computed(() => props.selectedBlockId === props.block.id || props.selectedBlockIds.includes(props.block.id))
const isPrimarySelectedBlock = computed(() => props.selectedBlockId === props.block.id)
const isGroupSelectedBlock = computed(() => props.selectedBlockIds.length > 1)
const contextToolbarLabel = computed(() => `${props.block.tag} layer`)
type ContextToolbarAction = {
  id: string
  label: string
  shortLabel: string
  styles: NonNullable<PageBlock['styles']>
}
const textToolbarActions: ContextToolbarAction[] = [
  { id: 'bold', label: 'Bold text', shortLabel: 'B', styles: { fontWeight: '700' } },
  { id: 'center', label: 'Center text', shortLabel: 'C', styles: { textAlign: 'center' } },
  { id: 'left', label: 'Left text', shortLabel: 'L', styles: { textAlign: 'left' } },
]
const mediaToolbarActions: ContextToolbarAction[] = [
  { id: 'cover', label: 'Cover media', shortLabel: 'Cov', styles: { objectFit: 'cover' } },
  { id: 'contain', label: 'Contain media', shortLabel: 'Con', styles: { objectFit: 'contain' } },
]
const containerToolbarActions: ContextToolbarAction[] = [
  { id: 'flex-row', label: 'Flex row', shortLabel: 'Row', styles: { display: 'flex', flexDirection: 'row' } },
  { id: 'flex-column', label: 'Flex column', shortLabel: 'Col', styles: { display: 'flex', flexDirection: 'column' } },
]
const contextToolbarActions = computed(() => {
  if (['text', 'button', 'link'].includes(props.block.tag)) return textToolbarActions
  if (mediaOnlyTags.includes(props.block.tag)) return mediaToolbarActions
  if (isContainer.value) return containerToolbarActions
  return []
})
const selectionSizeLabel = computed(() => {
  const width = Number.parseFloat(selectionFrameStyle.value.width ?? '')
  const height = Number.parseFloat(selectionFrameStyle.value.height ?? '')
  if (!Number.isFinite(width) || !Number.isFinite(height)) return '0 x 0'
  return `${Math.round(width)} x ${Math.round(height)}`
})
const selectionChromeOffset = computed(() => {
  const height = Number.parseFloat(selectionFrameStyle.value.height ?? '')
  return Number.isFinite(height) && height < 44 ? 34 : 7
})
const selectionChromeStyle = computed(() => ({
  bottom: `calc(100% + ${selectionChromeOffset.value}px)`,
}))
const selectionFrameCssVars = computed(() => ({
  ...selectionFrameStyle.value,
  '--web-page-selection-scale': String(selectionScale.value),
}))
const selectionPortalStyle = computed(() => ({
  ...selectionFrameCssVars.value,
  position: 'fixed' as const,
}))
let resizeState: {
  corner: ResizeCorner
  startX: number
  startY: number
  width: number
  height: number
  maxWidth: number
  maxHeight: number
  fontSize: number
  scale: number
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
  updateSelectionFrame()
  window.addEventListener('resize', updateSelectionFrame)
})

onBeforeUnmount(() => {
  customCssStyleEl.value?.remove()
  customCssStyleEl.value = null
  stopResizeListeners()
  window.removeEventListener('resize', updateSelectionFrame)
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

watch(
  () => [props.selectedBlockId, props.selectedBlockIds, props.block.styles, previewStyles.value, props.canvasZoom, props.canvasViewport?.x, props.canvasViewport?.y, props.canvasViewport?.zoom],
  () => void nextTick(updateSelectionFrame),
  { deep: true },
)

function updateSelectionFrame() {
  if (!isSelectedBlock.value) {
    selectionFrameStyle.value = {}
    return
  }
  const frame = frameElementRef.value
  const element = blockElementRef.value
  if (!frame || !element) return
  const rect = element.getBoundingClientRect()
  selectionFrameStyle.value = {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
  selectionScale.value = clampSelectionScale(props.canvasZoom ?? rect.width / Math.max(element.offsetWidth, 1))
}

function selectBlockFromPointer(event: MouseEvent) {
  emit('select', { blockId: props.block.id, additive: event.ctrlKey || event.metaKey })
}

function clampSelectionScale(scale: number) {
  if (!Number.isFinite(scale) || scale <= 0) return 1
  return Math.min(4, Math.max(0.08, scale))
}

function updateCustomCssStyle() {
  if (!customCssRule.value) {
    customCssStyleEl.value?.remove()
    customCssStyleEl.value = null
    return
  }

  if (!customCssStyleEl.value) {
    customCssStyleEl.value = document.createElement('style')
    customCssStyleEl.value.dataset.fabricBlockCss = props.block.id
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

function handleBlockDoubleClick() {
  if (!inlineEditableTags.includes(props.block.tag)) {
    emit('inspect-block', props.block.id)
    return
  }
  originalInlineText.value = String(props.block.props?.text ?? '')
  isInlineEditing.value = true
  void nextTick(() => {
    const element = blockElementRef.value
    if (!element) return
    element.focus()
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(element)
    selection?.removeAllRanges()
    selection?.addRange(range)
  })
}

function handleInlineEditKeydown(event: KeyboardEvent) {
  if (!isInlineEditing.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelInlineEdit()
    return
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    commitInlineEdit()
  }
}

function commitInlineEdit() {
  if (!isInlineEditing.value) return
  const text = blockElementRef.value?.innerText.replace(/\r\n/g, '\n') ?? originalInlineText.value
  isInlineEditing.value = false
  if (text !== originalInlineText.value) {
    emit('patch-block', {
      blockId: props.block.id,
      patch: { props: { ...props.block.props, text } },
    })
  }
}

function cancelInlineEdit() {
  if (!isInlineEditing.value) return
  isInlineEditing.value = false
  if (blockElementRef.value) blockElementRef.value.innerText = originalInlineText.value
  blockElementRef.value?.blur()
}

function startResize(event: PointerEvent, corner: ResizeCorner) {
  const element = blockElementRef.value
  if (!element) return
  emit('resize-start')
  const rect = element.getBoundingClientRect()
  const bounds = resizeBounds(element)
  activeResizeCorner.value = corner
  resizeState = {
    corner,
    startX: event.clientX,
    startY: event.clientY,
    width: element.offsetWidth,
    height: element.offsetHeight,
    maxWidth: bounds.maxWidth,
    maxHeight: bounds.maxHeight,
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize) || 16,
    scale: rect.width / Math.max(element.offsetWidth, 1),
  }
  updateSelectionFrame()
  window.addEventListener('pointermove', resizeFromPointer)
  window.addEventListener('pointerup', finishResize, { once: true })
  window.addEventListener('pointercancel', finishResize, { once: true })
}

function resizeFromPointer(event: PointerEvent) {
  if (!resizeState) return
  isFreeResizeActive.value = event.shiftKey
  const result = calculateBlockResize({
    corner: resizeState.corner,
    deltaX: (event.clientX - resizeState.startX) / resizeState.scale,
    deltaY: (event.clientY - resizeState.startY) / resizeState.scale,
    width: resizeState.width,
    height: resizeState.height,
    maxWidth: resizeState.maxWidth,
    maxHeight: resizeState.maxHeight,
    fontSize: resizeState.fontSize,
    tag: props.block.tag,
    freeAspectRatio: event.shiftKey,
  })
  const aligned = event.shiftKey ? { styles: result.styles, guides: [] } : snapResizeToAlignment(result.styles)
  previewStyles.value = aligned.styles
  activeResizeGuides.value = aligned.guides
  void nextTick(updateSelectionFrame)
}

function finishResize() {
  if (previewStyles.value) emit('resize-block', { blockId: props.block.id, styles: previewStyles.value })
  emit('resize-end')
  previewStyles.value = null
  activeResizeGuides.value = []
  isFreeResizeActive.value = false
  activeResizeCorner.value = null
  resizeState = null
  stopResizeListeners()
  void nextTick(updateSelectionFrame)
}

function snapResizeToAlignment(styles: PageBlock['styles'] | undefined) {
  const currentStyles = styles ?? {}
  const width = sizeValue(currentStyles.width)
  const height = sizeValue(currentStyles.height)
  const targets = resizeTargets()
  const guides: Array<{ axis: 'x' | 'y'; position: number }> = []
  const nextStyles = { ...currentStyles }
  const widthTarget = width == null ? null : closestSize(width, targets.widths)
  const heightTarget = height == null ? null : closestSize(height, targets.heights)
  if (widthTarget != null) {
    nextStyles.width = `${widthTarget}px`
    guides.push({ axis: 'x', position: widthTarget })
  }
  if (heightTarget != null) {
    nextStyles.height = `${heightTarget}px`
    guides.push({ axis: 'y', position: heightTarget })
  }
  return { styles: nextStyles, guides }
}

function resizeTargets() {
  const parent = frameElementRef.value?.parentElement
  const element = blockElementRef.value
  const bounds = element ? resizeBounds(element) : null
  const siblings = Array.from(parent?.children ?? [])
    .map((child) => child instanceof HTMLElement ? child.querySelector<HTMLElement>('.web-page-block-frame__inner') : null)
    .filter((sibling): sibling is HTMLElement => Boolean(sibling && sibling !== element))
  return {
    widths: [
      bounds?.maxWidth ?? parent?.clientWidth ?? 0,
      ...siblings.map((element) => element.offsetWidth),
    ].filter((value) => value > 0),
    heights: [
      bounds?.maxHeight ?? parent?.clientHeight ?? 0,
      ...siblings.map((element) => element.offsetHeight),
    ].filter((value) => value > 0),
  }
}

function resizeBounds(element: HTMLElement) {
  const parent = frameElementRef.value?.parentElement
  if (!parent) return { maxWidth: 4000, maxHeight: 4000 }
  return {
    maxWidth: Math.max(40, parent.clientWidth - element.offsetLeft),
    maxHeight: Math.max(24, parent.clientHeight - element.offsetTop),
  }
}

function closestSize(value: number, targets: number[]) {
  const match = targets
    .map((target) => ({ target, distance: Math.abs(target - value) }))
    .filter((item) => item.distance <= 6)
    .sort((left, right) => left.distance - right.distance)[0]
  return match?.target ?? null
}

function sizeValue(value: string | number | undefined) {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resizeGuideStyle(guide: { axis: 'x' | 'y'; position: number }) {
  if (guide.axis === 'x') return { left: `${guide.position}px` }
  return { top: `${guide.position}px` }
}

function selectionRect() {
  const left = sizeValue(selectionFrameStyle.value.left)
  const top = sizeValue(selectionFrameStyle.value.top)
  const width = sizeValue(selectionFrameStyle.value.width)
  const height = sizeValue(selectionFrameStyle.value.height)
  if (left == null || top == null || width == null || height == null) return null
  return { left, top, width, height }
}

function applyContextToolbarAction(action: ContextToolbarAction) {
  const currentStyles: NonNullable<PageBlock['styles']> = props.block.styles ?? {}
  const nextStyles = isContextToolbarActionActive(action)
    ? withoutStyleKeys(currentStyles, Object.keys(action.styles))
    : { ...currentStyles, ...action.styles }
  emit('patch-block', {
    blockId: props.block.id,
    patch: { styles: nextStyles },
  })
}

function isContextToolbarActionActive(action: ContextToolbarAction) {
  const styles: NonNullable<PageBlock['styles']> = props.block.styles ?? {}
  return Object.entries(action.styles).every(([key, value]) => styles[key] === value)
}

function withoutStyleKeys(styles: NonNullable<PageBlock['styles']>, keys: string[]) {
  return Object.fromEntries(
    Object.entries(styles).filter(([key]) => !keys.includes(key)),
  ) as PageBlock['styles']
}

function stopResizeListeners() {
  window.removeEventListener('pointermove', resizeFromPointer)
  window.removeEventListener('pointerup', finishResize)
  window.removeEventListener('pointercancel', finishResize)
}

function onDragStart(event: DragEvent) {
  if (props.readonly) return
  event.dataTransfer?.setData('application/x-fabric-page-block', JSON.stringify({ blockId: props.block.id }))
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
  const previous = props.dropIntent?.targetId === props.block.id
    ? { position: props.dropIntent.position, dropEdge: props.dropIntent.dropEdge ?? 'center' }
    : null
  return resolveBlockDropIntent({
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    width: rect.width,
    height: rect.height,
    isContainer: isContainer.value,
    previous,
  })
}

function emitDragIntent(intent: { position: InsertPosition; dropEdge?: DropEdge }) {
  const key = `${props.block.id}:${intent.position}:${intent.dropEdge ?? 'center'}`
  if (key === lastDragIntentKey.value) return
  lastDragIntentKey.value = key
  emit('drag-intent', { targetId: props.block.id, ...intent })
}

function onDragLeave(event: DragEvent) {
  if (!blockElementRef.value?.contains(event.relatedTarget as Node | null)) {
    lastDragIntentKey.value = ''
  }
}

function readDragPayload(event: DragEvent): { tag?: PageBlockTag; preset?: string; draggedId?: string } | null {
  const raw = event.dataTransfer?.getData('application/x-fabric-page-block')
  if (!raw) return null
  const parsed = JSON.parse(raw) as { tag?: PageBlockTag; preset?: string; blockId?: string }
  return { tag: parsed.tag, preset: parsed.preset, draggedId: parsed.blockId }
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
  return `fabric-block-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`
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

function renderPropAttributes(block: PageBlock): Record<string, string | number | boolean> {
  const props = block.props ?? {}
  if (block.tag === 'image') {
    return {
      src: resolveMediaUrl(String(props.src ?? '')),
      alt: String(props.alt ?? ''),
      title: String(props.title ?? ''),
    }
  }
  if (block.tag === 'audio' || block.tag === 'video') {
    return {
      src: resolveMediaUrl(String(props.src ?? '')),
      controls: props.controls !== false,
      autoplay: Boolean(props.autoplay),
      loop: Boolean(props.loop),
      muted: Boolean(props.muted),
      ...(block.tag === 'video' ? { poster: resolveMediaUrl(String(props.poster ?? '')) } : {}),
    }
  }
  if (block.tag === 'youtube') {
    return {
      src: youtubeEmbedSrc(props),
      title: String(props.title ?? 'Youtube video'),
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      allowfullscreen: true,
    }
  }
  if (block.tag === 'input') {
    return {
      name: String(props.name ?? ''),
      type: String(props.type ?? 'text'),
      placeholder: String(props.placeholder ?? ''),
      required: Boolean(props.required),
      disabled: Boolean(props.disabled),
      value: String(props.value ?? ''),
    }
  }
  if (block.tag === 'link') {
    return {
      href: safeLinkUrl(String(props.href ?? '#')),
      target: String(props.target ?? ''),
    }
  }
  if (block.tag === 'button') {
    return {
      type: String(props.type ?? 'button'),
      name: String(props.name ?? ''),
      value: String(props.value ?? ''),
      disabled: Boolean(props.disabled),
    }
  }
  return {}
}

function bindingProperty(block: PageBlock): 'value' | 'checked' | 'text' {
  if (block.tag !== 'input') return 'text'
  return block.props?.type === 'checkbox' ? 'checked' : 'value'
}

function bindingTargetLabel(block: PageBlock): string {
  const label = block.props?.label || block.props?.name || block.elementId || block.id
  return String(label)
}

function resolveMediaUrl(value: string): string {
  if (!value) return ''
  if (/^(https?:)/.test(value)) return value
  if (value.startsWith('/sites/')) return `${API_BASE_URL}${value}`
  return value.startsWith('/') ? value : ''
}

function safeLinkUrl(value: string): string {
  if (!value) return ''
  return value.startsWith('/') || value.startsWith('#') || /^(https?:|mailto:|tel:)/.test(value) ? value : ''
}

function youtubeEmbedSrc(props: PageBlock['props']): string {
  const videoId = String(props?.videoId ?? '').trim() || youtubeIdFromUrl(String(props?.url ?? ''))
  return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : ''
}

function youtubeIdFromUrl(value: string): string {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/)
  return match?.[1] ?? ''
}
</script>
