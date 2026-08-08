<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { AppHintContent, HintPosition } from './AppHint.types'
import { ownerWindowOf, useOverlayTarget } from '@/shared/composables/useOverlayTarget'

const props = defineProps<{
  hint: AppHintContent
}>()

const isVisible = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const anchorRect = ref<DOMRect | null>(null)
const overlayTarget = useOverlayTarget(wrapperRef)
let hoverTimer: number | null = null
let resizeObserver: ResizeObserver | null = null

const CARD_WIDTH = 260
const CARD_HEIGHT = 230
const GAP = 12
const VIEWPORT_MARGIN = 16

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function updatePosition() {
  anchorRect.value = wrapperRef.value?.getBoundingClientRect() ?? null
}

function preferredPosition(position: HintPosition, rect: DOMRect) {
  if (position === 'left') {
    return {
      left: rect.left - CARD_WIDTH - GAP,
      top: rect.top + rect.height / 2 - CARD_HEIGHT / 2,
    }
  }
  if (position === 'top') {
    return {
      left: rect.left + rect.width / 2 - CARD_WIDTH / 2,
      top: rect.top - CARD_HEIGHT - GAP,
    }
  }
  if (position === 'bottom') {
    return {
      left: rect.left + rect.width / 2 - CARD_WIDTH / 2,
      top: rect.bottom + GAP,
    }
  }
  return {
    left: rect.right + GAP,
    top: rect.top + rect.height / 2 - CARD_HEIGHT / 2,
  }
}

const hintStyle = computed(() => {
  const rect = anchorRect.value
  if (!rect) return {}
  const ownerWindow = ownerWindowOf(wrapperRef.value)

  const preferred = preferredPosition(props.hint.position ?? 'right', rect)
  return {
    left: `${clamp(preferred.left, VIEWPORT_MARGIN, ownerWindow.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN)}px`,
    top: `${clamp(preferred.top, VIEWPORT_MARGIN, ownerWindow.innerHeight - CARD_HEIGHT - VIEWPORT_MARGIN)}px`,
  }
})

function showHint() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = window.setTimeout(() => {
    isVisible.value = true
    void nextTick(updatePosition)
  }, 150)
}

function hideHint() {
  if (hoverTimer) clearTimeout(hoverTimer)
  isVisible.value = false
}

watch(isVisible, (visible) => {
  if (visible) updatePosition()
})

onMounted(() => {
  const ownerWindow = ownerWindowOf(wrapperRef.value)
  ownerWindow.addEventListener('resize', updatePosition)
  ownerWindow.addEventListener('scroll', updatePosition, true)

  if (wrapperRef.value) {
    resizeObserver = new ResizeObserver(updatePosition)
    resizeObserver.observe(wrapperRef.value)
  }
})

onBeforeUnmount(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
  const ownerWindow = ownerWindowOf(wrapperRef.value)
  ownerWindow.removeEventListener('resize', updatePosition)
  ownerWindow.removeEventListener('scroll', updatePosition, true)
  resizeObserver?.disconnect()
})
</script>

<template>
  <span ref="wrapperRef" class="app-hint" @mouseenter="showHint" @mouseleave="hideHint">
    <slot />

    <Teleport :to="overlayTarget">
      <Transition name="app-hint-fade">
        <aside v-if="isVisible" class="app-hint__card surface" :style="hintStyle">
          <div class="app-hint__media">
            <img
              v-if="hint.gif"
              class="app-hint__image"
              :src="hint.gif"
              :alt="hint.title"
            />
            <img
              v-else-if="hint.image"
              class="app-hint__image"
              :src="hint.image"
              :alt="hint.title"
            />
            <div v-else class="app-hint__placeholder">{{ hint.title }}</div>
          </div>
          <div class="app-hint__content">
            <h4>{{ hint.title }}</h4>
            <p>{{ hint.description }}</p>
          </div>
        </aside>
      </Transition>
    </Teleport>
  </span>
</template>

<style scoped>
.app-hint {
  display: inline-flex;
}

.app-hint__card {
  position: fixed;
  z-index: 99999;
  width: 260px;
  min-height: 210px;
  max-height: 230px;
  padding: var(--fabric-space-2);
  background: var(--fabric-app-hint-bg-surface);
  border: 1px solid var(--fabric-app-hint-border);
  border-radius: var(--fabric-app-hint-radius);
  box-shadow: var(--fabric-app-hint-shadow-lg);
  pointer-events: none;
}

.app-hint__media {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--fabric-app-hint-bg-base);
  border: 1px solid var(--fabric-app-hint-border-subtle);
  border-radius: var(--fabric-app-hint-preview-radius);
}

.app-hint__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-hint__placeholder {
  padding: var(--fabric-space-3);
  color: var(--fabric-app-hint-text-muted);
  font-size: var(--fabric-text-xs);
  text-align: center;
}

.app-hint__content {
  padding: var(--fabric-space-3) var(--fabric-space-1) var(--fabric-space-1);
}

.app-hint__content h4 {
  margin: 0 0 var(--fabric-space-2);
  color: var(--fabric-app-hint-text-primary);
  font-size: var(--fabric-text-sm);
}

.app-hint__content p {
  margin: 0;
  color: var(--fabric-app-hint-text-secondary);
  font-size: var(--fabric-text-xs);
  line-height: 1.5;
}

.app-hint-fade-enter-active,
.app-hint-fade-leave-active {
  transition:
    opacity var(--fabric-duration-fast) var(--fabric-ease-standard),
    transform var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.app-hint-fade-enter-from,
.app-hint-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
