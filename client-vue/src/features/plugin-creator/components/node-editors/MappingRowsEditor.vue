<template>
  <div class="mapping-rows-editor">
    <div v-if="mappings.length === 0" class="mapping-rows-editor__empty">
      No mappings yet. Add a mapping to expose response data.
    </div>
    <div v-for="(mapping, index) in mappings" :key="mapping.id" class="mapping-rows-editor__row">
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
      <div class="mapping-rows-editor__actions">
        <button type="button" title="Move up" @click="moveMapping(index, -1)">Move up</button>
        <button type="button" title="Move down" @click="moveMapping(index, 1)">Move down</button>
        <button type="button" title="Duplicate" @click="duplicateMapping(index)">Duplicate</button>
        <button type="button" title="Remove" @click="removeMapping(index)">Remove</button>
      </div>
    </div>
    <button class="mapping-rows-editor__add" type="button" @click="addMapping">Add mapping</button>
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

function duplicateMapping(index: number) {
  const mapping = props.mappings[index]
  if (!mapping) return
  emit('update', [
    ...props.mappings.slice(0, index + 1),
    { ...mapping, id: `mapping_${Date.now()}` },
    ...props.mappings.slice(index + 1),
  ])
}

function removeMapping(index: number) {
  emit(
    'update',
    props.mappings.filter((_, currentIndex) => currentIndex !== index),
  )
}

function moveMapping(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= props.mappings.length) return
  const next = [...props.mappings]
  const current = next[index]
  const target = next[nextIndex]
  if (!current || !target) return
  next[index] = target
  next[nextIndex] = current
  emit('update', next)
}
</script>

<style scoped>
.mapping-rows-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) 130px 90px auto;
  gap: 10px;
  align-items: end;
}

.mapping-rows-editor__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.mapping-rows-editor__actions button,
.mapping-rows-editor__add {
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 650;
  padding: 6px 8px;
}

.mapping-rows-editor__add {
  align-self: flex-start;
  font-size: 12px;
}
</style>
