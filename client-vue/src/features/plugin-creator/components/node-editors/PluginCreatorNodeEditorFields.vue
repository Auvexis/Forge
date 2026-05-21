<template>
  <div v-if="node" class="plugin-creator-node-editor">
    <header>
      <p>{{ title }}</p>
      <h3>{{ String(node.data.name ?? node.data.label ?? node.id) }}</h3>
    </header>

    <BaseInput
      :model-value="String(node.data.name ?? node.data.label ?? '')"
      label="Node label"
      placeholder="Node label"
      @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
    />

    <template v-if="kind === 'method' && method">
      <BaseInput
        :model-value="method.name"
        label="Method name"
        placeholder="List records"
        @update:model-value="emit('updateMethod', method.id, { name: String($event) })"
      />
      <BaseInput
        :model-value="method.handle"
        label="Method handle"
        placeholder="listRecords"
        @update:model-value="emit('updateMethod', method.id, { handle: String($event) })"
      />
      <BaseInput
        :model-value="method.category ?? ''"
        label="Category"
        placeholder="Records"
        @update:model-value="emit('updateMethod', method.id, { category: String($event) })"
      />
      <BaseCodeEditor
        :model-value="method.description"
        language="markdown"
        label="Method description"
        height="120px"
        @update:model-value="emit('updateMethod', method.id, { description: String($event) })"
      />
    </template>

    <template v-else-if="kind === 'input' && method">
      <BaseInput
        :model-value="firstInput?.name ?? ''"
        label="Input name"
        placeholder="customerId"
        @update:model-value="updateInput({ name: String($event) })"
      />
      <BaseSelect
        :model-value="firstInput?.type ?? 'string'"
        :options="inputTypeOptions"
        label="Input type"
        @update:model-value="updateInput({ type: String($event) as any })"
      />
      <BaseSwitch
        :model-value="Boolean(firstInput?.required)"
        label="Required"
        @update:model-value="updateInput({ required: Boolean($event) })"
      />
      <BaseInput
        :model-value="String(firstInput?.placeholder ?? '')"
        label="Placeholder"
        placeholder="cus_123"
        @update:model-value="updateInput({ placeholder: String($event) })"
      />
      <BaseCodeEditor
        :model-value="String(firstInput?.description ?? '')"
        language="markdown"
        label="Description"
        height="100px"
        @update:model-value="updateInput({ description: String($event) })"
      />
    </template>

    <template v-else-if="kind === 'credential'">
      <BaseSelect
        :model-value="blueprint?.auth.type ?? 'apiKey'"
        :options="authTypeOptions"
        label="Auth type"
        @update:model-value="updateAuthType(String($event) as any)"
      />
      <BaseInput
        :model-value="firstCredential?.name ?? ''"
        label="Credential name"
        placeholder="apiKey"
        @update:model-value="updateCredential({ name: String($event) })"
      />
      <BaseInput
        :model-value="firstCredential?.label ?? ''"
        label="Credential label"
        placeholder="API Key"
        @update:model-value="updateCredential({ label: String($event) })"
      />
      <BaseSelect
        :model-value="firstCredential?.target ?? 'header'"
        :options="credentialTargetOptions"
        label="Target"
        @update:model-value="updateCredential({ target: String($event) as any })"
      />
      <BaseInput
        :model-value="firstCredential?.headerName ?? ''"
        label="Header name"
        placeholder="Authorization"
        @update:model-value="updateCredential({ headerName: String($event) })"
      />
      <BaseInput
        :model-value="firstCredential?.prefix ?? ''"
        label="Value prefix"
        placeholder="Bearer"
        @update:model-value="updateCredential({ prefix: String($event) })"
      />
    </template>

    <template v-else-if="kind === 'request' && method">
      <BaseSelect
        :model-value="method.request.method"
        :options="httpMethodOptions"
        label="HTTP method"
        @update:model-value="emit('updateRequest', method.id, { method: String($event) as any })"
      />
      <BaseInput
        :model-value="method.request.url"
        label="Request URL"
        placeholder="https://api.example.com"
        @update:model-value="emit('updateRequest', method.id, { url: String($event) })"
      />
    </template>

    <template v-else-if="kind === 'header' && method">
      <BaseInput
        :model-value="firstHeader.name"
        label="Header name"
        placeholder="Accept"
        @update:model-value="updateRequestKeyValue('headers', { name: String($event) })"
      />
      <BaseInput
        :model-value="String(firstHeader.value ?? '')"
        label="Header value"
        placeholder="application/json"
        @update:model-value="updateRequestKeyValue('headers', { value: String($event) })"
      />
    </template>

    <template v-else-if="kind === 'query' && method">
      <BaseInput
        :model-value="firstQuery.name"
        label="Query param"
        placeholder="limit"
        @update:model-value="updateRequestKeyValue('query', { name: String($event) })"
      />
      <BaseInput
        :model-value="String(firstQuery.value ?? '')"
        label="Query value"
        placeholder="{{ params.limit }}"
        @update:model-value="updateRequestKeyValue('query', { value: String($event) })"
      />
    </template>

    <template v-else-if="kind === 'body' && method">
      <BaseSelect
        :model-value="method.request.body.type"
        :options="bodyTypeOptions"
        label="Body type"
        @update:model-value="emit('updateRequest', method.id, { body: { type: String($event) as any } })"
      />
      <BaseCodeEditor
        :model-value="requestBody"
        language="json"
        label="JSON body"
        height="200px"
        @update:model-value="updateRequestBody(String($event))"
      />
    </template>

    <template v-else-if="kind === 'responseMapper' && method">
      <BaseInput
        :model-value="firstResponseMapping.path"
        label="Response path"
        placeholder="body.data.id"
        @update:model-value="updateResponseMapping({ path: String($event) })"
      />
      <BaseInput
        :model-value="firstResponseMapping.outputName"
        label="Output name"
        placeholder="customerId"
        @update:model-value="updateResponseMapping({ outputName: String($event) })"
      />
      <BaseSelect
        :model-value="firstResponseMapping.type"
        :options="outputTypeOptions"
        label="Output type"
        @update:model-value="updateResponseMapping({ type: String($event) as any })"
      />
    </template>

    <template v-else-if="kind === 'errorMapper' && method">
      <BaseInput
        :model-value="firstErrorMapping.code"
        label="Error code"
        placeholder="REQUEST_FAILED"
        @update:model-value="updateErrorMapping({ code: String($event) })"
      />
      <BaseInput
        :model-value="String(firstErrorMapping.condition.value ?? '')"
        label="Status code"
        placeholder="400"
        @update:model-value="updateErrorStatus(String($event))"
      />
      <BaseInput
        :model-value="errorMessageValue"
        label="Message"
        placeholder="Request failed"
        @update:model-value="updateErrorMessage(String($event))"
      />
    </template>

    <template v-else-if="kind === 'output' && method">
      <BaseInput
        :model-value="firstResponseMapping.outputName"
        label="Output field"
        placeholder="customer"
        @update:model-value="updateResponseMapping({ outputName: String($event) })"
      />
      <BaseInput
        :model-value="firstResponseMapping.path"
        label="Source path"
        placeholder="body.data"
        @update:model-value="updateResponseMapping({ path: String($event) })"
      />
      <BaseSwitch
        :model-value="Boolean(firstResponseMapping.required)"
        label="Required output"
        @update:model-value="updateResponseMapping({ required: Boolean($event) })"
      />
    </template>

    <div class="plugin-creator-node-editor__tree">
      <span>Last response values</span>
      <JsonTreeView :data="jsonTreeData" :is-root="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import JsonTreeView from '@/features/workflow-editor/components/settings/shared/JsonTreeView.vue'
