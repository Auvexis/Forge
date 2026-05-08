<template>
  <AppPopover ref="popoverRef" :position="position" :offset="offset">
    <template #trigger>
      <slot name="trigger"></slot>
    </template>

    <div class="app-dropdown-menu">
      <div v-if="title" class="app-dropdown-menu__header">
        <span class="app-dropdown-menu__title">{{ title }}</span>
      </div>

      <div v-if="$slots.fixed" class="app-dropdown-menu__items" style="padding-bottom: 0;">
        <BaseWoobyMenu>
          <slot name="fixed"></slot>
        </BaseWoobyMenu>
      </div>

      <div 
        class="app-dropdown-menu__items custom-scrollbar" 
        :style="maxHeight ? { maxHeight, overflowY: 'auto', overflowX: 'hidden' } : {}"
      >
        <BaseWoobyMenu>
          <slot></slot>
        </BaseWoobyMenu>
      </div>
    </div>
  </AppPopover>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import AppPopover from '../AppPopover.vue'
import BaseWoobyMenu from '../../base/BaseWoobyMenu.vue'

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

const closeDropdown = () => {
  popoverRef.value?.close()
}

// Provide close function for child items (AppDropdownItem)
provide('closeDropdown', closeDropdown)

defineExpose({ close: closeDropdown })
</script>

<style scoped>
.app-dropdown-menu {
  display: flex;
  flex-direction: column;
}

.app-dropdown-menu__header {
  padding: var(--nod8-space-2) var(--nod8-space-3);
  margin-bottom: var(--nod8-space-1);
  border-bottom: 1px solid var(--nod8-border);
}

.app-dropdown-menu__title {
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.app-dropdown-menu__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
