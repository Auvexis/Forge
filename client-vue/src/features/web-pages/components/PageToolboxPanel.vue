<template>
  <aside class="web-page-toolbox" aria-label="HTML element toolbox">
    <label class="web-page-toolbox__search">
      <LucideIcon name="search" :size="14" />
      <input v-model="query" type="search" placeholder="Search elements" />
    </label>

    <section
      v-for="section in visibleSections"
      :key="section.id"
      class="web-page-toolbox__section"
    >
      <button
        type="button"
        class="web-page-toolbox__section-title"
        @click="toggleSection(section.id)"
      >
        <LucideIcon :name="collapsedSections.includes(section.id) ? 'chevron-right' : 'chevron-down'" :size="12" />
        <span>{{ section.label }}</span>
      </button>

      <div v-if="!collapsedSections.includes(section.id)" class="web-page-toolbox__grid">
        <button
          v-for="item in section.items"
          :key="item.id"
          type="button"
          class="web-page-toolbox__item"
          draggable="true"
          :title="item.label"
          @dragstart="onDragStart($event, item)"
          @dragend="handleDragEnd"
        >
          <span class="web-page-toolbox__item-icon">
            <LucideIcon :name="item.icon" :size="36" :stroke-width="1.6" />
          </span>
          <span class="web-page-toolbox__item-label">{{ item.label }}</span>
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="dragPreview"
        class="web-page-toolbox-drag-preview"
        :style="dragPreviewStyle"
      >
        <div class="web-page-toolbox-drag-preview__body" :style="dragPreviewBodyStyle">
          <div class="web-page-toolbox-drag-preview__node">
            <span class="web-page-toolbox-drag-preview__icon">
              <LucideIcon :name="dragPreview.icon" :size="28" />
            </span>
          </div>
          <div class="web-page-toolbox-drag-preview__label">{{ dragPreview.label }}</div>
          <div class="web-page-toolbox-drag-preview__subtitle">{{ dragPreview.subtitle }}</div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlockTag } from '../types/page.types.ts'

interface ToolboxItem {
  id: string
  label: string
  icon: string
  tag: PageBlockTag
}

interface ToolboxSection {
  id: string
  label: string
  items: ToolboxItem[]
}

interface DragPreviewMeta {
  icon: string
  label: string
  subtitle: string
}

const query = ref('')
const collapsedSections = ref<string[]>([])
const dragPreview = ref<DragPreviewMeta | null>(null)
const dragPreviewPoint = ref({ x: 0, y: 0 })
const dragPreviewVelocity = ref({ x: 0, y: 0 })
const dragPreviewScale = ref(0.72)
const dragPreviewBodyOffset = ref({ x: 0, y: 0, rotate: 0 })
let targetBodyOffset = { x: 0, y: 0, rotate: 0 }
let lastDragPoint = { x: 0, y: 0, t: 0 }
let windAnimationFrame: number | null = null

