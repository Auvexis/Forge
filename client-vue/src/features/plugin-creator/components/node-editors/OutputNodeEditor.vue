<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="Output"
      eyebrow="Method result"
      description="Describe the typed output fields returned by this method."
    >
      <div v-for="(mapping, index) in mappings" :key="mapping.id" class="node-editor-row">
        <BaseInput
          :model-value="mapping.outputName"
          label="Output field"
          placeholder="customer"
          @update:model-value="updateMapping(index, { outputName: String($event) })"
        />
        <BaseInput
          :model-value="mapping.path"
          label="Source path"
          placeholder="body.data"
          @update:model-value="updateMapping(index, { path: String($event) })"
        />
        <BaseSelect
          :model-value="mapping.type"
          :options="outputTypeOptions"
          label="Type"
          @update:model-value="updateMapping(index, { type: String($event) as any })"
        />
      </div>
      <button class="node-editor-action" type="button" @click="addOutput">Add output</button>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginBlueprintResponseMapping } from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { method, updateMethodPatch } = usePluginCreatorNodeEditorContext(props, emit)

const outputTypeOptions = ['string', 'number', 'boolean', 'object', 'array', 'select'].map(
  (value) => ({ value, label: value }),
)
const mappings = computed(() => method.value?.responseMapping ?? [])

function addOutput() {
  updateMethodPatch({
    responseMapping: [
      ...mappings.value,
      {
        id: `output_${Date.now()}`,
        outputName: '',
        path: '',
        type: 'string',
      },
    ],
  })
}

function updateMapping(index: number, payload: Partial<PluginBlueprintResponseMapping>) {
  updateMethodPatch({
    responseMapping: mappings.value.map((mapping, currentIndex) =>
      currentIndex === index ? { ...mapping, ...payload } : mapping,
    ),
  })
}
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
}

.node-editor-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) 140px;
  gap: 12px;
  align-items: end;
}

.node-editor-action {
  align-self: flex-start;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  padding: 6px 8px;
}
</style>
