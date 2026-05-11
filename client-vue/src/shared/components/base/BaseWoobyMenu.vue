<template>
  <component
    :is="tag"
    ref="containerRef"
    class="base-floating-nav"
    :style="{ position: position, overflow: 'hidden' }"
    @mouseleave="hoveredEl = null"
    @mousemove="handleMouseMove"
  >
    <div class="wooby-pill" :style="pillStyle"></div>
    <slot />
  </component>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  tag: {
    type: String,
    default: 'nav',
  },
  position: {
    type: String,
    default: 'relative',
  },
  activeSelector: {
    type: String,
    default: '.active',
  },
  // Allows customizing the background color when hovering vs active
  hoverBackground: {
    type: String,
    default: 'var(--nod8-button-ghost-hover)',
  },
  activeBackground: {
    type: String,
    default: 'var(--nod8-button-ghost-active)',
  },
  // To allow padding offset calculations if needed
  inset: {
    type: Number,
    default: 0,
  },
})

const containerRef = ref<HTMLElement | null>(null)
const hoveredEl = ref<HTMLElement | null>(null)
const activeEl = ref<HTMLElement | null>(null)

// Pill metrics
const pillTop = ref(0)
const pillLeft = ref(0)
const pillWidth = ref(0)
const pillHeight = ref(0)
const pillOpacity = ref(0)

const updateActive = () => {
  if (!containerRef.value) return
  const el = containerRef.value.querySelector(props.activeSelector) as HTMLElement
  activeEl.value = el || null
}

let observer: MutationObserver | null = null

onMounted(() => {
  updateActive()
  // Observe class mutations on the container and its children to detect active state changes
  if (containerRef.value) {
    observer = new MutationObserver(() => {
      updateActive()
    })
    observer.observe(containerRef.value, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class'],
    })
  }

  // Small delay to ensure children are fully rendered before calculating first position
  setTimeout(() => {
    updateActive()
    updateMetrics()
  }, 50)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const handleMouseMove = (e: MouseEvent) => {
  if (!containerRef.value) return
  const target = e.target as HTMLElement

  // Find which direct child is being hovered
  const children = Array.from(containerRef.value.children)
  for (const child of children) {
    if (child.classList.contains('wooby-pill')) continue
    if (child.contains(target) || child === target) {
      hoveredEl.value = child as HTMLElement
      return
    }
  }
}

const updateMetrics = () => {
  const target = hoveredEl.value || activeEl.value
  if (!target) {
    pillOpacity.value = 0
    return
  }

  pillTop.value = target.offsetTop
  pillLeft.value = target.offsetLeft
  pillWidth.value = target.offsetWidth
  pillHeight.value = target.offsetHeight
  pillOpacity.value = 1
}

watch([hoveredEl, activeEl], async () => {
  await nextTick()
  updateMetrics()
})

const pillStyle = computed(() => {
  const isHovering = hoveredEl.value && hoveredEl.value !== activeEl.value
  return {
    opacity: pillOpacity.value,
    transform: `translate(${pillLeft.value + props.inset}px, ${pillTop.value + props.inset}px)`,
    width: `${pillWidth.value - props.inset * 2}px`,
    height: `${pillHeight.value - props.inset * 2}px`,
    background: isHovering ? props.hoverBackground : props.activeBackground,
  }
})
</script>

<style scoped>
.wooby-pill {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: var(--nod8-radius-sm);
  /* The amoeba/wooby bounce effect */
  transition:
    transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.3s ease,
    opacity 0.2s ease;
  pointer-events: none;
  z-index: 0;
}
</style>
