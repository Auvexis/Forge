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
        >
          <div class="sidebar-hint-modal__image-wrapper">
            <!-- If no image provided, show a nice gradient placeholder -->
            <img v-if="image" :src="image" alt="Feature Preview" class="sidebar-hint-modal__image" />
            <div v-else class="sidebar-hint-modal__placeholder">
              <LucideIcon :name="icon || 'sparkles'" :size="32" class="placeholder-icon" />
            </div>
          </div>
          <div class="sidebar-hint-modal__content">
            <h4 class="sidebar-hint-modal__title">{{ title }}</h4>
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
import { ref, computed } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  title: string
  description: string
  image?: string
  icon?: string
}>()

const isVisible = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
let hoverTimer: number | null = null

// Calculate vertical center of the wrapper to position the modal
const modalStyle = computed(() => {
  if (!wrapperRef.value) return {}
  const rect = wrapperRef.value.getBoundingClientRect()
  // The sidebar is fixed on the left, usually its width is ~48px-64px
  // We'll place the modal to the right of the sidebar (e.g. at left: 60px)
  // And vertically align it to the center of the hovered button
  const left = rect.right + 12 // 12px gap
  
  // We want the modal vertically centered relative to the button
  // Wait, if we use top: rect.top, the modal drops down.
  // We'll use top: rect.top + rect.height/2, and transform: translateY(-50%)
  return {
    left: `${left}px`,
    top: `${rect.top + rect.height / 2}px`,
    transform: 'translateY(-50%)'
  }
})

function handleMouseEnter() {
  if (hoverTimer) clearTimeout(hoverTimer)
  // Delay slightly to avoid flashing when just moving mouse over
  hoverTimer = window.setTimeout(() => {
    isVisible.value = true
  }, 400)
}

function handleMouseLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  isVisible.value = false
}
</script>

<style scoped>
.sidebar-hint-wrapper {
  display: contents; /* So the wrapper doesn't break flex layouts of the parent */
}

/* Fallback if display: contents has issues with mouse events on some browsers,
   but we can also use display: inline-block or flex if wrapper is an element.
   Actually, display: contents doesn't reliably trigger mouseenter.
   Let's use a standard block or flex but we might need to inherit parent styles. 
   Wait, if we use display: flex it might break the gap in AppSidebar.
   Let's change it to just div and assume it wraps a flex child properly. */
.sidebar-hint-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.sidebar-hint-modal {
  position: fixed;
  z-index: 99999;
  width: 260px;
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-lg);
  box-shadow: var(--nod8-shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: none; /* User shouldn't interact with it */
}

/* The arrow pointing to the button */
.sidebar-hint-modal::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background-color: var(--nod8-bg-surface);
  border-left: 1px solid var(--nod8-border);
  border-bottom: 1px solid var(--nod8-border);
}

.sidebar-hint-modal__image-wrapper {
  width: 100%;
  height: 120px;
  background-color: var(--nod8-bg-muted);
  border-bottom: 1px solid var(--nod8-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-hint-modal__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-hint-modal__placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--nod8-bg-surface) 0%, var(--nod8-bg-muted) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nod8-text-muted);
}

.placeholder-icon {
  opacity: 0.5;
}

.sidebar-hint-modal__content {
  padding: var(--nod8-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.sidebar-hint-modal__title {
  margin: 0;
  font-size: var(--nod8-text-sm);
  font-weight: 600;
  color: var(--nod8-text-primary);
}

.sidebar-hint-modal__desc {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  line-height: 1.4;
  max-height: 80px;
  overflow-y: auto;
}

/* Custom scrollbar for description */
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

/* Transitions */
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(-10px);
}
</style>