const sections: ToolboxSection[] = [
  {
    id: 'recent',
    label: 'Recently used',
    items: [
      { id: 'text-input', label: 'Text Input', icon: 'text-cursor-input', tag: 'input' },
      { id: 'heading', label: 'Heading', icon: 'heading', tag: 'text' },
      { id: 'image', label: 'Image', icon: 'image', tag: 'image' },
      { id: 'button', label: 'Button', icon: 'square-mouse-pointer', tag: 'button' },
    ],
  },
  {
    id: 'text',
    label: 'Text',
    items: [
      { id: 'paragraph', label: 'Paragraph', icon: 'pilcrow', tag: 'text' },
      { id: 'rich-text', label: 'Rich Text', icon: 'type', tag: 'text' },
      { id: 'quote', label: 'Quote', icon: 'quote', tag: 'text' },
      { id: 'link', label: 'Link', icon: 'link', tag: 'link' },
    ],
  },
  {
    id: 'structure',
    label: 'Structure',
    items: [
      { id: 'section', label: 'Section', icon: 'panel-top', tag: 'section' },
      { id: 'container', label: 'Container', icon: 'square', tag: 'div' },
      { id: 'quick-stack', label: 'Quick Stack', icon: 'layers-3', tag: 'div' },
      { id: 'v-flex', label: 'V Flex', icon: 'rows-3', tag: 'div' },
      { id: 'h-flex', label: 'H Flex', icon: 'columns-3', tag: 'div' },
      { id: 'grid', label: 'Grid', icon: 'grid-2x2', tag: 'div' },
    ],
  },
  {
    id: 'form',
    label: 'Form',
    items: [
      { id: 'form', label: 'Form', icon: 'clipboard-list', tag: 'form' },
      { id: 'email-input', label: 'Email Input', icon: 'mail', tag: 'input' },
      { id: 'textarea', label: 'Textarea', icon: 'text', tag: 'input' },
      { id: 'submit-button', label: 'Submit Button', icon: 'send', tag: 'button' },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    items: [
      { id: 'media-image', label: 'Image', icon: 'image', tag: 'image' },
      { id: 'video', label: 'Video', icon: 'clapperboard', tag: 'div' },
      { id: 'youtube', label: 'Youtube', icon: 'youtube', tag: 'div' },
      { id: 'audio', label: 'Audio', icon: 'music', tag: 'div' },
    ],
  },
  {
    id: 'interactive',
    label: 'Interactive',
    items: [
      { id: 'button-link', label: 'Button', icon: 'mouse-pointer-click', tag: 'button' },
      { id: 'nav-link', label: 'Nav Link', icon: 'navigation', tag: 'link' },
      { id: 'card', label: 'Card', icon: 'panel-top-open', tag: 'div' },
      { id: 'divider', label: 'Divider', icon: 'minus', tag: 'div' },
    ],
  },
]

const visibleSections = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (!term) return sections

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.label.toLowerCase().includes(term)),
    }))
    .filter((section) => section.items.length > 0)
})

const dragPreviewStyle = computed(() => ({
  transform: `translate3d(${dragPreviewPoint.value.x - 72}px, ${dragPreviewPoint.value.y - 56}px, 0) scale(${dragPreviewScale.value})`,
}))

const dragPreviewBodyStyle = computed(() => ({
  transform: `translate3d(${dragPreviewBodyOffset.value.x}px, ${dragPreviewBodyOffset.value.y}px, 0) rotate(${dragPreviewBodyOffset.value.rotate}deg)`,
}))

onMounted(() => {
  document.addEventListener('dragover', moveDragPreviewFromDragEvent, true)
  document.addEventListener('drop', handleDragEnd, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('dragover', moveDragPreviewFromDragEvent, true)
  document.removeEventListener('drop', handleDragEnd, true)
  cancelWindAnimation()
})

function toggleSection(sectionId: string) {
  collapsedSections.value = collapsedSections.value.includes(sectionId)
    ? collapsedSections.value.filter((id) => id !== sectionId)
    : [...collapsedSections.value, sectionId]
}

function onDragStart(event: DragEvent, item: ToolboxItem) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ tag: item.tag, preset: item.id }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
  setTransparentDragImage(event)
  startDragPreview({ x: event.clientX, y: event.clientY }, {
    icon: item.icon,
    label: item.label,
    subtitle: 'HTML Element',
  })
}

function setTransparentDragImage(event: DragEvent) {
  if (!event.dataTransfer) return
  const preview = document.createElement('div')
  preview.className = 'web-page-drag-preview'
  preview.style.opacity = '0'
  document.body.appendChild(preview)
  event.dataTransfer.setDragImage(preview, 0, 0)
  window.setTimeout(() => preview.remove(), 0)
}

