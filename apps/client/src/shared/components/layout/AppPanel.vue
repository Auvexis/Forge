<template>
  <aside
    ref="panelRef"
    v-show="isOpen"
    class="app-panel surface-elevated"
    :class="[
      `app-panel--${position}`,
      `app-panel--${width}`,
      { 'app-panel--resizing': isResizing },
    ]"
    :style="panelStyle"
  >
    <div
      v-if="resizable"
      class="app-panel__resize-handle"
      :class="`app-panel__resize-handle--${resizeSide}`"
      role="separator"
      :aria-orientation="isHorizontalResize ? 'vertical' : 'horizontal'"
      title="Resize panel"
      @mousedown="startResize"
      @dblclick="resetResize"
    />

    <div class="app-panel__header">
      <h3 class="app-panel__title">{{ title }}</h3>

      <div class="app-panel__actions">
        <slot name="actions"></slot>
        <button v-if="showClose" class="app-panel__close" @click="close">
          <LucideIcon name="X" :size="18" />
        </button>
      </div>
    </div>

    <div class="app-panel__body">
      <slot></slot>
    </div>

    <div v-if="$slots.footer" class="app-panel__footer">
      <slot name="footer"></slot>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useKeyboard } from '@/shared/composables/useKeyboard'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title: string
    position?: 'left' | 'right' | 'bottom'
    width?: 'md' | 'lg' | 'xl'
    showClose?: boolean
    resizable?: boolean
    resizeSide?: 'top' | 'bottom' | 'left' | 'right'
  }>(),
  {
    position: 'right',
    width: 'md',
    showClose: true,
    resizable: false,
    resizeSide: 'top',
  },
)

const emit = defineEmits<{
  close: []
  resize: [size: { width: number | null; height: number | null }]
  resizeEnd: [size: { width: number | null; height: number | null }]
  resizeReset: []
}>()

const close = () => {
  emit('close')
}

const panelRef = ref<HTMLElement | null>(null)
const isResizing = ref(false)
const resizedWidth = ref<number | null>(null)
const resizedHeight = ref<number | null>(null)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

const isHorizontalResize = computed(() => props.resizeSide === 'left' || props.resizeSide === 'right')

const panelStyle = computed(() => ({
  ...(resizedWidth.value === null ? {} : { '--app-panel-resized-width': `${resizedWidth.value}px` }),
  ...(resizedHeight.value === null ? {} : { '--app-panel-resized-height': `${resizedHeight.value}px` }),
}))

function emitResize() {
  emit('resize', {
    width: resizedWidth.value,
    height: resizedHeight.value,
  })
}

useKeyboard(
  'escape',
  () => {
    if (props.isOpen) close()
  },
  { prevent: true, exact: true },
)

function startResize(event: MouseEvent) {
  const rect = panelRef.value?.getBoundingClientRect()
  if (!props.resizable || !rect) return

  event.preventDefault()
  isResizing.value = true
  resizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    width: rect.width,
    height: rect.height,
  }
  window.addEventListener('mousemove', resizePanel)
  window.addEventListener('mouseup', stopResize, { once: true })
}

function resizePanel(event: MouseEvent) {
  if (!isResizing.value) return

  if (props.resizeSide === 'top') {
    const nextHeight = resizeStart.value.height + resizeStart.value.y - event.clientY
    resizedHeight.value = Math.min(window.innerHeight - 80, Math.max(160, Math.round(nextHeight)))
  } else if (props.resizeSide === 'bottom') {
    const nextHeight = resizeStart.value.height + event.clientY - resizeStart.value.y
    resizedHeight.value = Math.min(window.innerHeight - 80, Math.max(160, Math.round(nextHeight)))
  } else if (props.resizeSide === 'left') {
    const nextWidth = resizeStart.value.width + resizeStart.value.x - event.clientX
    resizedWidth.value = Math.min(window.innerWidth - 120, Math.max(260, Math.round(nextWidth)))
  } else {
    const nextWidth = resizeStart.value.width + event.clientX - resizeStart.value.x
    resizedWidth.value = Math.min(window.innerWidth - 120, Math.max(260, Math.round(nextWidth)))
  }

  emitResize()
}

