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
        <div
          v-for="(entry, i) in payloadEntries"
          :key="i"
          class="payload-row"
        >
          <BaseInput
            :model-value="entry.key"
            @update:model-value="updateEntryKey(i, $event as string)"
            placeholder="param_name"
            class="payload-key"
          />
          <span class="payload-sep">=</span>
          <BaseInput
            :model-value="entry.value"
            @update:model-value="updateEntryValue(i, $event as string)"
            placeholder="{{ steps.prev.output.field }}"
            class="payload-value"
          />
          <button class="payload-remove" @click="removeEntry(i)" title="Remove">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>

        <div v-if="payloadEntries.length === 0" class="payload-empty">
          No params yet — click <strong>Add Param</strong> to start.
        </div>

        <button class="payload-add-btn" @click="addEntry">
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
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<NodeEditorProps>()

// Work with payloadMapping as an array of {key, value} entries for easy editing
const payloadEntries = computed<{ key: string; value: string }[]>(() => {
  const mapping = (props.node.data.payloadMapping as Record<string, string>) ?? {}
  return Object.entries(mapping).map(([key, value]) => ({ key, value }))
})

function saveEntries(entries: { key: string; value: string }[]) {
  const mapping: Record<string, string> = {}
  for (const { key, value } of entries) {
    if (key) mapping[key] = value
  }
  props.updateNodeData({ payloadMapping: mapping })
}

function addEntry() {
  saveEntries([...payloadEntries.value, { key: '', value: '' }])
}

function removeEntry(i: number) {
  saveEntries(payloadEntries.value.filter((_, idx) => idx !== i))
}

function updateEntryKey(i: number, key: string) {
  saveEntries(payloadEntries.value.map((e, idx) => (idx === i ? { ...e, key } : e)))
}

function updateEntryValue(i: number, value: string) {
  saveEntries(payloadEntries.value.map((e, idx) => (idx === i ? { ...e, value } : e)))
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