function startDragPreview(point: { x: number; y: number }, preview: DragPreviewMeta) {
  dragPreview.value = preview
  dragPreviewPoint.value = point
  dragPreviewVelocity.value = { x: 0, y: 0 }
  dragPreviewBodyOffset.value = { x: 0, y: 0, rotate: 0 }
  targetBodyOffset = { x: 0, y: 0, rotate: 0 }
  dragPreviewScale.value = 0.72
  lastDragPoint = { ...point, t: performance.now() }
  requestAnimationFrame(() => {
    dragPreviewScale.value = 1
  })
  startWindAnimation()
}

function moveDragPreviewFromDragEvent(event: DragEvent) {
  if (!dragPreview.value || event.clientX === 0 || event.clientY === 0) return
  moveDragPreview({ x: event.clientX, y: event.clientY })
}

function moveDragPreview(point: { x: number; y: number }) {
  if (!dragPreview.value) return
  const now = performance.now()
  const dt = Math.max(now - lastDragPoint.t, 16)
  const dx = point.x - lastDragPoint.x
  const dy = point.y - lastDragPoint.y
  dragPreviewPoint.value = point
  dragPreviewVelocity.value = {
    x: Math.max(-36, Math.min(36, dx * 2.2 + (dx / dt) * 10)),
    y: Math.max(-18, Math.min(18, dy * 1.2 + (dy / dt) * 6)),
  }
  const lateralPull = Math.max(-58, Math.min(58, dx * 6 + dragPreviewVelocity.value.x * 0.65))
  const verticalLift = Math.min(
    34,
    Math.abs(dx) * 2.4 + Math.abs(dy) * 0.7 + Math.abs(dragPreviewVelocity.value.x) * 0.3,
  )
  targetBodyOffset = {
    x: lateralPull,
    y: verticalLift,
    rotate: Math.max(-24, Math.min(24, -lateralPull * 0.42)),
  }
  startWindAnimation()
  lastDragPoint = { ...point, t: now }
}

function startWindAnimation() {
  if (windAnimationFrame !== null) return
  const tick = () => {
    const current = dragPreviewBodyOffset.value
    const next = {
      x: current.x + (targetBodyOffset.x - current.x) * 0.22,
      y: current.y + (targetBodyOffset.y - current.y) * 0.22,
      rotate: current.rotate + (targetBodyOffset.rotate - current.rotate) * 0.22,
    }
    dragPreviewBodyOffset.value = next
    targetBodyOffset = {
      x: targetBodyOffset.x * 0.88,
      y: targetBodyOffset.y * 0.88,
      rotate: targetBodyOffset.rotate * 0.88,
    }

    if (
      dragPreview.value &&
      (Math.abs(next.x) > 0.05 ||
        Math.abs(next.y) > 0.05 ||
        Math.abs(next.rotate) > 0.05 ||
        Math.abs(targetBodyOffset.x) > 0.05 ||
        Math.abs(targetBodyOffset.y) > 0.05 ||
        Math.abs(targetBodyOffset.rotate) > 0.05)
    ) {
      windAnimationFrame = requestAnimationFrame(tick)
      return
    }

    dragPreviewBodyOffset.value = { x: 0, y: 0, rotate: 0 }
    targetBodyOffset = { x: 0, y: 0, rotate: 0 }
    windAnimationFrame = null
  }

  windAnimationFrame = requestAnimationFrame(tick)
}

function handleDragEnd() {
  if (!dragPreview.value) return
  dragPreviewScale.value = 0.82
  window.setTimeout(() => {
    dragPreview.value = null
    dragPreviewVelocity.value = { x: 0, y: 0 }
    dragPreviewBodyOffset.value = { x: 0, y: 0, rotate: 0 }
    targetBodyOffset = { x: 0, y: 0, rotate: 0 }
    cancelWindAnimation()
  }, 120)
}

function cancelWindAnimation() {
  if (windAnimationFrame === null) return
  cancelAnimationFrame(windAnimationFrame)
  windAnimationFrame = null
}
</script>
