<template>
  <AppDropdownMenu title="Plugin" position="bottom-start">
    <template #trigger>
      <button type="button" class="plugin-creator-command-menu__trigger" aria-label="Plugin creator menu">
        <Menu :size="16" />
      </button>
    </template>

    <AppDropdownItem label="New Plugin" icon="Plus" />
    <AppDropdownItem label="Open Plugin" icon="FolderOpen" />
    <AppDropdownItem label="Import Plugin" icon="Upload" />
    <AppDropdownDivider />
    <AppDropdownItem label="Export ZIP" icon="FileArchive" />
    <AppDropdownItem label="Export Folder" icon="FolderDown" />
    <AppDropdownItem label="GitHub Export" icon="Github" disabled />
    <AppDropdownDivider />
    <AppDropdownItem label="Plugin Settings" icon="Settings" />
    <AppDropdownItem label="Version History" icon="History" />
    <AppDropdownItem label="Advanced Code" icon="Code2" />
    <AppDropdownDivider />
    <AppDropdownItem label="Discard Draft" icon="Trash2" danger />
  </AppDropdownMenu>
</template>

<script setup lang="ts">
import { Menu } from 'lucide-vue-next'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
</script>

<style scoped>
.plugin-creator-command-menu__trigger {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--sailor-border);
  border-radius: 6px;
  background: var(--sailor-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
}
</style>
