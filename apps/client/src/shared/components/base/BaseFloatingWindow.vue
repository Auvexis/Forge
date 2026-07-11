<template>
  <aside
    class="base-floating-window"
    :class="{ 'base-floating-window--collapsed': isCollapsed }"
    :style="panelStyle"
    :aria-label="ariaLabel"
  >
    <header class="base-floating-window__header" @pointerdown="startDrag">
      <div class="base-floating-window__title">
        <slot name="title">
          <strong v-if="title">{{ title }}</strong>
        </slot>
        <slot name="subtitle">
          <small v-if="subtitle">{{ subtitle }}</small>
        </slot>
      </div>
      <div class="base-floating-window__actions">
        <slot name="actions" />
        <button
          v-if="collapsible"
          class="base-floating-window__collapse"
          type="button"
          :title="isCollapsed ? 'Expand window' : 'Collapse window'"
          @click="toggleCollapsed"
        >
          {{ isCollapsed ? '+' : '-' }}
        </button>
      </div>
    </header>
    <section v-if="!isCollapsed" class="base-floating-window__content">
      <slot />
    </section>
    <button
      v-if="resizable && !isCollapsed"
      class="base-floating-window__resize"
      type="button"
      title="Resize window"
      aria-label="Resize window"
      @pointerdown.stop="startResize"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    ariaLabel?: string
    storageKey?: string
    defaultX?: number
    defaultY?: number
    defaultWidth?: number
    defaultHeight?: number
    minWidth?: number
    minHeight?: number
    padding?: number
    resizable?: boolean
    collapsible?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    ariaLabel: 'Floating window',
    storageKey: '',
    defaultX: 16,
    defaultY: undefined,
    defaultWidth: 520,
    defaultHeight: 360,
    minWidth: 360,
    minHeight: 220,
    padding: 12,
    resizable: true,
    collapsible: true,
  },
)

const layout = reactive({
  x: props.defaultX,
  y: props.defaultY ?? 120,
  width: props.defaultWidth,
  height: props.defaultHeight,
})
const isCollapsed = ref(false)
let activeInteraction: {
  mode: 'drag' | 'resize'
  pointerX: number
  pointerY: number
  x: number
  y: number
  width: number
  height: number
} | null = null

const panelStyle = computed(() => ({
  left: `${layout.x}px`,
  top: `${layout.y}px`,
  width: `${layout.width}px`,
  height: isCollapsed.value ? 'auto' : `${layout.height}px`,
}))

onMounted(() => {
  restoreLayout()
  clampLayout()
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopInteraction)
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopInteraction)
  window.removeEventListener('resize', handleWindowResize)
})

function startDrag(event: PointerEvent) {
  if (event.button !== 0 || buttonTarget(event)) return
  startInteraction('drag', event)
}

function startResize(event: PointerEvent) {
  if (event.button !== 0) return
  startInteraction('resize', event)
}

function startInteraction(mode: 'drag' | 'resize', event: PointerEvent) {
  event.preventDefault()
  activeInteraction = {
    mode,
    pointerX: event.clientX,
    pointerY: event.clientY,
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!activeInteraction) return

  const deltaX = event.clientX - activeInteraction.pointerX
  const deltaY = event.clientY - activeInteraction.pointerY
  if (activeInteraction.mode === 'drag') {
    layout.x = activeInteraction.x + deltaX
    layout.y = activeInteraction.y + deltaY
  } else {
    layout.width = activeInteraction.width + deltaX
    layout.height = activeInteraction.height + deltaY
  }
  clampLayout()
}

function stopInteraction() {
  if (!activeInteraction) return
  activeInteraction = null
  persistLayout()
}

function handleWindowResize() {
  clampLayout()
  persistLayout()
}

function toggleCollapsed() {
  isCollapsed.value = !isCollapsed.value
  persistLayout()
}

function restoreLayout() {
  const restored = readStoredLayout()
  if (restored) {
    layout.x = restored.x
    layout.y = restored.y
    layout.width = restored.width
    layout.height = restored.height
    isCollapsed.value = restored.isCollapsed
    return
  }
  if (props.defaultY === undefined) {
    layout.y = Math.max(84, window.innerHeight - layout.height - 24)
  }
}

function readStoredLayout() {
  if (!props.storageKey) return null
  try {
    const raw = window.localStorage.getItem(props.storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<typeof layout> & { isCollapsed?: boolean }
    if (!isFiniteNumber(parsed.x) || !isFiniteNumber(parsed.y)) return null
    if (!isFiniteNumber(parsed.width) || !isFiniteNumber(parsed.height)) return null
    return {
      x: parsed.x,
      y: parsed.y,
      width: parsed.width,
      height: parsed.height,
      isCollapsed: Boolean(parsed.isCollapsed),
    }
  } catch {
    return null
  }
}

function persistLayout() {
  if (!props.storageKey) return
  try {
    window.localStorage.setItem(
      props.storageKey,
      JSON.stringify({
        ...layout,
        isCollapsed: isCollapsed.value,
      }),
    )
  } catch {
    // Layout persistence is optional; the floating window still works without storage.
  }
}

function clampLayout() {
  const maxWidth = Math.max(props.minWidth, window.innerWidth - props.padding * 2)
  const maxHeight = Math.max(props.minHeight, window.innerHeight - props.padding * 2)
  layout.width = Math.min(Math.max(layout.width, props.minWidth), maxWidth)
  layout.height = Math.min(Math.max(layout.height, props.minHeight), maxHeight)
  const visibleHeight = isCollapsed.value ? 52 : layout.height
  const maxX = Math.max(props.padding, window.innerWidth - layout.width - props.padding)
  const maxY = Math.max(props.padding, window.innerHeight - visibleHeight - props.padding)
  layout.x = Math.min(Math.max(layout.x, props.padding), maxX)
  layout.y = Math.min(Math.max(layout.y, props.padding), maxY)
}

function buttonTarget(event: PointerEvent) {
  return event.target instanceof HTMLElement && Boolean(event.target.closest('button'))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
</script>

<style scoped>
.base-floating-window {
  position: absolute;
  z-index: 17;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--fabric-border-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--fabric-bg-surface) 94%, transparent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.26);
  padding: 10px;
}

.base-floating-window--collapsed {
  min-height: 0;
}

.base-floating-window__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.base-floating-window__title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.base-floating-window__title :deep(strong) {
  color: var(--fabric-text-primary);
  font-size: 12px;
}

.base-floating-window__title :deep(small) {
  overflow: hidden;
  color: var(--fabric-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-floating-window__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.base-floating-window__collapse {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: 1px solid var(--fabric-border-subtle);
  border-radius: 6px;
  background: var(--fabric-bg-elevated);
  color: var(--fabric-text-primary);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
}

.base-floating-window__content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.base-floating-window__resize {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 18px;
  height: 18px;
  border: 0;
  border-right: 2px solid var(--fabric-border-strong);
  border-bottom: 2px solid var(--fabric-border-strong);
  background: transparent;
  cursor: nwse-resize;
  opacity: 0.7;
  touch-action: none;
}
</style>
