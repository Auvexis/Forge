<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="Output"
      eyebrow="Method result"
      description="Describe the typed output fields returned by this method."
    >
      <div v-for="(mapping, index) in mappings" :key="mapping.id" class="node-editor-row">
        <div class="node-editor-row__header">
          <strong>{{ mapping.outputName || `Output ${index + 1}` }}</strong>
          <div class="node-editor-row__actions">
            <button type="button" @click="duplicateOutput(index)">Duplicate</button>
            <button type="button" @click="removeOutput(index)">Remove</button>
          </div>
        </div>
        <div class="node-editor-row__grid">
          <BaseInput
            :model-value="mapping.outputName"
            label="Output field"
            placeholder="customer"
            @update:model-value="updateMapping(index, { outputName: String($event) })"
          />
          <BaseSelect
            :model-value="mapping.type"
            :options="outputTypeOptions"
            label="Type"
            @update:model-value="updateMapping(index, { type: String($event) as any })"
          />
          <BaseSwitch
            :model-value="Boolean(mapping.required)"
            label="required"
            @update:model-value="updateMapping(index, { required: Boolean($event) })"
          />
        </div>
        <div class="node-editor-row__mode" role="group" aria-label="source mode">
          <button
            type="button"
            :class="{ active: sourceMode(mapping.id) === 'path' }"
            @click="updateSourceMode(mapping.id, 'path')"
          >
            path
          </button>
          <button
            type="button"
            :class="{ active: sourceMode(mapping.id) === 'expression' }"
            @click="updateSourceMode(mapping.id, 'expression')"
          >
            expression
          </button>
        </div>
        <BaseInput
          :model-value="mapping.path"
          :label="sourceMode(mapping.id) === 'path' ? 'Source path' : 'Source expression'"
          :placeholder="sourceMode(mapping.id) === 'path' ? 'body.data' : 'previous.customer'"
          @update:model-value="updateMapping(index, { path: String($event) })"
        />
      </div>
      <button class="node-editor-action" type="button" @click="addOutput">Add output</button>
    </NodeEditorSection>

    <NodeEditorSection
      title="Output schema preview"
      description="Typed shape exposed by this method."
    >
      <pre class="node-editor-preview">{{ schemaPreview }}</pre>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginBlueprintResponseMapping } from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { node, method, updateNodeData, updateMethodPatch } = usePluginCreatorNodeEditorContext(
  props,
  emit,
)

const outputTypeOptions = ['string', 'number', 'boolean', 'object', 'array', 'select'].map(
  (value) => ({ value, label: value }),
)
const mappings = computed(() => method.value?.responseMapping ?? [])
const sourceModes = computed<Record<string, 'path' | 'expression'>>(() => {
  const value = node.value?.data.outputSourceModes
  return value && typeof value === 'object' ? (value as Record<string, 'path' | 'expression'>) : {}
})
const schemaPreview = computed(() =>
  JSON.stringify(
    Object.fromEntries(
      mappings.value.map((mapping) => [
        mapping.outputName || mapping.id,
        {
          type: mapping.type,
          required: Boolean(mapping.required),
          source: sourceMode(mapping.id),
          value: mapping.path,
        },
      ]),
    ),
    null,
    2,
  ),
)

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

function duplicateOutput(index: number) {
  const mapping = mappings.value[index]
  if (!mapping) return
  updateMethodPatch({
    responseMapping: [
      ...mappings.value.slice(0, index + 1),
      {
        ...mapping,
        id: `output_${Date.now()}`,
        outputName: `${mapping.outputName || 'output'}Copy`,
      },
      ...mappings.value.slice(index + 1),
    ],
  })
}

function removeOutput(index: number) {
  updateMethodPatch({
    responseMapping: mappings.value.filter((_, currentIndex) => currentIndex !== index),
  })
}

function updateMapping(index: number, payload: Partial<PluginBlueprintResponseMapping>) {
  updateMethodPatch({
    responseMapping: mappings.value.map((mapping, currentIndex) =>
      currentIndex === index ? { ...mapping, ...payload } : mapping,
    ),
  })
}

function sourceMode(id: string): 'path' | 'expression' {
  return sourceModes.value[id] ?? 'path'
}

function updateSourceMode(id: string, mode: 'path' | 'expression') {
  updateNodeData({
    outputSourceModes: {
      ...sourceModes.value,
      [id]: mode,
    },
  })
}
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
}

.node-editor-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
}

.node-editor-row__header,
.node-editor-row__actions,
.node-editor-row__mode,
.node-editor-row__grid {
  display: flex;
  gap: 8px;
}

.node-editor-row__header {
  align-items: center;
  justify-content: space-between;
}

.node-editor-row__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px 110px;
  align-items: end;
}

.node-editor-row__mode button,
.node-editor-row__actions button,
.node-editor-action {
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

.node-editor-row__mode button.active {
  border-color: var(--sailor-border-strong);
  background: var(--sailor-bg-muted);
}

.node-editor-action {
  align-self: flex-start;
}

.node-editor-preview {
  min-height: 120px;
  margin: 0;
  padding: 10px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  overflow: auto;
}
</style>
