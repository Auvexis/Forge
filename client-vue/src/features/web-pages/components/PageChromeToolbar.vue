<template>
  <div class="web-page-chrome">
    <button type="button" class="web-page-chrome__exit" title="Back to pages" @click="$emit('command', 'go.pages')">
      <LucideIcon name="arrow-right" :size="15" />
    </button>
    <div class="web-page-chrome__divider"></div>

    <AppDropdownMenu
      v-for="menu in menus"
      :key="menu.id"
      position="bottom-start"
      :offset="2"
    >
      <template #trigger>
        <button type="button" class="web-page-chrome__menu">{{ menu.label }}</button>
      </template>
      <AppDropdownItem
        v-for="item in menu.items"
        :key="item.id"
        :label="item.label"
        :icon="item.icon"
        :danger="item.danger"
        @click="$emit('command', item.id)"
      />
    </AppDropdownMenu>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'

export type PageChromeCommand =
  | 'go.pages'
  | 'file.save'
  | 'file.preview'
  | 'file.publish'
  | 'edit.rename'
  | 'edit.duplicate'
  | 'edit.delete'
  | 'view.switch'
  | 'view.left-panel'
  | 'view.right-panel'

const menus: Array<{
  id: string
  label: string
  items: Array<{ id: PageChromeCommand; label: string; icon: string; danger?: boolean }>
}> = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'file.save', label: 'Save', icon: 'save' },
      { id: 'file.preview', label: 'Preview', icon: 'eye' },
      { id: 'file.publish', label: 'Publish', icon: 'send' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'edit.rename', label: 'Rename page', icon: 'pencil' },
      { id: 'edit.duplicate', label: 'Duplicate page', icon: 'copy' },
      { id: 'edit.delete', label: 'Delete page', icon: 'trash-2', danger: true },
    ],
  },
  {
    id: 'view',
    label: 'View',
    items: [
      { id: 'view.switch', label: 'Switch page', icon: 'files' },
      { id: 'view.left-panel', label: 'Toggle elements', icon: 'panel-left' },
      { id: 'view.right-panel', label: 'Toggle inspector', icon: 'panel-right' },
    ],
  },
]

defineEmits<{
  command: [command: PageChromeCommand]
}>()
</script>
