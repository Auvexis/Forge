<template>
  <div class="plugin-creator-header">
    <PluginCreatorCommandMenu
      :active-blueprint="activeBlueprint"
      :blueprints="blueprints"
      :is-dirty="isDirty"
      @new-plugin="emit('newPlugin')"
      @open-plugin="emit('openPlugin', $event)"
      @export-zip="emit('exportZip')"
      @settings="emit('settings')"
      @versions="emit('versions')"
      @run="emit('run')"
      @publish="emit('publish')"
      @discard-draft="emit('discardDraft')"
    />
  </div>
</template>

<script setup lang="ts">
import PluginCreatorCommandMenu from './PluginCreatorCommandMenu.vue'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

withDefaults(
  defineProps<{
    title?: string
    activeBlueprint?: PluginBlueprint | null
    blueprints?: PluginBlueprint[]
    isDirty?: boolean
    isSaving?: boolean
  }>(),
  {
    title: 'Low-code plugin workspace',
    activeBlueprint: null,
    blueprints: () => [],
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
}
</style>
