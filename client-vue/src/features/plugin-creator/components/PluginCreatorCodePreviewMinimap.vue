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
      <strong>Generated method</strong>
    </template>
    <template #subtitle>
      <small>{{ isLoading ? 'Generating...' : previewLabel }}</small>
    </template>

    <p v-if="error" class="plugin-creator-code-preview-minimap__error">{{ error }}</p>
    <BaseCodeEditor
      :model-value="selectedMethodCode"
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
import { usePluginCreatorCodePreview } from '../composables/usePluginCreatorCodePreview'
import {
  extractPluginCreatorMethodBlock,
  hasPluginCreatorMethodSteps,
  resolvePluginCreatorMethodHandle,
} from '../composables/usePluginCreatorMethodPreview'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
  selectedNodeId?: string | null
}>()

const { code, isLoading, error } = usePluginCreatorCodePreview(toRef(props, 'blueprint'))

const selectedMethodHandle = computed(() =>
  resolvePluginCreatorMethodHandle(props.blueprint, props.selectedNodeId),
)
const selectedMethodCode = computed(() => {
  if (!hasPluginCreatorMethodSteps(props.blueprint, selectedMethodHandle.value)) return ''
  return extractPluginCreatorMethodBlock(code.value, selectedMethodHandle.value)
})
const previewLabel = computed(() =>
  selectedMethodHandle.value ? `${selectedMethodHandle.value} method block` : 'method block',
)
</script>

<style scoped>
.plugin-creator-code-preview-minimap__error {
  margin: 0 0 8px;
  color: var(--sailor-text-muted);
  font-size: 11px;
}

.plugin-creator-code-preview-minimap :deep(.base-code-editor) {
  min-height: 0;
  flex: 1;
}

.plugin-creator-code-preview-minimap :deep(.base-code-editor__surface) {
  min-height: 0;
  flex: 1;
}
</style>
