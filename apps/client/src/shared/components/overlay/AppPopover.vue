<template>
  <div class="app-popover-wrapper" v-click-outside="close">
    <!-- Trigger -->
    <div class="app-popover-trigger" @click="toggle" ref="triggerRef">
      <slot name="trigger"></slot>
    </div>

    <!-- Content -->
    <Teleport :to="overlayTarget">
      <Transition name="scale">
        <div
          v-if="isOpen"
          ref="contentRef"
          class="app-popover-content"
          :class="[`app-popover--${position}`, contentClass]"
          :style="contentStyle"
        >
          <slot></slot>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { vClickOutside } from '@/shared/directives/v-click-outside'
import { ownerWindowOf, useOverlayTarget } from '@/shared/composables/useOverlayTarget'

const props = withDefaults(
  defineProps<{
    position?:
      | 'bottom-start'
      | 'bottom-end'
      | 'bottom-center'
      | 'top-start'
      | 'top-end'
      | 'top-center'
      | 'left'
      | 'right'
    offset?: number
    contentClass?: string
  }>(),
  {
    position: 'bottom-start',
    offset: 8,
    contentClass: '',
  },
)

const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const triggerRect = ref<DOMRect | null>(null)
const overlayTarget = useOverlayTarget(triggerRef)
const emit = defineEmits<{
  open: []
  close: []
}>()

const toggle = () => {
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

const open = () => {
  updateRect()
  isOpen.value = true
  emit('open')
}

const close = () => {
  if (!isOpen.value) return
  isOpen.value = false
  emit('close')
}

const updateRect = () => {
  if (triggerRef.value) {
    triggerRect.value = triggerRef.value.getBoundingClientRect()
  }
}

// Calculate absolute positioning based on fixed trigger bounds
const contentStyle = computed(() => {
  if (!triggerRect.value) return {}

  const rect = triggerRect.value
  let top = 0
  let left = 0

  // We don't know the content size until it renders, so we use top/left with CSS transforms for alignment where needed.
  // A complete implementation would use a library like Floating UI for robust collision detection.
  // Here we do a basic calculation.

  switch (props.position) {
    case 'bottom-start':
      top = rect.bottom + props.offset
      left = rect.left
      break
    case 'bottom-end':
      top = rect.bottom + props.offset
      left = rect.right
      break
    case 'bottom-center':
      top = rect.bottom + props.offset
      left = rect.left + rect.width / 2
      break
    case 'top-start':
      top = rect.top - props.offset
      left = rect.left
      break
    case 'top-end':
      top = rect.top - props.offset
      left = rect.right
      break
    case 'top-center':
      top = rect.top - props.offset
      left = rect.left + rect.width / 2
      break
    case 'right':
      top = rect.top + rect.height / 2
      left = rect.right + props.offset
      break
    case 'left':
      top = rect.top + rect.height / 2
      left = rect.left - props.offset
      break
  }

  return {
    top: `${top}px`,
    left: `${left}px`,
  }
})

// Auto-update position on window resize/scroll if open
const handleScrollResize = () => {
  if (isOpen.value) {
    updateRect()
  }
}

onMounted(() => {
  const ownerWindow = ownerWindowOf(triggerRef.value)
  ownerWindow.addEventListener('scroll', handleScrollResize, true) // capture phase for any scrolling container
  ownerWindow.addEventListener('resize', handleScrollResize)
})

onBeforeUnmount(() => {
  const ownerWindow = ownerWindowOf(triggerRef.value)
  ownerWindow.removeEventListener('scroll', handleScrollResize, true)
  ownerWindow.removeEventListener('resize', handleScrollResize)
})

defineExpose({ open, close, toggle, isOpen })
</script>

<style scoped>
.app-popover-wrapper {
  height: 100%;
  width: fit-content;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-popover-trigger {
  display: inline-flex;
  cursor: pointer;
  height: 100%;
  width: 100%;
  border-radius: var(--fabric-app-popover-trigger-radius);
  background: var(--fabric-app-popover-trigger-bg);
  color: var(--fabric-app-popover-trigger-text);
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-out),
    color var(--fabric-duration-fast) var(--fabric-ease-out);
}

.app-popover-trigger:hover {
  background: var(--fabric-app-popover-trigger-hover-bg);
  color: var(--fabric-app-popover-trigger-hover-text);
}

.app-popover-content {
  position: fixed;
  z-index: var(--fabric-z-overlay);
  min-width: 200px;
  padding: var(--fabric-space-2);
  border: 1px solid var(--fabric-app-popover-border);
  border-radius: var(--fabric-app-popover-radius);
  margin-top: 1px;
  background-color: var(--fabric-app-popover-bg);
  color: var(--fabric-app-popover-text);
  box-shadow: var(--fabric-app-popover-shadow);
}

.app-popover-content--dropdown {
  min-width: 0;
  padding: 0;
  border: var(--fabric-app-popover-dropdown-border);
  border-radius: var(--fabric-app-popover-edge-radius);
  margin-top: 0;
  background: var(--fabric-app-popover-dropdown-bg);
  color: var(--fabric-app-popover-dropdown-text);
  box-shadow: var(--fabric-app-popover-dropdown-shadow);
}

.app-popover--bottom-start {
  transform: translateX(0);
}
.app-popover--bottom-end {
  transform: translateX(-100%);
}
.app-popover--bottom-center {
  transform: translateX(-50%);
}

.app-popover--top-start {
  transform: translateY(-100%);
}
.app-popover--top-end {
  transform: translate(-100%, -100%);
}
.app-popover--top-center {
  transform: translate(-50%, -100%);
}

.app-popover--right {
  transform: translateY(-50%);
}
.app-popover--left {
  transform: translate(-100%, -50%);
}
</style>
