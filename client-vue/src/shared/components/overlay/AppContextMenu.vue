<template>
  <Teleport to="body">
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
import { ref, provide, onMounted, onUnmounted } from 'vue'
import { vClickOutside } from '@/shared/directives/v-click-outside'
import { useKeyboard } from '@/shared/composables/useKeyboard'

const props = withDefaults(
  defineProps<{
    targetRef?: HTMLElement | null // Optional bound element, else global body
  }>(),
  {},
)

const isOpen = ref(false)
const x = ref(0)
const y = ref(0)
const menuRef = ref<HTMLElement | null>(null)

const open = (e: MouseEvent) => {
  e.preventDefault()

  // Basic boundary check to not go off-screen right/bottom
  // In a real app we'd measure after mounting, but here's a rough estimate
  const menuWidth = 220
  const menuHeight = 300

  let left = e.clientX
  let top = e.clientY

  if (left + menuWidth > window.innerWidth) {
    left = window.innerWidth - menuWidth - 10
  }

  if (top + menuHeight > window.innerHeight) {
    top = window.innerHeight - menuHeight - 10
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
    document.addEventListener('contextmenu', handleGlobalContext)
  }
})

onUnmounted(() => {
  if (props.targetRef) {
    props.targetRef.removeEventListener('contextmenu', open)
  } else {
    document.removeEventListener('contextmenu', handleGlobalContext)
  }
})

provide('closeDropdown', close)

defineExpose({ open, close, isOpen })
</script>

<style scoped>
.app-context-menu {
  position: fixed;
  z-index: var(--nod8-z-modal);
  min-width: 220px;
  border-radius: var(--nod8-radius-md);
  padding: var(--nod8-space-2);
  transform-origin: top left;
}

.app-dropdown-menu__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