import type {
  PluginBlueprintAuthType,
  PluginBlueprintCredentialField,
  PluginBlueprintErrorMapping,
  PluginBlueprintInput,
  PluginBlueprintKeyValue,
  PluginBlueprintRequest,
  PluginBlueprintResponseMapping,
} from '@/core/types/plugin-creator.types'
import type {
  PluginCreatorNodeEditorEmits,
  PluginCreatorNodeEditorKind,
  PluginCreatorNodeEditorProps,
} from './types'

const props = defineProps<PluginCreatorNodeEditorProps & { kind: PluginCreatorNodeEditorKind }>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()

const option = (value: string, label: string = value) => ({ value, label })
const inputTypeOptions = ['string', 'number', 'boolean', 'object', 'array', 'select', 'file'].map(
  (value) => option(value),
)
const outputTypeOptions = ['string', 'number', 'boolean', 'object', 'array', 'select'].map((value) =>
  option(value),
)
const authTypeOptions = ['none', 'apiKey', 'bearer', 'basic'].map((value) => option(value))
const credentialTargetOptions = ['header', 'query', 'body'].map((value) => option(value))
const httpMethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map((value) =>
  option(value),
)
const bodyTypeOptions = ['none', 'json', 'text', 'form'].map((value) => option(value))

const node = computed(() =>
  props.blueprint && props.nodeId ? props.blueprint.canvas.nodes[props.nodeId] : null,
)
const blueprint = computed(() => props.blueprint)
const method = computed(() => {
  if (!props.blueprint) return null
  const methodId = node.value?.data.methodId
  if (typeof methodId === 'string') {
    return props.blueprint.methods.find((candidate) => candidate.id === methodId) ?? null
  }
  return props.blueprint.methods[0] ?? null
})
const title = computed(() => {
  const labels: Record<PluginCreatorNodeEditorKind, string> = {
    method: 'Method',
    input: 'Input Field',
    credential: 'Credential Field',
    request: 'Request',
    header: 'Header',
    query: 'Query Param',
    body: 'JSON Body',
    responseMapper: 'Response Mapper',
    errorMapper: 'Error Mapper',
    output: 'Output Field',
  }
  return labels[props.kind]
})
const firstInput = computed(() => method.value?.inputs[0] ?? null)
const firstCredential = computed(() => props.blueprint?.auth.fields[0] ?? null)
const firstHeader = computed(() => method.value?.request.headers[0] ?? { name: '', value: '' })
const firstQuery = computed(() => method.value?.request.query[0] ?? { name: '', value: '' })
const requestBody = computed(() => JSON.stringify(method.value?.request.body.value ?? {}, null, 2))
const firstResponseMapping = computed<PluginBlueprintResponseMapping>(
  () =>
    method.value?.responseMapping[0] ?? {
      id: 'output_1',
      outputName: '',
      path: '',
      type: 'string',
    },
)
const firstErrorMapping = computed<PluginBlueprintErrorMapping>(
  () =>
    method.value?.errorMapping[0] ?? {
      id: 'error_1',
      code: '',
      condition: { source: 'status', operator: 'equals', value: 400 },
      message: { type: 'static', value: '' },
    },
)
const errorMessageValue = computed(() => {
  const message = firstErrorMapping.value.message
  return message.type === 'static' ? message.value : message.path
})
const jsonTreeData = computed(
  () => props.lastTestResult?.body ?? { body: { data: { id: 'example' } } },
)

