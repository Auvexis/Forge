<template>
  <div class="base-topbar-overflow-submenu" @click.stop @touchstart.stop>
    <BaseDropdownItem
      v-for="item in items"
      :key="item.id"
      :icon="item.icon"
      :label="item.label"
      :hint="item.hint"
      :shortcut="item.shortcut"
      :danger="item.danger"
      :disabled="item.disabled"
      @click="$emit('command', item.id)"
    />
  </div>
</template>

<script setup lang="ts">
import BaseDropdownItem from '@/shared/components/base/dropdown/BaseDropdownItem.vue'
import type { BaseTopbarOverflowMenuItem } from './BaseTopbarOverflowMenu.vue'

defineProps<{
  items: BaseTopbarOverflowMenuItem[]
}>()

defineEmits<{
  command: [id: string]
}>()
</script>

<style scoped>
.base-topbar-overflow-submenu {
  position: absolute;
  z-index: calc(var(--fabric-z-overlay) + 1);
  top: -5px;
  left: calc(100% + 6px);
  display: flex;
  min-width: 220px;
  flex-direction: column;
  gap: 2px;
  padding: 5px;
  border: 1px solid color-mix(in srgb, var(--fabric-app-dropdown-menu-border-strong) 76%, transparent);
  border-radius: var(--fabric-app-dropdown-menu-radius);
  background: var(--fabric-app-dropdown-menu-bg-surface);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
}
</style>
