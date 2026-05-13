<script setup lang="ts">
import { ref } from 'vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import { workflowChromeMenus } from './workflowChromeActions'
import type { WorkflowChromeCommandId, WorkflowChromeMenu } from './workflowChrome.types'

const emit = defineEmits<{
  (e: 'command', id: WorkflowChromeCommandId): void
}>()

const props = defineProps<{
  disabledReasons?: Partial<Record<WorkflowChromeCommandId, string>>
}>()

const activeMenuId = ref<WorkflowChromeMenu['id'] | null>(null)
const menuRefs = new Map<WorkflowChromeMenu['id'], InstanceType<typeof AppDropdownMenu>>()

function setMenuRef(id: WorkflowChromeMenu['id'], value: InstanceType<typeof AppDropdownMenu> | null) {
  if (value) menuRefs.set(id, value)
  else menuRefs.delete(id)
}

function handleMenuOpen(id: WorkflowChromeMenu['id']) {
  for (const [menuId, menuRef] of menuRefs) {
    if (menuId !== id) menuRef.close()
  }
  activeMenuId.value = id
}

function handleMenuClose(id: WorkflowChromeMenu['id']) {
  if (activeMenuId.value === id) activeMenuId.value = null
}

function handleMenuHover(id: WorkflowChromeMenu['id']) {
  if (!activeMenuId.value || activeMenuId.value === id) return
  menuRefs.get(activeMenuId.value)?.close()
  menuRefs.get(id)?.open()
  activeMenuId.value = id
}

function handleCommandClick(id: WorkflowChromeCommandId) {
  activeMenuId.value = null
  emit('command', id)
}
</script>

<template>
  <nav class="wec-menu-bar" aria-label="Workflow editor menu">
    <AppDropdownMenu
      v-for="menu in workflowChromeMenus"
      :key="menu.id"
      :ref="(value) => setMenuRef(menu.id, value as InstanceType<typeof AppDropdownMenu> | null)"
      position="bottom-start"
      :offset="2"
      @open="handleMenuOpen(menu.id)"
      @close="handleMenuClose(menu.id)"
    >
      <template #trigger>
        <button
          class="wec-menu-trigger"
          :class="{ 'wec-menu-trigger--active': activeMenuId === menu.id }"
          type="button"
          @mouseenter="handleMenuHover(menu.id)"
        >
          {{ menu.label }}
        </button>
      </template>

      <AppDropdownItem
        v-for="item in menu.items"
        :key="item.id"
        :icon="item.icon"
        :label="item.label"
        :hint="props.disabledReasons?.[item.id] ?? item.disabledReason"
        :disabled="!!(props.disabledReasons?.[item.id] ?? item.disabledReason)"
        @click="handleCommandClick(item.id)"
      />
    </AppDropdownMenu>
  </nav>
</template>
