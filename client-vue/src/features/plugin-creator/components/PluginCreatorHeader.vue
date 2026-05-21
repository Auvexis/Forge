<template>
  <div class="plugin-creator-header">
    <PluginCreatorCommandMenu />
  </div>
</template>

<script setup lang="ts">
import PluginCreatorCommandMenu from './PluginCreatorCommandMenu.vue'

withDefaults(
  defineProps<{
    title?: string
    isDirty?: boolean
    isSaving?: boolean
  }>(),
  {
    title: 'Low-code plugin workspace',
    isDirty: false,
    isSaving: false,
  },
)

defineEmits<{
  settings: []
  versions: []
  run: []
  save: []
  publish: []
}>()
</script>

<style scoped>
.plugin-creator-header {
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--sailor-bg-base);
}
</style>
