<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="Error Mapping"
      eyebrow="Errors"
      description="Turn response status or body values into plugin errors."
    >
      <div v-for="(mapping, index) in mappings" :key="mapping.id" class="node-editor-card">
        <div class="node-editor-grid node-editor-grid--3">
          <BaseInput
            :model-value="mapping.code"
            label="Code"
            placeholder="REQUEST_FAILED"
            @update:model-value="updateMapping(index, { code: String($event) })"
          />
          <BaseSelect
            :model-value="mapping.condition.source"
            :options="errorSourceOptions"
            label="Source"
            @update:model-value="updateCondition(index, { source: String($event) as any })"
          />
          <BaseSelect
            :model-value="mapping.condition.operator"
            :options="errorOperatorOptions"
            label="Operator"
            @update:model-value="updateCondition(index, { operator: String($event) as any })"
          />
        </div>
        <div class="node-editor-grid node-editor-grid--2">
          <BaseInput
            :model-value="String(mapping.condition.path ?? '')"
            label="Body path"
            placeholder="body.error.code"
            @update:model-value="updateCondition(index, { path: String($event) })"
          />
          <BaseInput
            :model-value="String(mapping.condition.value ?? '')"
            label="Compare value"
            placeholder="400"
            @update:model-value="updateCondition(index, { value: normalizeValue(String($event)) })"
          />
        </div>
        <BaseInput
          :model-value="messageValue(mapping)"
          label="Message"
          placeholder="Request failed"
          @update:model-value="
            updateMapping(index, { message: { type: 'static', value: String($event) } })
          "
        />
      </div>
      <button class="node-editor-action" type="button" @click="addMapping">
        Add error mapping
      </button>
    </NodeEditorSection>

    <NodeEditorSection title="Latest Response" description="Status/body from the last test run.">
      <BaseCodeEditor :model-value="latestResponse" language="json" height="180px" readonly />
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { stringifyEditorValue } from './editorValueUtils'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type {
  PluginBlueprintErrorCondition,
  PluginBlueprintErrorMapping,
} from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { method, updateMethodPatch } = usePluginCreatorNodeEditorContext(props, emit)

const errorSourceOptions = ['status', 'body'].map((value) => ({ value, label: value }))
const errorOperatorOptions = (
  [
    ['equals', 'equals'],
    ['notEquals', 'not equals'],
    ['greaterThan', 'greater than'],
    ['greaterThanOrEquals', 'greater/equal'],
    ['lessThan', 'less than'],
    ['lessThanOrEquals', 'less/equal'],
    ['exists', 'exists'],
    ['notExists', 'not exists'],
  ] satisfies Array<[string, string]>
).map(([value, label]) => ({ value, label }))
const mappings = computed(() => method.value?.errorMapping ?? [])
const latestResponse = computed(() =>
  stringifyEditorValue({
    status: props.lastTestResult?.status ?? null,
    body: props.lastTestResult?.body ?? null,
  }),
)

function addMapping() {
  updateMethodPatch({
    errorMapping: [
      ...mappings.value,
      {
        id: `error_${Date.now()}`,
        code: 'REQUEST_FAILED',
        condition: { source: 'status', operator: 'greaterThanOrEquals', value: 400 },
        message: { type: 'static', value: 'Request failed' },
      },
    ],
  })
}

function updateMapping(index: number, payload: Partial<PluginBlueprintErrorMapping>) {
  updateMethodPatch({
    errorMapping: mappings.value.map((mapping, currentIndex) =>
      currentIndex === index ? { ...mapping, ...payload } : mapping,
    ),
  })
}

function updateCondition(index: number, payload: Partial<PluginBlueprintErrorCondition>) {
  const mapping = mappings.value[index]
  if (!mapping) return
  updateMapping(index, { condition: { ...mapping.condition, ...payload } })
}

function messageValue(mapping: PluginBlueprintErrorMapping) {
  return mapping.message.type === 'static' ? mapping.message.value : mapping.message.path
}

function normalizeValue(value: string) {
  return value.trim() !== '' && !Number.isNaN(Number(value)) ? Number(value) : value
}
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
}

.node-editor-card,
.node-editor-grid {
  display: grid;
  gap: 12px;
}

.node-editor-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.node-editor-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
