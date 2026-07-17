<template>
  <div class="web-page-chrome">
    <Teleport defer to="#fabric-topbar-left">
      <div class="web-page-chrome__topbar-menu">
        <AppDropdownMenu
          v-for="menu in resolvedMenus"
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
            :shortcut="item.shortcut"
            :disabled="isCommandDisabled(item.id)"
            :danger="item.danger"
            @click="$emit('command', item.id)"
          />
        </AppDropdownMenu>
      </div>
    </Teleport>

    <BaseRail aria-label="Pages tools">
      <section class="base-rail__group" aria-label="Project">
        <BaseRailItem
          icon="save"
          :dirty="isDirty || isSaving"
          :disabled="!resolvedCanSave"
          title="Save"
          @click="$emit('command', 'file.save')"
        />
        <BaseRailItem
          icon="eye"
          :disabled="!resolvedCanUseProjectActions"
          title="Preview"
          @click="$emit('command', 'file.preview')"
        />
        <BaseRailItem
          :icon="publishCommandIcon"
          :disabled="!resolvedCanUseProjectActions"
          :title="publishCommandLabel"
          @click="$emit('command', 'file.togglePublish')"
        />
        <BaseRailItem
          icon="external-link"
          :disabled="!publishedAt"
          title="Open live"
          @click="$emit('command', 'file.openLive')"
        />
      </section>

      <section v-if="resolvedShowPanelControls" class="base-rail__group" aria-label="Panels">
        <BaseRailItem
          icon="layout-dashboard"
          :active="!!isExplorerOpen"
          title="Explorer"
          @click="$emit('command', 'view.left-panel')"
        />
        <BaseRailItem
          icon="pencil"
          :active="!!isInspectorOpen"
          title="Inspector"
          @click="$emit('command', 'view.right-panel')"
        />
      </section>

      <section class="base-rail__group" aria-label="Edit">
        <BaseRailButtonToggleItem
          :model-value="!!isAutosaveEnabled"
          :disabled="isSaving || !resolvedCanUseProjectActions"
          :title="isAutosaveEnabled ? 'Autosave on' : 'Autosave off'"
          @update:model-value="$emit('toggle-autosave', $event)"
        />
        <BaseRailItem
          icon="undo-2"
          :disabled="!canUndo"
          title="Undo"
          @click="$emit('command', 'edit.undo')"
        />
        <BaseRailItem
          icon="redo-2"
          :disabled="!canRedo"
          title="Redo"
          @click="$emit('command', 'edit.redo')"
        />
      </section>
    </BaseRail>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import BaseRail from '@/shared/components/base/BaseRail.vue'
import BaseRailItem from '@/shared/components/base/BaseRailItem.vue'
import BaseRailButtonToggleItem from '@/shared/components/base/BaseRailButtonToggleItem.vue'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'

const props = defineProps<{
  isDirty?: boolean
  isSaving?: boolean
  canUndo?: boolean
  canRedo?: boolean
  publishedAt?: string | null
  isAutosaveEnabled?: boolean
  isExplorerOpen?: boolean
  isInspectorOpen?: boolean
  showPanelControls?: boolean
  canSave?: boolean
  canUseProjectActions?: boolean
}>()

export type PageChromeCommand =
  | 'go.home'
  | 'file.newProject'
  | 'file.openProject'
  | 'file.importProject'
  | 'file.projectSettings'
  | 'file.save'
  | 'file.preview'
  | 'file.togglePublish'
  | 'file.openLive'
  | 'file.exportProject'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.rename'
  | 'edit.duplicate'
  | 'edit.delete'
  | 'view.switch'
  | 'view.left-panel'
  | 'view.right-panel'

const menus: Array<{
  id: string
  label: string
  items: Array<{ id: PageChromeCommand; label: string; icon: string; shortcut?: string; danger?: boolean }>
}> = [
  {
    id: 'file',
    label: 'File',
    items: [
      { id: 'file.newProject', label: 'New project', icon: 'file-plus-2' },
      { id: 'file.openProject', label: 'Open project', icon: 'folder-open' },
      { id: 'file.importProject', label: 'Import project', icon: 'folder-up' },
      { id: 'file.projectSettings', label: 'Project settings', icon: 'settings-2' },
      { id: 'file.save', label: 'Save', icon: 'save' },
      { id: 'file.preview', label: 'Preview', icon: 'eye' },
      { id: 'file.togglePublish', label: 'Publish', icon: 'send' },
      { id: 'file.openLive', label: 'Open live', icon: 'external-link' },
      { id: 'file.exportProject', label: 'Export project', icon: 'download' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    items: [
      { id: 'edit.undo', label: 'Undo', icon: 'undo-2', shortcut: 'Ctrl Z' },
      { id: 'edit.redo', label: 'Redo', icon: 'redo-2', shortcut: 'Ctrl Y' },
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
      { id: 'view.left-panel', label: 'Toggle explorer', icon: 'panel-left', shortcut: 'Ctrl B' },
      { id: 'view.right-panel', label: 'Toggle inspector', icon: 'panel-right', shortcut: 'Ctrl I' },
    ],
  },
]
const activeMenuId = ref<string | null>(null)
const menuRefs = ref<Record<string, InstanceType<typeof AppDropdownMenu> | null>>({})

defineEmits<{
  command: [command: PageChromeCommand]
  'toggle-autosave': [enabled: boolean]
}>()

const saveShortcutLabel = computed(() => (
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
    ? 'Cmd S'
    : 'Ctrl S'
))
const publishCommandLabel = computed(() => (props.publishedAt ? 'Unpublish' : 'Publish'))
const publishCommandIcon = computed(() => (props.publishedAt ? 'radio' : 'send'))
const resolvedCanSave = computed(() => props.canSave ?? Boolean(props.isDirty))
const resolvedCanUseProjectActions = computed(() => props.canUseProjectActions ?? true)
const resolvedShowPanelControls = computed(() => props.showPanelControls ?? true)
const resolvedMenus = computed(() => menus.map((menu) => ({
  ...menu,
  items: menu.items.map((item) => {
    if (item.id === 'file.save') return { ...item, shortcut: saveShortcutLabel.value }
    if (item.id === 'file.togglePublish') {
      return { ...item, label: publishCommandLabel.value, icon: publishCommandIcon.value, danger: Boolean(props.publishedAt) }
    }
    return item
  }),
})))

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

function isCommandDisabled(command: PageChromeCommand) {
  if (command === 'file.save') return !resolvedCanSave.value
  if (command === 'file.preview' || command === 'file.togglePublish') return !resolvedCanUseProjectActions.value
  if (command === 'edit.undo') return !props.canUndo
  if (command === 'edit.redo') return !props.canRedo
  return false
}
</script>
