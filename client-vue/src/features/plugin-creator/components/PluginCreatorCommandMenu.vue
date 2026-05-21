<template>
  <AppDropdownMenu title="Plugin" position="bottom-start">
    <template #trigger>
      <button type="button" class="plugin-creator-command-menu__trigger" aria-label="Plugin creator menu">
        <Menu :size="16" />
        <span class="plugin-creator-command-menu__trigger-text">
          <strong>{{ activePluginTitle }}</strong>
          <small>{{ activePluginHandle }}</small>
        </span>
        <span v-if="isDirty" class="plugin-creator-command-menu__dirty" aria-label="Unsaved changes" />
      </button>
    </template>

    <AppDropdownItem label="New Plugin" icon="Plus" @click="emit('newPlugin')" />
    <AppDropdownDivider />
    <AppDropdownItem label="Open Plugin" icon="FolderOpen" disabled />
    <AppDropdownItem
      v-for="blueprint in blueprints"
      :key="blueprint.id"
      :label="blueprint.metadata.name"
      :hint="blueprint.metadata.handle"
      :icon="blueprint.id === activeBlueprint?.id ? 'Check' : 'FolderOpen'"
      :disabled="blueprint.id === activeBlueprint?.id"
      @click="emit('openPlugin', blueprint.id)"
    />
    <AppDropdownItem v-if="blueprints.length === 0" label="No saved plugins" icon="FolderOpen" disabled />
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
      label="Version History"
      icon="History"
      :disabled="!activeBlueprint"
      @click="emit('versions')"
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
import { computed } from 'vue'
import { Menu } from 'lucide-vue-next'
import AppDropdownMenu from '@/shared/components/overlay/Dropdown/AppDropdownMenu.vue'
import AppDropdownItem from '@/shared/components/overlay/Dropdown/AppDropdownItem.vue'
import AppDropdownDivider from '@/shared/components/overlay/Dropdown/AppDropdownDivider.vue'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

const props = withDefaults(
  defineProps<{
    activeBlueprint?: PluginBlueprint | null
    blueprints?: PluginBlueprint[]
    isDirty?: boolean
  }>(),
  {
    activeBlueprint: null,
    blueprints: () => [],
    isDirty: false,
  },
)

const emit = defineEmits<{
  newPlugin: []
  openPlugin: [blueprintId: string]
  exportZip: []
  settings: []
  versions: []
  run: []
  publish: []
  discardDraft: []
}>()

const activePluginTitle = computed(() => props.activeBlueprint?.metadata.name ?? 'Plugin Creator')
const activePluginHandle = computed(() =>
  props.activeBlueprint ? props.activeBlueprint.metadata.handle : 'No plugin selected',
)
</script>

<style scoped>
.plugin-creator-command-menu__trigger {
  min-width: 36px;
  max-width: min(280px, calc(100vw - 56px));
  height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--sailor-border);
  border-radius: 6px;
  background: var(--sailor-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
}

.plugin-creator-command-menu__trigger-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.05;
}

.plugin-creator-command-menu__trigger-text strong,
.plugin-creator-command-menu__trigger-text small {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-creator-command-menu__trigger-text strong {
  font-size: 12px;
  font-weight: 750;
}

.plugin-creator-command-menu__trigger-text small {
  margin-top: 2px;
  color: var(--sailor-text-secondary);
  font-size: 10px;
  font-weight: 650;
}

.plugin-creator-command-menu__dirty {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--sailor-text-primary);
}
</style>
