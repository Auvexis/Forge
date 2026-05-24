<template>
  <div
    ref="toolbarRef"
    class="web-page-floating-add-toolbar web-page-floating-add-toolbar--bottom"
    :style="toolbarStyle"
    aria-label="Add elements"
  >
    <BaseButton
      v-for="tool in tools"
      :key="tool.tag"
      class="web-page-floating-add-toolbar__tool"
      draggable="true"
      variant="ghost"
      size="icon"
      :icon-left="tool.icon"
      :title="tool.label"
      :data-tooltip="tool.label"
      @dragstart="onDragStart($event, tool.tag)"
    />
    <BaseButton
      class="web-page-floating-add-toolbar__move"
      variant="ghost"
      size="icon"
      icon-left="grip-vertical"
      title="Move toolbar"
      data-tooltip="Move toolbar"
      @pointerdown="onMoveStart"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { PageBlockTag } from '../types/page.types.ts'

const props = withDefaults(
  defineProps<{
    leftPanelOpen?: boolean
    rightPanelOpen?: boolean
  }>(),
  {
    leftPanelOpen: true,
    rightPanelOpen: true,
  },
)

const tools: Array<{ tag: PageBlockTag; icon: string; label: string }> = [
  { tag: 'header', icon: 'panel-top', label: 'Header' },
  { tag: 'section', icon: 'layout-template', label: 'Section' },
  { tag: 'div', icon: 'box', label: 'Div' },
  { tag: 'text', icon: 'type', label: 'Text' },
  { tag: 'button', icon: 'square-mouse-pointer', label: 'Button' },
  { tag: 'input', icon: 'text-cursor-input', label: 'Input' },
  { tag: 'form', icon: 'clipboard-list', label: 'Form' },
  { tag: 'image', icon: 'image', label: 'Image' },
  { tag: 'link', icon: 'link', label: 'Link' },
  { tag: 'footer', icon: 'panel-bottom', label: 'Footer' },
]

const toolbarRef = ref<HTMLElement | null>(null)
const position = ref<{ left: number; top: number } | null>(null)
const isMoving = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const toolbarStyle = computed(() => {
  if (!position.value) return undefined
  return {
    left: `${position.value.left}px`,
    top: `${position.value.top}px`,
  }
})

onMounted(async () => {
  await nextTick()
  setDefaultPosition()
  window.addEventListener('resize', clampCurrentPosition)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onMoveEnd)
})

onUnmounted(() => {
  window.removeEventListener('resize', clampCurrentPosition)
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onMoveEnd)
})

watch(
  () => [props.leftPanelOpen, props.rightPanelOpen],
  () => {
    clampCurrentPosition()
  },
)

function onDragStart(event: DragEvent, tag: PageBlockTag) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ tag }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
  setDragPreview(event, tag)
}

function onMoveStart(event: PointerEvent) {
  if (!toolbarRef.value) return
  const rect = toolbarRef.value.getBoundingClientRect()
  isMoving.value = true
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onMove(event: PointerEvent) {
  if (!isMoving.value || !toolbarRef.value) return
  position.value = clampPosition(event.clientX - dragOffset.value.x, event.clientY - dragOffset.value.y)
}

function onMoveEnd() {
  isMoving.value = false
}

function setDefaultPosition() {
  const rect = toolbarRef.value?.getBoundingClientRect()
  if (!rect) return
  const bounds = toolbarBounds(rect)
  position.value = clampPosition(bounds.left + (bounds.right - bounds.left - rect.width) / 2, bounds.bottom - rect.height)
}

function clampCurrentPosition() {
  if (!position.value) {
    setDefaultPosition()
    return
  }
  position.value = clampPosition(position.value.left, position.value.top)
}

function clampPosition(left: number, top: number) {
  const rect = toolbarRef.value?.getBoundingClientRect()
  if (!rect) return { left, top }
  const bounds = toolbarBounds(rect)
  return {
    left: Math.min(Math.max(left, bounds.left), bounds.right - rect.width),
    top: Math.min(Math.max(top, bounds.top), bounds.bottom - rect.height),
  }
}

function toolbarBounds(rect: DOMRect) {
  const panelWidth = readCssPixel('--sailor-panel-width', 360)
  const gap = 16
  return {
    left: (props.leftPanelOpen ? panelWidth : 0) + gap,
    right: window.innerWidth - (props.rightPanelOpen ? panelWidth : 0) - gap,
    top: 40 + gap,
    bottom: window.innerHeight - gap,
    width: rect.width,
  }
}

function readCssPixel(name: string, fallback: number) {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
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
</script>