function stopResize() {
  isResizing.value = false
  window.removeEventListener('mousemove', resizePanel)
  emit('resizeEnd', {
    width: resizedWidth.value,
    height: resizedHeight.value,
  })
}

function resetResize() {
  resizedWidth.value = null
  resizedHeight.value = null
  emit('resizeReset')
  emitResize()
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', resizePanel)
})
</script>

<style scoped>
.app-panel {
  position: absolute;
  z-index: var(--fabric-z-raised);
  display: flex;
  flex-direction: column;
  background-color: var(--fabric-app-panel-bg-surface);
  box-shadow: none;
}

.app-panel.surface-elevated {
  box-shadow: none;
}

.app-panel--resizing,
.app-panel--resizing * {
  user-select: none;
}

.app-panel__resize-handle {
  position: absolute;
  z-index: 2;
  background: transparent;
}

.app-panel__resize-handle:hover,
.app-panel--resizing .app-panel__resize-handle {
  background: color-mix(in srgb, var(--fabric-app-panel-accent) 28%, transparent);
}

.app-panel__resize-handle--top,
.app-panel__resize-handle--bottom {
  right: 0;
  left: 0;
  height: 6px;
  cursor: ns-resize;
}

.app-panel__resize-handle--top {
  top: -3px;
}

.app-panel__resize-handle--bottom {
  bottom: -3px;
}

.app-panel__resize-handle--left,
.app-panel__resize-handle--right {
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

.app-panel__resize-handle--left {
  left: -3px;
}

.app-panel__resize-handle--right {
  right: -3px;
}

/* ── Positioning ───────────────────────────────── */
.app-panel--right {
  top: 0;
  right: 0;
  bottom: 0;
  border-top: 0;
  border-left: 1px solid var(--fabric-app-panel-border);
  border-right: 0;
  border-bottom: 0;
}

.app-panel--left {
  top: 0;
  left: 0;
  bottom: 0;
  border-right: 1px solid var(--fabric-app-panel-border);
  border-top: 0;
  border-left: 0;
  border-bottom: 0;
}

.app-panel--bottom {
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--app-panel-resized-height, 300px);
  border-top: 1px solid var(--fabric-app-panel-border);
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
}

/* ── Widths (for left/right) ───────────────────── */
.app-panel--right.app-panel--md,
.app-panel--left.app-panel--md {
  width: var(--app-panel-resized-width, var(--fabric-app-panel-panel-width));
}
.app-panel--right.app-panel--lg,
.app-panel--left.app-panel--lg {
  width: var(--app-panel-resized-width, var(--fabric-app-panel-panel-width-wide));
}
.app-panel--right.app-panel--xl,
.app-panel--left.app-panel--xl {
  width: var(--app-panel-resized-width, 600px);
}

/* ── Layout ────────────────────────────────────── */
.app-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 var(--fabric-space-2) 0 var(--fabric-space-3);
  border-bottom: 1px solid var(--fabric-app-panel-border);
  background: var(--fabric-app-panel-workbench-panel-header-bg);
  flex-shrink: 0;
}

.app-panel__title {
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  line-height: 1;
  margin: 0;
}

.app-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-1);
}

.app-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: var(--fabric-app-panel-radius);
  color: var(--fabric-app-panel-text-secondary);
  transition: background-color var(--fabric-duration-fast);
}

.app-panel__close:hover {
  background-color: var(--fabric-app-panel-bg-muted);
  color: var(--fabric-app-panel-text-primary);
}

.app-panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.app-panel__footer {
  padding: var(--fabric-space-2) var(--fabric-space-3);
  border-top: 1px solid var(--fabric-app-panel-border);
  background-color: var(--fabric-app-panel-bg-surface);
  flex-shrink: 0;
}
</style>
