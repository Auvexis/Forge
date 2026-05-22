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
      <div class="te-field">
        <span class="te-label">Name</span>
        <BaseInput
          :model-value="item.name"
          :placeholder="namePlaceholder"
          @update:model-value="updateItem(index, { name: String($event) })"
        />
      </div>
      <div class="te-field">
        <span class="te-label">Value</span>
        <PluginCreatorExpressionInput
          :model-value="String(item.value ?? '')"
          :placeholder="valuePlaceholder"
          :show-hint="false"
          @update:model-value="updateItem(index, { value: String($event) })"
        />
      </div>
      <div class="key-value-table-editor__actions">
        <button type="button" title="Remove" @click="removeItem(index)">Remove</button>
      </div>
    </div>
    <button class="editor-add-btn" type="button" @click="addItem">
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

function removeItem(index: number) {
  emit(
    'update',
    props.items.filter((_, currentIndex) => currentIndex !== index),
  )
}

</script>

<style scoped>
.key-value-table-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  grid-template-columns: minmax(140px, 0.75fr) minmax(240px, 1.25fr) auto;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-sm);
  background: color-mix(in srgb, var(--sailor-bg-surface) 64%, transparent);
}

.key-value-table-editor__actions {
  display: flex;
  align-items: end;
  gap: 6px;
  justify-content: flex-end;
  padding-top: 20px;
}

.key-value-table-editor__actions button {
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

.key-value-table-editor__actions button:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

@media (max-width: 980px) {
  .key-value-table-editor__row {
    grid-template-columns: 1fr;
  }

  .key-value-table-editor__actions {
    padding-top: 0;
    justify-content: flex-start;
  }
}
</style>
