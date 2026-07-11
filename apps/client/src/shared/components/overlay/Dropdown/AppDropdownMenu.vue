<template>
  <AppPopover
    ref="popoverRef"
    :position="position"
    :offset="offset"
    @open="emit('open')"
    @close="emit('close')"
  >
    <template #trigger>
      <slot name="trigger"></slot>
    </template>

    <div class="app-dropdown-menu">
      <div v-if="title" class="app-dropdown-menu__header">
        <span class="app-dropdown-menu__title">{{ title }}</span>
      </div>

      <div v-if="$slots.fixed" class="app-dropdown-menu__fixed">
        <slot name="fixed"></slot>
      </div>

      <div
        class="app-dropdown-menu__items custom-scrollbar"
        :style="maxHeight ? { maxHeight, overflowY: 'auto', overflowX: 'hidden' } : {}"
      >
        <slot></slot>
      </div>
    </div>
  </AppPopover>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import AppPopover from '../AppPopover.vue'

withDefaults(
  defineProps<{
    title?: string
    position?: 'bottom-start' | 'bottom-end' | 'bottom-center'
    offset?: number
    maxHeight?: string
  }>(),
  {
    position: 'bottom-start',
    offset: 8,
  },
)

const popoverRef = ref<InstanceType<typeof AppPopover> | null>(null)
const emit = defineEmits<{
  open: []
  close: []
}>()

const closeDropdown = () => {
  popoverRef.value?.close()
}

const openDropdown = () => {
  popoverRef.value?.open()
}

const toggleDropdown = () => {
  popoverRef.value?.toggle()
}

// Provide close function for child items (AppDropdownItem)
provide('closeDropdown', closeDropdown)

defineExpose({ close: closeDropdown, open: openDropdown, toggle: toggleDropdown })
</script>

<style scoped>
.app-dropdown-menu {
  display: flex;
  flex-direction: column;
}

.app-dropdown-menu__header {
  padding: var(--fabric-space-2) var(--fabric-space-3);
  margin-bottom: var(--fabric-space-1);
  border-bottom: 1px solid var(--fabric-border);
}

.app-dropdown-menu__title {
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  color: var(--fabric-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.app-dropdown-menu__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-dropdown-menu__fixed {
  display: flex;
  flex-direction: column;
  padding-bottom: 0;
}
</style>
