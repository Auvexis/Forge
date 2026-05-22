<template>
  <div class="key-value-table-editor">
    <div v-if="items.length === 0" class="key-value-table-editor__empty">
      Empty list. Add a row to send values with the request.
    </div>
    <div
      v-for="(item, index) in items"
      :key="`${item.name}_${index}`"
      class="key-value-table-editor__row"
    >
      <BaseInput
        :model-value="item.name"
        label="Name"
        :placeholder="namePlaceholder"
        @update:model-value="updateItem(index, { name: String($event) })"
      />
      <PluginCreatorExpressionInput
        :model-value="String(item.value ?? '')"
        label="Value"
        :placeholder="valuePlaceholder"
        @update:model-value="updateItem(index, { value: String($event) })"
      />
      <div class="key-value-table-editor__actions">
        <button type="button" title="Move up" @click="moveItem(index, -1)">Move up</button>
        <button type="button" title="Move down" @click="moveItem(index, 1)">Move down</button>
        <button type="button" title="Duplicate" @click="duplicateItem(index)">Duplicate</button>
        <button type="button" title="Remove" @click="removeItem(index)">Remove</button>
      </div>
    </div>
    <button class="key-value-table-editor__add" type="button" @click="addItem">
      {{ addLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import BaseInput from '@/shared/components/base/BaseInput.vue'
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import type { PluginBlueprintKeyValue } from '@/core/types/plugin-creator.types'

const props = withDefaults(
  defineProps<{
    items: PluginBlueprintKeyValue[]
    addLabel: string
    namePlaceholder?: string
    valuePlaceholder?: string
  }>(),
  {
    namePlaceholder: 'name',
    valuePlaceholder: '{{ params.value }}',
  },
)

const emit = defineEmits<{
  update: [items: PluginBlueprintKeyValue[]]
}>()

function addItem() {
  emit('update', [...props.items, { name: '', value: '' }])
}

function updateItem(index: number, payload: Partial<PluginBlueprintKeyValue>) {
  emit(
    'update',
    props.items.map((item, currentIndex) =>
      currentIndex === index ? { ...item, ...payload } : item,
    ),
  )
}

function duplicateItem(index: number) {
  const item = props.items[index]
  if (!item) return
  emit('update', [...props.items.slice(0, index + 1), { ...item }, ...props.items.slice(index + 1)])
}

function removeItem(index: number) {
  emit(
    'update',
    props.items.filter((_, currentIndex) => currentIndex !== index),
  )
}

function moveItem(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= props.items.length) return
  const next = [...props.items]
  const current = next[index]
  const target = next[nextIndex]
  if (!current || !target) return
  next[index] = target
  next[nextIndex] = current
  emit('update', next)
}
</script>

<style scoped>
.key-value-table-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.key-value-table-editor__empty {
  padding: 10px;
  border: 1px dashed var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-muted);
  font-size: 12px;
}

.key-value-table-editor__row {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr) auto;
  gap: 10px;
  align-items: end;
}

.key-value-table-editor__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.key-value-table-editor__actions button,
.key-value-table-editor__add {
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

.key-value-table-editor__add {
  align-self: flex-start;
  font-size: 12px;
}
</style>
