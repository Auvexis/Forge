<template>
  <Teleport to="body">
    <svg
      v-if="bindingStore.pickWhip"
      class="web-page-action-pick-whip"
      aria-hidden="true"
    >
      <path :d="path" />
      <circle :cx="bindingStore.pickWhip.origin.x" :cy="bindingStore.pickWhip.origin.y" r="3" />
      <circle :cx="bindingStore.pickWhip.pointer.x" :cy="bindingStore.pickWhip.pointer.y" r="4" />
    </svg>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import { usePageActionBindingsStore } from '../stores/page-action-bindings.store'

const bindingStore = usePageActionBindingsStore()

const path = computed(() => {
  const state = bindingStore.pickWhip
  if (!state) return ''
  const middleX = state.origin.x + (state.pointer.x - state.origin.x) * 0.5
  return [
    `M ${state.origin.x} ${state.origin.y}`,
    `C ${middleX} ${state.origin.y}, ${middleX} ${state.pointer.y}, ${state.pointer.x} ${state.pointer.y}`,
  ].join(' ')
})

watch(
  () => bindingStore.isPicking,
  (isPicking) => {
    document.documentElement.classList.toggle('web-page-action-pick-whip-active', isPicking)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.documentElement.classList.remove('web-page-action-pick-whip-active')
})
</script>
