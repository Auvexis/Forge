<template>
  <aside
    class="plugin-creator-code-preview-minimap"
    :class="{ 'plugin-creator-code-preview-minimap--collapsed': isCollapsed }"
    :style="panelStyle"
    aria-label="Generated method preview"
  >
    <header class="plugin-creator-code-preview-minimap__header" @pointerdown="startDrag">
      <div class="plugin-creator-code-preview-minimap__title">
        <strong>Generated method</strong>
        <small>{{ isLoading ? 'Generating...' : previewLabel }}</small>
      </div>
      <button
        class="plugin-creator-code-preview-minimap__collapse"
        type="button"
        :title="isCollapsed ? 'Expand preview' : 'Collapse preview'"
        @click="toggleCollapsed"
      >
        {{ isCollapsed ? '+' : '-' }}
      </button>
    </header>
    <template v-if="!isCollapsed">
      <p v-if="error" class="plugin-creator-code-preview-minimap__error">{{ error }}</p>
      <BaseCodeEditor
        :model-value="selectedMethodCode"
        language="typescript"
        height="100%"
        readonly
      />
      <button
        class="plugin-creator-code-preview-minimap__resize"
        type="button"
        title="Resize preview"
        aria-label="Resize generated method preview"
        @pointerdown.stop="startResize"
      />
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRef } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'
import { usePluginCreatorCodePreview } from '../composables/usePluginCreatorCodePreview'
import {
  extractPluginCreatorMethodBlock,
  resolvePluginCreatorMethodHandle,
} from '../composables/usePluginCreatorMethodPreview'

const STORAGE_KEY = 'pluginCreator.codePreviewMinimap.layout'
const MIN_WIDTH = 360
const MIN_HEIGHT = 220
const VIEWPORT_PADDING = 12

const props = defineProps<{
  blueprint?: PluginBlueprint | null
  selectedNodeId?: string | null
}>()

const { code, isLoading, error } = usePluginCreatorCodePreview(toRef(props, 'blueprint'))
const layout = reactive({
  x: 16,
  y: 120,
  width: 520,
  height: 360,
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

const selectedMethodHandle = computed(() =>
  resolvePluginCreatorMethodHandle(props.blueprint, props.selectedNodeId),
)
const selectedMethodCode = computed(() =>
  extractPluginCreatorMethodBlock(code.value, selectedMethodHandle.value),
)
const previewLabel = computed(() =>
  selectedMethodHandle.value ? `${selectedMethodHandle.value} method block` : 'method block',
)
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
  layout.y = Math.max(84, window.innerHeight - layout.height - 24)
}

function readStoredLayout() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
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
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...layout,
        isCollapsed: isCollapsed.value,
      }),
    )
  } catch {
    // Layout persistence is optional; the preview must keep working without storage.
  }
}

function clampLayout() {
  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_PADDING * 2)
  const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - VIEWPORT_PADDING * 2)
  layout.width = Math.min(Math.max(layout.width, MIN_WIDTH), maxWidth)
  layout.height = Math.min(Math.max(layout.height, MIN_HEIGHT), maxHeight)
  const visibleHeight = isCollapsed.value ? 52 : layout.height
  const maxX = Math.max(VIEWPORT_PADDING, window.innerWidth - layout.width - VIEWPORT_PADDING)
  const maxY = Math.max(VIEWPORT_PADDING, window.innerHeight - visibleHeight - VIEWPORT_PADDING)
  layout.x = Math.min(Math.max(layout.x, VIEWPORT_PADDING), maxX)
  layout.y = Math.min(Math.max(layout.y, VIEWPORT_PADDING), maxY)
}

function buttonTarget(event: PointerEvent) {
  return event.target instanceof HTMLElement && Boolean(event.target.closest('button'))
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
</script>

<style scoped>
.plugin-creator-code-preview-minimap {
  position: absolute;
  z-index: 17;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 360px;
  min-height: 220px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--sailor-bg-surface) 94%, transparent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.26);
  padding: 10px;
}

.plugin-creator-code-preview-minimap--collapsed {
  min-height: 0;
}

.plugin-creator-code-preview-minimap__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: move;
  user-select: none;
  touch-action: none;
}

.plugin-creator-code-preview-minimap__title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plugin-creator-code-preview-minimap__header strong {
  color: var(--sailor-text-primary);
  font-size: 12px;
}

.plugin-creator-code-preview-minimap__header small,
.plugin-creator-code-preview-minimap__error {
  color: var(--sailor-text-muted);
  font-size: 11px;
}

.plugin-creator-code-preview-minimap__header small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-creator-code-preview-minimap__collapse {
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
}

.plugin-creator-code-preview-minimap__error {
  margin: 0;
}

.plugin-creator-code-preview-minimap__resize {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 18px;
  height: 18px;
  border: 0;
  border-right: 2px solid var(--sailor-border-strong);
  border-bottom: 2px solid var(--sailor-border-strong);
  background: transparent;
  cursor: nwse-resize;
  opacity: 0.7;
  touch-action: none;
}

.plugin-creator-code-preview-minimap :deep(.base-code-editor) {
  min-height: 0;
  flex: 1;
}

.plugin-creator-code-preview-minimap :deep(.base-code-editor__surface) {
  min-height: 0;
  flex: 1;
}
</style>
