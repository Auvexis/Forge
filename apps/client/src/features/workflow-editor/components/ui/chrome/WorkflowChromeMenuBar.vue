<script setup lang="ts">
import { ref } from 'vue'
import BaseDropdownItem from '@/shared/components/base/dropdown/BaseDropdownItem.vue'
import BaseDropdownMenu from '@/shared/components/base/dropdown/BaseDropdownMenu.vue'
import { workflowChromeMenus } from './workflowChromeActions'
import type {
  WorkflowChromeActionOverrides,
  WorkflowChromeCommandId,
  WorkflowChromeMenu,
} from './workflowChrome.types'

const emit = defineEmits<{
  (e: 'command', id: WorkflowChromeCommandId): void
}>()

const props = defineProps<{
  disabledReasons?: Partial<Record<WorkflowChromeCommandId, string>>
  actionOverrides?: WorkflowChromeActionOverrides
}>()

const activeMenuId = ref<WorkflowChromeMenu['id'] | null>(null)
const menuRefs = new Map<WorkflowChromeMenu['id'], InstanceType<typeof BaseDropdownMenu>>()

function setMenuRef(id: WorkflowChromeMenu['id'], value: InstanceType<typeof BaseDropdownMenu> | null) {
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

function itemLabel(item: { id: WorkflowChromeCommandId; label: string }) {
  return props.actionOverrides?.[item.id]?.label ?? item.label
}

function itemIcon(item: { id: WorkflowChromeCommandId; icon?: string }) {
  return props.actionOverrides?.[item.id]?.icon ?? item.icon
}
</script>

<template>
  <nav class="wec-menu-bar topbar-route-menu-bar" aria-label="Workflow editor menu">
    <BaseDropdownMenu
      v-for="menu in workflowChromeMenus"
      :key="menu.id"
      :ref="(value) => setMenuRef(menu.id, value as InstanceType<typeof BaseDropdownMenu> | null)"
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

      <BaseDropdownItem
        v-for="item in menu.items"
        :key="item.id"
        :icon="itemIcon(item)"
        :label="itemLabel(item)"
        :hint="props.disabledReasons?.[item.id] ?? item.disabledReason"
        :disabled="!!(props.disabledReasons?.[item.id] ?? item.disabledReason)"
        @click="handleCommandClick(item.id)"
      />
    </BaseDropdownMenu>
  </nav>
</template>
