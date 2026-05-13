<script setup lang="ts">
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import { workflowChromeMenus } from './workflowChromeActions'
import type { WorkflowChromeCommandId } from './workflowChrome.types'

const emit = defineEmits<{
  (e: 'command', id: WorkflowChromeCommandId): void
}>()
</script>

<template>
  <nav class="wec-menu-bar" aria-label="Workflow editor menu">
    <AppDropdownMenu
      v-for="menu in workflowChromeMenus"
      :key="menu.id"
      position="bottom-start"
      :offset="2"
    >
      <template #trigger>
        <button class="wec-menu-trigger" type="button">{{ menu.label }}</button>
      </template>

      <AppDropdownItem
        v-for="item in menu.items"
        :key="item.id"
        :icon="item.icon"
        :label="item.label"
        :hint="item.disabledReason"
        :disabled="!!item.disabledReason"
        @click="emit('command', item.id)"
      />
    </AppDropdownMenu>
  </nav>
</template>
