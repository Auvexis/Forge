<template>
  <div class="plugin-creator-header">
    <PluginCreatorCommandMenu
      :active-blueprint="activeBlueprint"
      :is-dirty="isDirty"
      @new-plugin="emit('newPlugin')"
      @export-zip="emit('exportZip')"
      @settings="emit('settings')"
      @run="emit('run')"
      @publish="emit('publish')"
      @discard-draft="emit('discardDraft')"
    />
    <PluginCreatorPluginDropdown
      :active-blueprint="activeBlueprint"
      :blueprints="blueprints"
      @open-plugin="emit('openPlugin', $event)"
    />
    <PluginCreatorReleaseDropdown
      :active-blueprint="activeBlueprint"
      :versions="versions"
      @open-release-history="emit('versions')"
      @rollback="emit('rollback', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import PluginCreatorCommandMenu from './PluginCreatorCommandMenu.vue'
import PluginCreatorPluginDropdown from './PluginCreatorPluginDropdown.vue'
import PluginCreatorReleaseDropdown from './PluginCreatorReleaseDropdown.vue'
import type { PluginBlueprint, PluginCreatorVersionsResult } from '@/core/types/plugin-creator.types'

withDefaults(
  defineProps<{
    title?: string
    activeBlueprint?: PluginBlueprint | null
    blueprints?: PluginBlueprint[]
    versions?: PluginCreatorVersionsResult | null
    isDirty?: boolean
    isSaving?: boolean
  }>(),
  {
    title: 'Low-code plugin workspace',
    activeBlueprint: null,
    blueprints: () => [],
    versions: null,
    isDirty: false,
    isSaving: false,
  },
)

const emit = defineEmits<{
  newPlugin: []
  openPlugin: [blueprintId: string]
  exportZip: []
  discardDraft: []
  settings: []
  versions: []
  rollback: [snapshotId: string]
  run: []
  save: []
  publish: []
}>()
</script>

<style scoped>
.plugin-creator-header {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
