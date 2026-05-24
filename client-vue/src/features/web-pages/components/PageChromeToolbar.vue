<template>
  <div class="web-page-chrome">
    <button type="button" class="web-page-chrome__exit" title="Back to pages" @click="$emit('command', 'go.pages')">
      <LucideIcon name="arrow-right" :size="15" />
    </button>
    <div class="web-page-chrome__divider"></div>

    <AppDropdownMenu
      v-for="menu in menus"
      :key="menu.id"
      :ref="(el) => registerMenuRef(menu.id, el)"
      position="bottom-start"
      :offset="2"
      @open="activeMenuId = menu.id"
      @close="handleMenuClose(menu.id)"
    >
      <template #trigger>
        <button
          type="button"
          class="web-page-chrome__menu"
          :class="{ 'web-page-chrome__menu--active': activeMenuId === menu.id }"
          @mouseenter="handleMenuMouseEnter(menu.id)"
        >
          {{ menu.label }}
        </button>
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

    <div class="web-page-chrome__divider"></div>
    <span
      class="web-page-chrome__publish-status"
      :class="{ 'web-page-chrome__publish-status--published': publishedAt }"
    >
      <LucideIcon :name="publishedAt ? 'radio-tower' : 'radio'" :size="15" />
      {{ publishedAt ? 'Published' : 'Draft' }}
    </span>
    <span class="web-page-chrome__save-status">
      <LucideIcon
        class="web-page-chrome__save-status-icon"
        :class="{ 'web-page-chrome__save-status-icon--spin': saveState === 'saving' }"
        :name="saveStatusIcon"
        :size="17"
      />
      {{ saveStatusLabel }}
    </span>
    <BaseButton size="sm" variant="ghost" @click="$emit('command', 'file.save')">
      <template #left>
        <span
          class="web-page-chrome__save-dot"
          :class="{
            'web-page-chrome__save-dot--dirty': isDirty,
            'web-page-chrome__save-dot--saving': isSaving,
          }"
          aria-hidden="true"
        />
      </template>
      Save
    </BaseButton>
    <BaseButton size="sm" variant="ghost" icon-left="eye" @click="$emit('command', 'file.preview')">
      Preview
    </BaseButton>
    <BaseButton size="sm" variant="ghost" icon-left="send" @click="$emit('command', 'file.publish')">
      Publish
    </BaseButton>
    <BaseButton
      size="sm"
      variant="ghost"
      icon-left="external-link"
      :disabled="!publishedAt"
      @click="$emit('command', 'file.openLive')"
    >
      Open live
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'

const props = defineProps<{
  isDirty?: boolean
  isSaving?: boolean
  publishedAt?: string | null
}>()

export type PageChromeCommand =
  | 'go.pages'
  | 'file.save'
  | 'file.preview'
  | 'file.publish'
  | 'file.openLive'
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
      { id: 'file.openLive', label: 'Open live', icon: 'external-link' },
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
const activeMenuId = ref<string | null>(null)
const menuRefs = ref<Record<string, InstanceType<typeof AppDropdownMenu> | null>>({})

defineEmits<{
  command: [command: PageChromeCommand]
}>()

const saveState = computed<'saving' | 'dirty' | 'saved'>(() => {
  if (props.isSaving) return 'saving'
  if (props.isDirty) return 'dirty'
  return 'saved'
})

const saveStatusLabel = computed(() => {
  if (saveState.value === 'saving') return 'Saving page...'
  if (saveState.value === 'dirty') return 'Unsaved changes'
  return 'Saved'
})

const saveStatusIcon = computed(() => {
  if (saveState.value === 'saving') return 'loader-circle'
  if (saveState.value === 'dirty') return 'cloud-alert'
  return 'cloud-check'
})

function registerMenuRef(menuId: string, menu: unknown) {
  menuRefs.value[menuId] = menu as InstanceType<typeof AppDropdownMenu> | null
}

function handleMenuMouseEnter(menuId: string) {
  if (!activeMenuId.value || activeMenuId.value === menuId) return
  openChromeMenu(menuId)
}

function openChromeMenu(menuId: string) {
  const previousMenuId = activeMenuId.value
  if (previousMenuId && previousMenuId !== menuId) menuRefs.value[previousMenuId]?.close()
  activeMenuId.value = menuId
  void nextTick(() => menuRefs.value[menuId]?.open())
}

function handleMenuClose(menuId: string) {
  if (activeMenuId.value === menuId) activeMenuId.value = null
}
</script>
