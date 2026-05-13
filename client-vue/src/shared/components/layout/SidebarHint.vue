<template>
  <div
    class="sidebar-hint-wrapper"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    ref="wrapperRef"
  >
    <slot />

    <Teleport to="body">
      <Transition name="hint-fade">
        <div
          v-if="isVisible"
          class="sidebar-hint-modal surface"
          :style="modalStyle"
          ref="modalRef"
        >
          <div class="sidebar-hint-modal__image-wrapper">
            <img v-if="image" :src="image" alt="Feature Preview" class="sidebar-hint-modal__image" />
            <div v-else class="sidebar-hint-modal__placeholder">
              <LucideIcon :name="icon || 'sparkles'" :size="32" class="placeholder-icon" />
            </div>
          </div>
          
          <div class="sidebar-hint-modal__content">
            <h4 class="sidebar-hint-modal__title">
              <LucideIcon v-if="icon" :name="icon" :size="16" />
              {{ title }}
            </h4>
            <div class="sidebar-hint-modal__desc">
              {{ description }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  title: string
  description: string
  image?: string
  icon?: string
}>()

const isVisible = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const anchorRect = ref<DOMRect | null>(null)
let hoverTimer: number | null = null
let resizeObserver: ResizeObserver | null = null

// Estimated height for collision detection (image 140px + content ~80px + paddings)
const ESTIMATED_MODAL_HEIGHT = 220

function updatePosition() {
  if (!wrapperRef.value) {
    anchorRect.value = null
    return
  }

  const readRect = wrapperRef.value['getBoundingClientRect'].bind(wrapperRef.value)
  anchorRect.value = readRect()
}

const modalStyle = computed(() => {
  const rect = anchorRect.value
  if (!rect) return {}
  
  // Position to the right of the sidebar
  const left = rect.right + 12
  
  // Calculate vertical center relative to the hovered button
  let top = rect.top + (rect.height / 2) - (ESTIMATED_MODAL_HEIGHT / 2)
  
  // Window collision detection
  const margin = 16
  if (top < margin) {
    // If it hits the top, snap to margin
    top = margin
  } else if (top + ESTIMATED_MODAL_HEIGHT > window.innerHeight - margin) {
    // If it hits the bottom, snap to bottom margin
    top = window.innerHeight - ESTIMATED_MODAL_HEIGHT - margin
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

function handleMouseEnter() {
  if (hoverTimer) clearTimeout(hoverTimer)
  // Faster delay for snappier UI
  hoverTimer = window.setTimeout(() => {
    isVisible.value = true
    void nextTick(updatePosition)
  }, 150)
}

function handleMouseLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  isVisible.value = false
}

watch(isVisible, (visible) => {
  if (visible) updatePosition()
})

onMounted(() => {
  window.addEventListener('resize', updatePosition)
  window.addEventListener('scroll', updatePosition, true)

  if (wrapperRef.value) {
    resizeObserver = new ResizeObserver(updatePosition)
    resizeObserver.observe(wrapperRef.value)
  }
})

onBeforeUnmount(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.sidebar-hint-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.sidebar-hint-modal {
  position: fixed;
  z-index: 99999;
  width: 240px;
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-lg);
  box-shadow: var(--nod8-shadow-lg);
  display: flex;
  flex-direction: column;
  padding: var(--nod8-space-2);
  gap: var(--nod8-space-3);
  pointer-events: none;
}

.sidebar-hint-modal__image-wrapper {
  width: 100%;
  height: 120px;
  background-color: var(--nod8-bg-base);
  border-radius: var(--nod8-radius-md);
  border: 1px solid var(--nod8-border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sidebar-hint-modal__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-hint-modal__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nod8-text-muted);
}

.placeholder-icon {
  opacity: 0.3;
}

.sidebar-hint-modal__content {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
  padding: 0 var(--nod8-space-1) var(--nod8-space-1) var(--nod8-space-1);
}

.sidebar-hint-modal__title {
  margin: 0;
  font-size: var(--nod8-text-sm);
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nod8-text-primary);
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  letter-spacing: 0.5px;
}

.sidebar-hint-modal__desc {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-secondary);
  line-height: 1.5;
  max-height: 80px;
  overflow-y: auto;
}

.sidebar-hint-modal__desc::-webkit-scrollbar {
  width: 4px;
}
.sidebar-hint-modal__desc::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-hint-modal__desc::-webkit-scrollbar-thumb {
  background-color: var(--nod8-border-muted);
  border-radius: var(--nod8-radius-full);
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
