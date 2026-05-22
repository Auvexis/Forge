<template>
  <aside class="plugin-creator-code-preview-minimap" aria-label="Generated method preview">
    <header class="plugin-creator-code-preview-minimap__header">
      <strong>Generated method</strong>
      <small>{{ isLoading ? 'Generating...' : 'methods.ts' }}</small>
    </header>
    <p v-if="error" class="plugin-creator-code-preview-minimap__error">{{ error }}</p>
    <BaseCodeEditor
      :model-value="code"
      language="typescript"
      height="100%"
      readonly
    />
  </aside>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'
import { usePluginCreatorCodePreview } from '../composables/usePluginCreatorCodePreview'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
}>()

const { code, isLoading, error } = usePluginCreatorCodePreview(toRef(props, 'blueprint'))
</script>

<style scoped>
.plugin-creator-code-preview-minimap {
  position: absolute;
  right: 16px;
  top: 84px;
  z-index: 18;
  width: min(360px, calc(100vw - 32px));
  height: min(46vh, 420px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--sailor-bg-surface) 94%, transparent);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.26);
  padding: 10px;
}

.plugin-creator-code-preview-minimap__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.plugin-creator-code-preview-minimap__header strong {
  color: var(--sailor-text-primary);
  font-size: 12px;
}

.plugin-creator-code-preview-minimap__header small,
.plugin-creator-code-preview-minimap__error {
  color: var(--sailor-text-muted);
  font-size: 11px;
}

.plugin-creator-code-preview-minimap__error {
  margin: 0;
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
