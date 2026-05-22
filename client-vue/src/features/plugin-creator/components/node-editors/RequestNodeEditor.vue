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
      <div
        v-for="(header, index) in method?.request.headers ?? []"
        :key="`header_${index}`"
        class="node-editor-grid node-editor-grid--2"
      >
        <BaseInput
          :model-value="header.name"
          label="Name"
          placeholder="Accept"
          @update:model-value="updateKeyValue('headers', index, { name: String($event) })"
        />
        <PluginCreatorExpressionInput
          :model-value="String(header.value ?? '')"
          label="Value"
          placeholder="application/json"
          @update:model-value="updateKeyValue('headers', index, { value: String($event) })"
        />
      </div>
      <button class="node-editor-action" type="button" @click="addKeyValue('headers')">
        Add header
      </button>
    </NodeEditorSection>

    <NodeEditorSection title="Query Params" description="Query string values appended to the URL.">
      <div
        v-for="(query, index) in method?.request.query ?? []"
        :key="`query_${index}`"
        class="node-editor-grid node-editor-grid--2"
      >
        <BaseInput
          :model-value="query.name"
          label="Name"
          placeholder="limit"
          @update:model-value="updateKeyValue('query', index, { name: String($event) })"
        />
        <PluginCreatorExpressionInput
          :model-value="String(query.value ?? '')"
          label="Value"
          placeholder="{{ params.limit }}"
          @update:model-value="updateKeyValue('query', index, { value: String($event) })"
        />
      </div>
      <button class="node-editor-action" type="button" @click="addKeyValue('query')">
        Add query param
      </button>
    </NodeEditorSection>

    <NodeEditorSection title="Body" description="JSON, text, form, or no request body.">
      <BaseSelect
        :model-value="method?.request.body.type ?? 'none'"
        :options="bodyTypeOptions"
        label="Body type"
        @update:model-value="updateBodyType(String($event) as any)"
      />
      <BaseCodeEditor
        :model-value="requestBody"
        :language="method?.request.body.type === 'json' ? 'json' : 'text'"
        label="Body value"
        height="220px"
        @update:model-value="updateBodyValue(String($event))"
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
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import PluginCreatorExpressionInput from '../expressions/PluginCreatorExpressionInput.vue'
import NodeEditorSection from './NodeEditorSection.vue'
import { parseEditorValue, stringifyEditorValue } from './editorValueUtils'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type {
  PluginBlueprintKeyValue,
  PluginBlueprintRequest,
} from '@/core/types/plugin-creator.types'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { method } = usePluginCreatorNodeEditorContext(props, emit)

const option = (value: string) => ({ value, label: value })
const httpMethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(option)
const bodyTypeOptions = ['none', 'json', 'text', 'form'].map(option)

const requestBody = computed(() => stringifyEditorValue(method.value?.request.body.value ?? {}))
const requestPreview = computed(() => stringifyEditorValue(method.value?.request ?? {}))

function updateRequest(payload: Partial<PluginBlueprintRequest>) {
  if (!method.value) return
  emit('updateRequest', method.value.id, payload)
}

function addKeyValue(key: 'headers' | 'query') {
  if (!method.value) return
  updateRequest({ [key]: [...method.value.request[key], { name: '', value: '' }] })
}

function updateKeyValue(
  key: 'headers' | 'query',
  index: number,
  payload: Partial<PluginBlueprintKeyValue>,
) {
  if (!method.value) return
  updateRequest({
    [key]: method.value.request[key].map((entry, currentIndex) =>
      currentIndex === index ? { ...entry, ...payload } : entry,
    ),
  })
}

function updateBodyType(type: PluginBlueprintRequest['body']['type']) {
  if (!method.value) return
  updateRequest({ body: { ...method.value.request.body, type } })
}

function updateBodyValue(value: string) {
  if (!method.value) return
  updateRequest({
    body: {
      ...method.value.request.body,
      value: parseEditorValue(value),
    },
  })
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
