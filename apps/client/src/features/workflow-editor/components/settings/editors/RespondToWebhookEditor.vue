<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Name this step"
      />
    </EditorField>

    <EditorField label="Status Code" icon="hash">
      <BaseInput
        type="number"
        :model-value="String(node.data.statusCode ?? 200)"
        @update:model-value="updateNodeData({ statusCode: Number($event) })"
        placeholder="200"
      />
    </EditorField>

    <EditorField label="Response Body" icon="code">
      <div class="editor-hint editor-hint--violet">
        Supports <span class="editor-code-snippet" v-pre>{{ template }}</span> expressions.
        JSON strings are auto-parsed.
      </div>
      <ExpressionTextarea
        :model-value="(node.data.body as string) || ''"
        @update:model-value="updateNodeData({ body: $event })"
        placeholder='{ "ok": true, "data": {{ steps.fetchData.output.result }} }'
        spellcheck="false"
        :rows="5"
      />
    </EditorField>

    <EditorField label="Response Headers (optional)" icon="list">
      <div class="editor-hint">Key-value pairs added to the HTTP response.</div>
      <div class="respond-headers">
        <div
          v-for="(entry, i) in headerEntries"
          :key="i"
          class="respond-header-row"
        >
          <BaseVariableInput
            :model-value="entry.key"
            @update:model-value="updateHeader(i, 'key', $event as string)"
            placeholder="Content-Type"
            class="respond-header-key"
            :show-variable-button="false"
          />
          <span class="respond-header-sep">:</span>
          <ExpressionInput
            :model-value="entry.value"
            @update:model-value="updateHeader(i, 'value', $event as string)"
            placeholder="application/json"
            class="respond-header-value"
          />
          <button class="respond-header-remove" @click="removeHeader(i)" title="Remove">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>

        <button class="respond-add-btn" @click="addHeader">
          <LucideIcon name="plus" :size="14" />
          Add Header
        </button>
      </div>
    </EditorField>

    <div class="respond-info-box">
      <LucideIcon name="info" :size="14" />
      <span>
        This node resolves the HTTP response for the caller. Only one <strong>Respond to Webhook</strong>
        per webhook workflow is effective. Requires a <strong>Webhook trigger</strong>.
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseVariableInput from '@/shared/components/base/BaseVariableInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

const props = defineProps<NodeEditorProps>()

interface HeaderEntry { key: string; value: string }

const headers = computed<Record<string, string>>(
  () => (props.node.data.headers as Record<string, string>) ?? {},
)

const headerEntries = computed<HeaderEntry[]>(() =>
  Object.entries(headers.value).map(([key, value]) => ({ key, value })),
)

function saveHeaders(entries: HeaderEntry[]) {
  const obj: Record<string, string> = {}
  for (const e of entries) {
    if (e.key) obj[e.key] = e.value
  }
  props.updateNodeData({ headers: obj })
}

function addHeader() {
  saveHeaders([...headerEntries.value, { key: '', value: '' }])
}

function removeHeader(i: number) {
  saveHeaders(headerEntries.value.filter((_, idx) => idx !== i))
}

function updateHeader(i: number, field: 'key' | 'value', val: string) {
  const next = headerEntries.value.map((e, idx) =>
    idx === i ? { ...e, [field]: val } : e,
  )
  saveHeaders(next)
}
</script>

<style scoped>
.respond-headers {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
  margin-top: var(--fabric-space-2);
}

.respond-header-row {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.respond-header-key {
  flex: 0 0 38%;
  font-family: var(--fabric-font-mono);
  font-size: var(--fabric-text-xs);
}

.respond-header-sep {
  color: var(--fabric-text-muted);
  font-weight: 700;
  flex-shrink: 0;
}

.respond-header-value {
  flex: 1;
  min-width: 0;
}

.respond-header-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--fabric-text-muted);
  padding: 4px;
  border-radius: var(--fabric-radius-sm);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color var(--fabric-duration-fast);
}

.respond-header-remove:hover { color: var(--fabric-danger, #ef4444); }

.respond-add-btn {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-1);
  background: transparent;
  border: 1px dashed var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  padding: var(--fabric-space-2) var(--fabric-space-3);
  font-size: var(--fabric-text-xs);
  font-family: inherit;
  color: var(--fabric-text-muted);
  cursor: pointer;
  width: 100%;
  justify-content: center;
  transition: border-color var(--fabric-duration-fast), color var(--fabric-duration-fast);
}

.respond-add-btn:hover {
  border-color: var(--fabric-accent);
  color: var(--fabric-accent);
}

.respond-info-box {
  display: flex;
  gap: var(--fabric-space-2);
  align-items: flex-start;
  padding: var(--fabric-space-3);
  border-radius: var(--fabric-radius-md);
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.2);
  font-size: var(--fabric-text-xs);
  color: var(--fabric-text-muted);
  line-height: 1.5;
}
</style>
