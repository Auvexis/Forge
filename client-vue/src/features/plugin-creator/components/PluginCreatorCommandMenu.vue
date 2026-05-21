<template>
  <AppDropdownMenu title="Plugin" position="bottom-start">
    <template #trigger>
      <button type="button" class="plugin-creator-command-menu__trigger" aria-label="Plugin creator menu">
        <Menu :size="16" />
        <span v-if="isDirty" class="plugin-creator-command-menu__dirty" aria-label="Unsaved changes" />
      </button>
    </template>

    <AppDropdownItem label="New Plugin" icon="Plus" @click="emit('newPlugin')" />
    <AppDropdownDivider />
    <AppDropdownItem label="Import Plugin" icon="Upload" disabled />
    <AppDropdownDivider />
    <AppDropdownItem
      label="Export ZIP"
      icon="FileArchive"
      :disabled="!activeBlueprint"
      @click="emit('exportZip')"
    />
    <AppDropdownItem label="Export Folder" icon="FolderDown" disabled />
    <AppDropdownItem label="GitHub Export" icon="Github" disabled />
    <AppDropdownDivider />
    <AppDropdownItem
      label="Plugin Settings"
      icon="Settings"
      :disabled="!activeBlueprint"
      @click="emit('settings')"
    />
    <AppDropdownItem
      label="Run"
      icon="Play"
      :disabled="!activeBlueprint"
      @click="emit('run')"
    />
    <AppDropdownItem
      label="Publish"
      icon="Rocket"
      :disabled="!activeBlueprint"
      @click="emit('publish')"
    />
    <AppDropdownItem label="Advanced Code" icon="Code2" disabled />
    <AppDropdownDivider />
    <AppDropdownItem
      label="Discard Draft"
      icon="Trash2"
      :disabled="!isDirty"
      danger
      @click="emit('discardDraft')"
    />
  </AppDropdownMenu>
</template>

<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

const props = withDefaults(
  defineProps<{
    activeBlueprint?: PluginBlueprint | null
    isDirty?: boolean
  }>(),
  {
    activeBlueprint: null,
    isDirty: false,
  },
)

const emit = defineEmits<{
  newPlugin: []
  exportZip: []
  settings: []
  run: []
  publish: []
  discardDraft: []
}>()
</script>

<style scoped>
.plugin-creator-command-menu__trigger {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0;
  border: 1px solid var(--sailor-border);
  border-radius: 6px;
  background: var(--sailor-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
}

.plugin-creator-command-menu__dirty {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--sailor-text-primary);
}
</style>
