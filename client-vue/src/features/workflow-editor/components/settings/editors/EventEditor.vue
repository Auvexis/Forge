<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Emit event"
      />
    </EditorField>

    <EditorField label="Event Name" icon="zap">
      <BaseInput
        :model-value="(node.data.eventName as string) || ''"
        @update:model-value="updateNodeData({ eventName: $event as string })"
        placeholder="user.created"
        style="font-family: var(--nod8-font-mono)"
      />
    </EditorField>

    <EditorField label="Payload Parameters" icon="package">
      <div class="editor-hint editor-hint--violet">
        Define key-value pairs to send with the event. Values support
        <span class="editor-code-snippet" v-pre>{{ template }}</span> expressions.
      </div>

      <div class="payload-assignments">
        <div v-for="(param, i) in params" :key="i" class="payload-row">
          <BaseVariableInput
            :model-value="param.key"
            @update:model-value="updateKey(i, $event as string)"
            placeholder="param_name"
            class="payload-key"
            :show-variable-button="false"
          />
          <span class="payload-sep">=</span>
          <ExpressionInput
            :model-value="param.value"
            @update:model-value="updateValue(i, $event as string)"
            placeholder="{{ steps.prev.output.field }}"
            class="payload-value"
          />
          <button class="payload-remove" @click="removeParam(i)" title="Remove">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>

        <div v-if="params.length === 0" class="payload-empty">
          No params yet — click <strong>Add Param</strong> to start.
        </div>

        <button class="payload-add-btn" @click="addParam">
          <LucideIcon name="plus" :size="14" />
          Add Param
        </button>
      </div>
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import type { EventNodeParam } from '@/core/types/workflow.types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseVariableInput from '@/shared/components/base/BaseVariableInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'

const props = defineProps<NodeEditorProps>()

// Array persisted directly — empty rows stay visible (same as SetEditor assignments)
const params = computed<EventNodeParam[]>(
  () => (props.node.data.payloadParams as EventNodeParam[]) ?? [],
)

function save(next: EventNodeParam[]) {
  props.updateNodeData({ payloadParams: next })
}

function addParam() {
  save([...params.value, { key: '', value: '' }])
}

function removeParam(i: number) {
  save(params.value.filter((_, idx) => idx !== i))
}

function updateKey(i: number, key: string) {
  save(params.value.map((p, idx) => (idx === i ? { ...p, key } : p)))
}

function updateValue(i: number, value: string) {
  save(params.value.map((p, idx) => (idx === i ? { ...p, value } : p)))
}
</script>

<style scoped>
.payload-assignments {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
  margin-top: var(--nod8-space-2);
}

.payload-row {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.payload-key {
  flex: 0 0 38%;
  font-family: var(--nod8-font-mono, monospace);
  font-size: var(--nod8-text-xs);
}

.payload-sep {
  color: var(--nod8-text-muted);
  font-weight: 700;
  flex-shrink: 0;
}

.payload-value {
  flex: 1;
  min-width: 0;
}

.payload-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--nod8-text-muted);
  padding: 4px;
  border-radius: var(--nod8-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color var(--nod8-duration-fast);
}

.payload-remove:hover {
  color: var(--nod8-danger, #ef4444);
}

.payload-empty {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-style: italic;
  padding: var(--nod8-space-2) 0;
}

.payload-add-btn {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-1);
  background: transparent;
  border: 1px dashed var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  font-size: var(--nod8-text-xs);
  font-family: inherit;
  color: var(--nod8-text-muted);
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: border-color var(--nod8-duration-fast), color var(--nod8-duration-fast);
}

.payload-add-btn:hover {
  border-color: var(--nod8-accent);
  color: var(--nod8-accent);
}
</style>
