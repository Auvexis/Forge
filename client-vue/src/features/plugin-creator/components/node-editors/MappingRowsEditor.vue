<template>
  <div class="mapping-rows-editor">
    <div v-if="mappings.length === 0" class="mapping-rows-editor__empty">
      No mappings yet. Add a mapping to expose response data.
    </div>
    <div v-for="(mapping, index) in mappings" :key="mapping.id" class="mapping-rows-editor__row">
      <div class="mapping-rows-editor__main">
        <BaseInput
          :model-value="mapping.outputName"
          label="Output name"
          placeholder="customerId"
          @update:model-value="updateMapping(index, { outputName: String($event) })"
        />
        <BaseInput
          :model-value="mapping.path"
          label="Response path"
          placeholder="body.data.id"
          @update:model-value="updateMapping(index, { path: String($event) })"
        />
      </div>
      <div class="mapping-rows-editor__meta">
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
      <div class="mapping-rows-editor__actions">
        <button type="button" title="Remove" @click="removeMapping(index)">Remove</button>
      </div>
    </div>
    <button class="editor-add-btn" type="button" @click="addMapping">Add mapping</button>
  </div>
</template>

<script setup lang="ts">
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import type { PluginBlueprintResponseMapping } from '@/core/types/plugin-creator.types'

const props = defineProps<{
  mappings: PluginBlueprintResponseMapping[]
}>()

const emit = defineEmits<{
  update: [mappings: PluginBlueprintResponseMapping[]]
}>()

const outputTypeOptions = ['string', 'number', 'boolean', 'object', 'array', 'select'].map(
  (value) => ({ value, label: value }),
)

function addMapping() {
  emit('update', [
    ...props.mappings,
    {
      id: `mapping_${Date.now()}`,
      outputName: '',
      path: '',
      type: 'string',
    },
  ])
}

function updateMapping(index: number, payload: Partial<PluginBlueprintResponseMapping>) {
  emit(
    'update',
    props.mappings.map((mapping, currentIndex) =>
      currentIndex === index ? { ...mapping, ...payload } : mapping,
    ),
  )
}

function removeMapping(index: number) {
  emit(
    'update',
    props.mappings.filter((_, currentIndex) => currentIndex !== index),
  )
}

</script>

<style scoped>
.mapping-rows-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mapping-rows-editor__empty {
  padding: 10px;
  border: 1px dashed var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-muted);
  font-size: 12px;
}

.mapping-rows-editor__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 230px auto;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: color-mix(in srgb, var(--sailor-bg-surface) 64%, transparent);
}

.mapping-rows-editor__main {
  display: grid;
  grid-template-columns: minmax(160px, 0.8fr) minmax(220px, 1.2fr);
  gap: 10px;
}

.mapping-rows-editor__meta {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.mapping-rows-editor__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 20px;
}

.mapping-rows-editor__actions button {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 750;
  padding: 8px 10px;
}

.mapping-rows-editor__actions button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

@media (max-width: 1100px) {
  .mapping-rows-editor__row,
  .mapping-rows-editor__main,
  .mapping-rows-editor__meta {
    grid-template-columns: 1fr;
  }

  .mapping-rows-editor__actions {
    padding-top: 0;
    justify-content: flex-start;
  }
}
</style>
