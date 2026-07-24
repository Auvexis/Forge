<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this step"
      />
    </EditorField>

    <EditorField label="Field Assignments" icon="sliders-horizontal">
      <div class="editor-hint editor-hint--violet">
        Define fields to set in the output. Values support
        <span class="editor-code-snippet" v-pre>{{ template }}</span> expressions.
      </div>

      <div class="set-assignments">
        <div
          v-for="(assignment, i) in assignments"
          :key="i"
          class="set-assignment-row"
        >
          <!-- Key -->
          <BaseVariableInput
            :model-value="assignment.key"
            @update:model-value="updateKey(i, $event as string)"
            placeholder="field_name"
            class="set-assignment-key"
            :show-variable-button="false"
          />
          <span class="set-assignment-sep">=</span>
          <!-- Value (supports {{ }} templates) -->
          <ExpressionInput
            :model-value="assignment.value"
            @update:model-value="updateValue(i, $event as string)"
            placeholder="{{ steps.prev.output.field }}"
            class="set-assignment-value"
          />
          <!-- Remove -->
          <button class="set-assignment-remove" @click="removeAssignment(i)" title="Remove">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>

        <div v-if="assignments.length === 0" class="set-empty-hint">
          No assignments yet — click <strong>Add Field</strong> to start.
        </div>

        <button class="set-add-btn" @click="addAssignment">
          <LucideIcon name="plus" :size="14" />
          Add Field
        </button>
      </div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import type { SetNodeAssignment } from '@/core/types/workflow.types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseVariableInput from '@/shared/components/base/BaseVariableInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'

const props = defineProps<NodeEditorProps>()

const assignments = computed<SetNodeAssignment[]>(
  () => (props.node.data.assignments as SetNodeAssignment[]) ?? [],
)

function saveAssignments(next: SetNodeAssignment[]) {
  props.updateNodeData({ assignments: next })
}

function addAssignment() {
  saveAssignments([...assignments.value, { key: '', value: '' }])
}

function removeAssignment(i: number) {
  const next = assignments.value.filter((_, idx) => idx !== i)
  saveAssignments(next)
}

function updateKey(i: number, key: string) {
  const next = assignments.value.map((a, idx) => (idx === i ? { ...a, key } : a))
  saveAssignments(next)
}

function updateValue(i: number, value: string) {
  const next = assignments.value.map((a, idx) => (idx === i ? { ...a, value } : a))
  saveAssignments(next)
}
</script>

<style scoped>
.set-assignments {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
  margin-top: var(--fabric-space-2);
}

.set-assignment-row {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.set-assignment-key {
  flex: 0 0 38%;
  font-family: var(--fabric-font-mono, monospace);
  font-size: var(--fabric-text-xs);
}

.set-assignment-sep {
  color: var(--fabric-set-editor-text-muted);
  font-weight: 700;
  flex-shrink: 0;
}

.set-assignment-value {
  flex: 1;
  min-width: 0;
}

.set-assignment-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--fabric-set-editor-text-muted);
  padding: 4px;
  border-radius: var(--fabric-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color var(--fabric-duration-fast);
}

.set-assignment-remove:hover {
  color: var(--fabric-danger, #ef4444);
}

.set-empty-hint {
  font-size: var(--fabric-text-xs);
  color: var(--fabric-set-editor-text-muted);
  font-style: italic;
  padding: var(--fabric-space-2) 0;
}

.set-add-btn {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-1);
  background: transparent;
  border: 1px dashed var(--fabric-set-editor-border);
  border-radius: var(--fabric-radius-md);
  padding: var(--fabric-space-2) var(--fabric-space-3);
  font-size: var(--fabric-text-xs);
  font-family: inherit;
  color: var(--fabric-set-editor-text-muted);
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: border-color var(--fabric-duration-fast), color var(--fabric-duration-fast);
}

.set-add-btn:hover {
  border-color: var(--fabric-set-editor-accent);
  color: var(--fabric-set-editor-accent);
}
</style>
