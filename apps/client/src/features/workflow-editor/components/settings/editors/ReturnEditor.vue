<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="String(node.data.name || '')"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Return"
      />
    </EditorField>

    <EditorField label="Return Mode" icon="corner-down-left">
      <BaseSelect
        :model-value="mode"
        :options="modeOptions"
        @update:model-value="updateMode($event as WorkflowReturnMode)"
      />
    </EditorField>

    <div v-if="mode === 'all-steps'" class="return-info-box">
      <LucideIcon name="info" :size="14" />
      <span>This returns the executed steps tree as the workflow result.</span>
    </div>

    <EditorField v-if="mode === 'fields'" label="Fields" icon="list-plus">
      <div class="editor-hint editor-hint--violet">
        Build an object result. Values support
        <span class="editor-code-snippet" v-pre>{{ template }}</span> expressions.
      </div>

      <div class="return-fields">
        <div v-for="(field, i) in fields" :key="i" class="return-field-row">
          <BaseVariableInput
            :model-value="field.key"
            @update:model-value="updateField(i, 'key', $event as string)"
            placeholder="field_name"
            class="return-field-key"
            :show-variable-button="false"
          />
          <span class="return-field-sep">=</span>
          <ExpressionInput
            :model-value="field.value"
            @update:model-value="updateField(i, 'value', $event as string)"
            placeholder="{{ steps.generate.output.text }}"
            class="return-field-value"
          />
          <button class="return-field-remove" title="Remove" @click="removeField(i)">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>

        <div v-if="fields.length === 0" class="return-empty-hint">
          No fields yet. Add one to shape the workflow result.
        </div>

        <button class="return-add-btn" @click="addField">
          <LucideIcon name="plus" :size="14" />
          Add Field
        </button>
      </div>
    </EditorField>

    <EditorField v-if="mode === 'expression'" label="Expression" icon="code">
      <div class="editor-hint editor-hint--violet">
        Return one value. Use expressions for step outputs or write JSON-like text.
      </div>
      <ExpressionTextarea
        :model-value="String(node.data.expression || '')"
        @update:model-value="updateNodeData({ expression: $event })"
        placeholder="{{ steps.generate.output.recipe }}"
        :rows="5"
        spellcheck="false"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  ReturnNodeField,
  WorkflowReturnMode,
} from '@/core/types/workflow.types'
import type { NodeEditorProps } from './types'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseVariableInput from '@/shared/components/base/BaseVariableInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'
import EditorField from './EditorField.vue'

const props = defineProps<NodeEditorProps>()

const modeOptions = [
  { value: 'all-steps', label: 'All Steps', icon: 'workflow' },
  { value: 'fields', label: 'Fields', icon: 'list-plus' },
  { value: 'expression', label: 'Expression', icon: 'code' },
]

const mode = computed<WorkflowReturnMode>(() => {
  const value = props.node.data.mode
  return value === 'fields' || value === 'expression' ? value : 'all-steps'
})

const fields = computed<ReturnNodeField[]>(() =>
  Array.isArray(props.node.data.fields) ? props.node.data.fields as ReturnNodeField[] : [],
)

function updateMode(next: WorkflowReturnMode) {
  props.updateNodeData({ mode: next })
}

function saveFields(next: ReturnNodeField[]) {
  props.updateNodeData({ fields: next })
}

function addField() {
  saveFields([...fields.value, { key: '', value: '' }])
}

function removeField(index: number) {
  saveFields(fields.value.filter((_, i) => i !== index))
}

function updateField(index: number, key: keyof ReturnNodeField, value: string) {
  saveFields(fields.value.map((field, i) => (i === index ? { ...field, [key]: value } : field)))
}
</script>

<style scoped>
.return-info-box {
  display: flex;
  gap: var(--fabric-space-2);
  align-items: flex-start;
  padding: var(--fabric-space-3);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background-color: var(--fabric-bg-base);
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
  line-height: 1.5;
}

.return-fields {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
  margin-top: var(--fabric-space-2);
}

.return-field-row {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.return-field-key {
  flex: 0 0 38%;
  font-family: var(--fabric-font-mono);
  font-size: var(--fabric-text-xs);
}

.return-field-sep {
  flex-shrink: 0;
  color: var(--fabric-text-muted);
  font-weight: 700;
}

.return-field-value {
  flex: 1;
  min-width: 0;
}

.return-field-remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 0;
  border-radius: var(--fabric-radius-sm);
  background: transparent;
  color: var(--fabric-text-muted);
  cursor: pointer;
}

.return-field-remove:hover {
  color: var(--fabric-text-error);
}

.return-empty-hint {
  padding: var(--fabric-space-2) 0;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
  font-style: italic;
}

.return-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--fabric-space-1);
  width: 100%;
  padding: var(--fabric-space-2) var(--fabric-space-3);
  border: 1px dashed var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: transparent;
  color: var(--fabric-text-muted);
  font-family: inherit;
  font-size: var(--fabric-text-xs);
  cursor: pointer;
}

.return-add-btn:hover {
  border-color: var(--fabric-accent);
  color: var(--fabric-accent);
}
</style>
