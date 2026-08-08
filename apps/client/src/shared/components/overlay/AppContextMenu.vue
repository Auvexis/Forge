<template>
  <span ref="anchorRef" class="app-context-menu-anchor" aria-hidden="true"></span>
  <Teleport :to="overlayTarget">
    <Transition name="scale">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="app-context-menu surface-elevated"
        :style="{ top: `${y}px`, left: `${x}px` }"
        v-click-outside="close"
      >
        <div class="app-dropdown-menu__items">
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted } from 'vue'
import { vClickOutside } from '@/shared/directives/v-click-outside'
import { useKeyboard } from '@/shared/composables/useKeyboard'
import { ensureOverlayRoot, ownerDocumentOf, ownerWindowOf } from '@/shared/composables/useOverlayTarget'

const props = withDefaults(
  defineProps<{
    targetRef?: HTMLElement | null // Optional bound element, else global body
  }>(),
  {},
)

const isOpen = ref(false)
const x = ref(0)
const y = ref(0)
const anchorRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const overlayTarget = computed(() => ensureOverlayRoot(ownerDocumentOf(props.targetRef ?? anchorRef.value)))

const open = (e: MouseEvent) => {
  e.preventDefault()

  // Basic boundary check to not go off-screen right/bottom
  // In a real app we'd measure after mounting, but here's a rough estimate
  const menuWidth = 220
  const menuHeight = 300

  let left = e.clientX
  let top = e.clientY

  const ownerWindow = ownerWindowOf(e.target instanceof Element ? e.target : props.targetRef)

  if (left + menuWidth > ownerWindow.innerWidth) {
    left = ownerWindow.innerWidth - menuWidth - 10
  }

  if (top + menuHeight > ownerWindow.innerHeight) {
    top = ownerWindow.innerHeight - menuHeight - 10
  }

  x.value = left
  y.value = top
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const handleGlobalContext = (e: MouseEvent) => {
  if (props.targetRef) {
    if (props.targetRef.contains(e.target as Node)) {
      open(e)
    }
  } else {
    // If no target bound, attach to the document
    open(e)
  }
}

useKeyboard('escape', () => {
  if (isOpen.value) close()
})

onMounted(() => {
  if (props.targetRef) {
    props.targetRef.addEventListener('contextmenu', open)
  } else {
    ownerDocumentOf(anchorRef.value).addEventListener('contextmenu', handleGlobalContext)
  }
})

onUnmounted(() => {
  if (props.targetRef) {
    props.targetRef.removeEventListener('contextmenu', open)
  } else {
    ownerDocumentOf(anchorRef.value).removeEventListener('contextmenu', handleGlobalContext)
  }
})

provide('closeDropdown', close)

defineExpose({ open, close, isOpen })
</script>

<style scoped>
.app-context-menu-anchor {
  display: none;
}

.app-context-menu {
  position: fixed;
  z-index: var(--fabric-z-modal);
  min-width: 220px;
  border-radius: var(--fabric-app-context-menu-radius);
  padding: var(--fabric-space-2);
  transform-origin: top left;
}

.app-dropdown-menu__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
