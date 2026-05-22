<template>
  <div class="node-editor-stack">
    <NodeEditorSection
      title="HTTP Request"
      eyebrow="Request"
      description="Configure the request sent by this method."
    >
      <div class="node-editor-grid node-editor-grid--2">
        <BaseSelect
          :model-value="method?.request.method ?? 'GET'"
          :options="httpMethodOptions"
          label="HTTP method"
          @update:model-value="updateRequest({ method: String($event) as any })"
        />
        <PluginCreatorExpressionInput
          :model-value="method?.request.url ?? ''"
          label="Request URL"
          placeholder="https://api.example.com/{{ params.id }}"
          @update:model-value="updateRequest({ url: String($event) })"
        />
      </div>
    </NodeEditorSection>

    <NodeEditorSection title="Headers" description="Static or expression-based request headers.">
      <KeyValueTableEditor
        :items="method?.request.headers ?? []"
        add-label="Add header"
        name-placeholder="Accept"
        value-placeholder="application/json"
        @update="updateRequest({ headers: $event })"
      />
    </NodeEditorSection>

    <NodeEditorSection title="Query Params" description="Query string values appended to the URL.">
      <KeyValueTableEditor
        :items="method?.request.query ?? []"
        add-label="Add query param"
        name-placeholder="limit"
        value-placeholder="{{ params.limit }}"
        @update="updateRequest({ query: $event })"
      />
    </NodeEditorSection>

    <NodeEditorSection title="Body" description="JSON, text, form, or no request body.">
      <RequestBodyEditor
        :body="method?.request.body ?? { type: 'none' }"
        @update="updateRequest({ body: $event })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Request Preview"
      description="Draft request shape saved in the blueprint."
    >
      <BaseCodeEditor :model-value="requestPreview" language="json" height="180px" readonly />
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import KeyValueTableEditor from './KeyValueTableEditor.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import RequestBodyEditor from './RequestBodyEditor.vue'
import { stringifyEditorValue } from './editorValueUtils'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginBlueprintRequest } from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { method } = usePluginCreatorNodeEditorContext(props, emit)

const option = (value: string) => ({ value, label: value })
const httpMethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(option)

const requestPreview = computed(() => stringifyEditorValue(method.value?.request ?? {}))

function updateRequest(payload: Partial<PluginBlueprintRequest>) {
  if (!method.value) return
  emit('updateRequest', method.value.id, payload)
}
</script>

<style scoped>
.node-editor-stack {
  display: flex;
  flex-direction: column;
}

.node-editor-grid {
  display: grid;
  gap: 12px;
}

.node-editor-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
