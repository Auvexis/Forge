<template>
  <section class="plugin-creator-plugin-settings">
    <h3>Plugin metadata</h3>
    <BaseInput
      :model-value="blueprint?.metadata.name ?? ''"
      label="Plugin name"
      placeholder="My API"
      @update:model-value="updateMetadata('name', String($event))"
    />
    <BaseInput
      :model-value="blueprint?.metadata.handle ?? ''"
      label="Plugin handle"
      placeholder="my-api"
      @update:model-value="updateMetadata('handle', String($event))"
    />
    <BaseInput
      :model-value="blueprint?.metadata.version ?? ''"
      label="Plugin version"
      placeholder="0.1.0"
      @update:model-value="updateMetadata('version', String($event))"
    />
    <BaseCodeEditor
      :model-value="blueprint?.metadata.description ?? ''"
      language="markdown"
      label="Description"
      height="140px"
      @update:model-value="updateMetadata('description', $event)"
    />
  </section>
</template>

<script setup lang="ts">
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import type { PluginBlueprint, PluginBlueprintMetadata } from '@/core/types/plugin-creator.types'

defineProps<{
  blueprint?: PluginBlueprint | null
}>()

const emit = defineEmits<{
  updateMetadata: [payload: Partial<PluginBlueprintMetadata>]
}>()

function updateMetadata(field: keyof PluginBlueprintMetadata, value: string) {
  emit('updateMetadata', { [field]: value })
}
</script>

<style scoped>
.plugin-creator-plugin-settings {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.plugin-creator-plugin-settings h3 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: 14px;
}
</style>
