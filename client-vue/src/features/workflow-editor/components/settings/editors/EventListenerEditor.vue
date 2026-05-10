<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Wait for event"
      />
    </EditorField>

    <EditorField label="Event Name" icon="target">
      <BaseInput
        :model-value="(node.data.eventName as string) || ''"
        @update:model-value="updateNodeData({ eventName: $event as string })"
        placeholder="user.created"
        style="font-family: var(--nod8-font-mono)"
      />
    </EditorField>

    <EditorField label="Output Parameters" icon="arrow-right-from-line">
      <div class="editor-hint editor-hint--amber">
        Declare the keys that this event's payload will expose to downstream nodes
        as <span class="editor-code-snippet">steps.{{ node.id }}.output.&lt;key&gt;</span>.
      </div>

      <div class="params-list">
        <div
          v-for="(param, i) in outputParams"
          :key="i"
          class="param-row"
        >
          <BaseInput
            :model-value="param.key"
            @update:model-value="updateParamKey(i, $event as string)"
            placeholder="param_name"
            style="font-family: var(--nod8-font-mono, monospace)"
          />
          <button class="param-remove" @click="removeParam(i)" title="Remove">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>

        <div v-if="outputParams.length === 0" class="params-empty">
          No params declared — click <strong>Add Param</strong> to define expected keys.
        </div>

        <button class="params-add-btn" @click="addParam">
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
import type { EventListenerOutputParam } from '@/core/types/workflow.types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<NodeEditorProps>()

const outputParams = computed<EventListenerOutputParam[]>(
  () => (props.node.data.outputParams as EventListenerOutputParam[]) ?? [],
)

function save(next: EventListenerOutputParam[]) {
  props.updateNodeData({ outputParams: next })
}

function addParam() {
  save([...outputParams.value, { key: '' }])
}

function removeParam(i: number) {
  save(outputParams.value.filter((_, idx) => idx !== i))
}

function updateParamKey(i: number, key: string) {
  save(outputParams.value.map((p, idx) => (idx === i ? { key } : p)))
}
</script>

<style scoped>
.params-list {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
  margin-top: var(--nod8-space-2);
}

.param-row {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.param-remove {
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

.param-remove:hover {
  color: var(--nod8-danger, #ef4444);
}

.params-empty {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-style: italic;
  padding: var(--nod8-space-2) 0;
}

.params-add-btn {
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

.params-add-btn:hover {
  border-color: var(--nod8-accent);
  color: var(--nod8-accent);
}
</style>
