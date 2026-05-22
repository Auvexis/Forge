<template>
  <BaseFloatingWindow
    class="plugin-creator-code-preview-minimap"
    aria-label="Generated method preview"
    storage-key="pluginCreator.codePreviewMinimap.layout"
    :default-width="520"
    :default-height="360"
    :min-width="360"
    :min-height="220"
  >
    <template #title>
      <strong>Node preview</strong>
    </template>
    <template #subtitle>
      <small>{{ preview.label }}</small>
    </template>

    <BaseCodeEditor
      :model-value="preview.code"
      language="typescript"
      height="100%"
      readonly
    />
  </BaseFloatingWindow>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseFloatingWindow from '@/shared/components/base/BaseFloatingWindow.vue'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'
import {
  resolvePluginCreatorSelectedNodePreview,
} from '../composables/usePluginCreatorMethodPreview'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
  selectedNodeId?: string | null
}>()

const blueprintRef = toRef(props, 'blueprint')
const preview = computed(() =>
  resolvePluginCreatorSelectedNodePreview({
    blueprint: blueprintRef.value,
    selectedNodeId: props.selectedNodeId,
  }),
)
</script>

<style scoped>
.plugin-creator-code-preview-minimap :deep(.base-code-editor) {
  min-height: 0;
  flex: 1;
}

.plugin-creator-code-preview-minimap :deep(.base-code-editor__surface) {
  min-height: 0;
  flex: 1;
}
</style>