function updateNodeData(data: Record<string, unknown>) {
  if (!node.value) return
  emit('updateNode', node.value.id, { data })
}

function updateInput(payload: Partial<PluginBlueprintInput>) {
  if (!method.value || !firstInput.value) return
  emit('updateInput', method.value.id, firstInput.value.name, payload)
}

function updateCredential(payload: Partial<PluginBlueprintCredentialField>) {
  if (!firstCredential.value) return
  emit('updateCredential', firstCredential.value.name, payload)
}

function updateAuthType(type: PluginBlueprintAuthType) {
  updateNodeData({ authType: type })
}

function updateRequestKeyValue(
  key: 'headers' | 'query',
  payload: Partial<PluginBlueprintKeyValue>,
) {
  if (!method.value) return
  const current = method.value.request[key]
  const first = current[0] ?? { name: '', value: '' }
  emit('updateRequest', method.value.id, {
    [key]: [{ ...first, ...payload }, ...current.slice(1)],
  } as Partial<PluginBlueprintRequest>)
}

function updateRequestBody(value: string) {
  if (!method.value) return
  try {
    emit('updateRequest', method.value.id, { body: { type: 'json', value: JSON.parse(value) } })
  } catch {
    emit('updateRequest', method.value.id, { body: { type: 'text', value } })
  }
}

function updateResponseMapping(payload: Partial<PluginBlueprintResponseMapping>) {
  if (!method.value) return
  const current = method.value.responseMapping
  emit('updateMethod', method.value.id, {
    responseMapping: [{ ...firstResponseMapping.value, ...payload }, ...current.slice(1)],
  })
}

function updateErrorMapping(payload: Partial<PluginBlueprintErrorMapping>) {
  if (!method.value) return
  const current = method.value.errorMapping
  emit('updateMethod', method.value.id, {
    errorMapping: [{ ...firstErrorMapping.value, ...payload }, ...current.slice(1)],
  })
}

function updateErrorStatus(value: string) {
  updateErrorMapping({
    condition: {
      ...firstErrorMapping.value.condition,
      value: Number.isNaN(Number(value)) ? value : Number(value),
    },
  })
}

function updateErrorMessage(value: string) {
  updateErrorMapping({ message: { type: 'static', value } })
}
</script>

<style scoped>
.plugin-creator-node-editor {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.plugin-creator-node-editor header p,
.plugin-creator-node-editor header h3 {
  margin: 0;
}

.plugin-creator-node-editor header p {
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.plugin-creator-node-editor header h3 {
  margin-top: 4px;
  font-size: 16px;
}

.plugin-creator-node-editor__tree {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
}

.plugin-creator-node-editor__tree > span {
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 700;
}
</style>
