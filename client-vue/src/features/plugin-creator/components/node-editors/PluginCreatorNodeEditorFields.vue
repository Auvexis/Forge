<template>
  <div v-if="node" class="editor-stack plugin-creator-node-editor">
    <section class="te-section">
      <div class="te-section__header">
        <div>
          <p class="te-section__eyebrow">{{ title }}</p>
          <h3>{{ String(node.data.name ?? node.data.label ?? node.id) }}</h3>
        </div>
      </div>

      <div class="te-grid te-grid--2">
        <BaseInput
          :model-value="String(node.data.name ?? node.data.label ?? '')"
          label="Node label"
          placeholder="Node label"
          hint="Visible label used on the canvas."
          @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
        />
        <BaseInput :model-value="node.id" label="Node id" disabled />
      </div>
    </section>

    <section v-if="kind === 'method' && method" class="te-section">
      <div class="te-section__header">
        <h3>Method metadata</h3>
      </div>
      <div class="te-grid te-grid--2">
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
          hint="Stable key used by workflows."
          @update:model-value="emit('updateMethod', method.id, { handle: String($event) })"
        />
      </div>
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
        height="140px"
        @update:model-value="emit('updateMethod', method.id, { description: String($event) })"
      />
    </section>

    <section v-else-if="kind === 'input' && method" class="te-section">
      <div class="te-section__header">
        <h3>Input field</h3>
      </div>
      <div class="te-grid te-grid--2">
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
      </div>
      <div class="te-grid te-grid--2">
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
      </div>
      <BaseCodeEditor
        :model-value="inputDefaultValue"
        language="json"
        label="Default value"
        height="110px"
        @update:model-value="updateInputDefault(String($event))"
      />
      <BaseCodeEditor
        :model-value="inputOptionsValue"
        language="json"
        label="Select options"
        height="130px"
        @update:model-value="updateInputOptions(String($event))"
      />
      <BaseCodeEditor
        :model-value="String(firstInput?.description ?? '')"
        language="markdown"
        label="Description"
        height="110px"
        @update:model-value="updateInput({ description: String($event) })"
      />
    </section>

    <section v-else-if="kind === 'credential'" class="te-section">
      <div class="te-section__header">
        <h3>Credential field</h3>
      </div>
      <div class="te-grid te-grid--2">
        <BaseSelect
          :model-value="blueprint?.auth.type ?? 'apiKey'"
          :options="authTypeOptions"
          label="Auth type"
          @update:model-value="updateAuthType(String($event) as any)"
        />
        <BaseSelect
          :model-value="firstCredential?.target ?? 'header'"
          :options="credentialTargetOptions"
          label="Target"
          @update:model-value="updateCredential({ target: String($event) as any })"
        />
      </div>
      <div class="te-grid te-grid--2">
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
      </div>
      <div class="te-grid te-grid--3">
        <BaseInput
          :model-value="firstCredential?.headerName ?? ''"
          label="Header name"
          placeholder="Authorization"
          @update:model-value="updateCredential({ headerName: String($event) })"
        />
        <BaseInput
          :model-value="firstCredential?.queryName ?? ''"
          label="Query name"
          placeholder="api_key"
          @update:model-value="updateCredential({ queryName: String($event) })"
        />
        <BaseInput
          :model-value="firstCredential?.bodyPath ?? ''"
          label="Body path"
          placeholder="auth.token"
          @update:model-value="updateCredential({ bodyPath: String($event) })"
        />
      </div>
      <div class="te-grid te-grid--2">
        <BaseInput
          :model-value="firstCredential?.prefix ?? ''"
          label="Value prefix"
          placeholder="Bearer"
          @update:model-value="updateCredential({ prefix: String($event) })"
        />
        <BaseSwitch
          :model-value="Boolean(firstCredential?.required)"
          label="Required"
          @update:model-value="updateCredential({ required: Boolean($event) })"
        />
      </div>
      <BaseCodeEditor
        :model-value="String(firstCredential?.description ?? '')"
        language="markdown"
        label="Credential help"
        height="110px"
        @update:model-value="updateCredential({ description: String($event) })"
      />
    </section>

    <section v-else-if="kind === 'request' && method" class="te-section">
      <div class="te-section__header">
        <h3>Request</h3>
      </div>
      <div class="te-grid te-grid--2">
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
      </div>
      <BaseCodeEditor
        :model-value="requestPreview"
        language="json"
        label="Request preview"
        height="180px"
        disabled
      />
    </section>

    <section v-else-if="kind === 'header' && method" class="te-section">
      <div class="te-section__header">
        <h3>Header</h3>
      </div>
      <div class="te-grid te-grid--2">
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
      </div>
    </section>

    <section v-else-if="kind === 'query' && method" class="te-section">
      <div class="te-section__header">
        <h3>Query parameter</h3>
      </div>
      <div class="te-grid te-grid--2">
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
      </div>
    </section>

    <section v-else-if="kind === 'body' && method" class="te-section">
      <div class="te-section__header">
        <h3>Body</h3>
      </div>
      <BaseSelect
        :model-value="method.request.body.type"
        :options="bodyTypeOptions"
        label="Body type"
        @update:model-value="emit('updateRequest', method.id, { body: { ...method.request.body, type: String($event) as any } })"
      />
      <BaseCodeEditor
        :model-value="requestBody"
        :language="method.request.body.type === 'json' ? 'json' : 'text'"
        label="Body value"
        height="260px"
        @update:model-value="updateRequestBody(String($event))"
      />
    </section>

    <section v-else-if="kind === 'responseMapper' && method" class="te-section">
      <div class="te-section__header">
        <h3>Response mapper</h3>
      </div>
      <div class="te-grid te-grid--2">
        <BaseInput
          :model-value="firstResponseMapping.outputName"
          label="Output name"
          placeholder="customerId"
          @update:model-value="updateResponseMapping({ outputName: String($event) })"
        />
        <BaseInput
          :model-value="firstResponseMapping.path"
          label="Response path"
          placeholder="body.data.id"
          @update:model-value="updateResponseMapping({ path: String($event) })"
        />
      </div>
      <div class="te-grid te-grid--2">
        <BaseSelect
          :model-value="firstResponseMapping.type"
          :options="outputTypeOptions"
          label="Output type"
          @update:model-value="updateResponseMapping({ type: String($event) as any })"
        />
        <BaseSwitch
          :model-value="Boolean(firstResponseMapping.required)"
          label="Required output"
          @update:model-value="updateResponseMapping({ required: Boolean($event) })"
        />
      </div>
    </section>

    <section v-else-if="kind === 'errorMapper' && method" class="te-section">
      <div class="te-section__header">
        <h3>Error mapper</h3>
      </div>
      <div class="te-grid te-grid--3">
        <BaseInput
          :model-value="firstErrorMapping.code"
          label="Error code"
          placeholder="REQUEST_FAILED"
          @update:model-value="updateErrorMapping({ code: String($event) })"
        />
        <BaseSelect
          :model-value="firstErrorMapping.condition.source"
          :options="errorSourceOptions"
          label="Source"
          @update:model-value="updateErrorCondition({ source: String($event) as any })"
        />
        <BaseSelect
          :model-value="firstErrorMapping.condition.operator"
          :options="errorOperatorOptions"
          label="Operator"
          @update:model-value="updateErrorCondition({ operator: String($event) as any })"
        />
      </div>
      <div class="te-grid te-grid--2">
        <BaseInput
          :model-value="String(firstErrorMapping.condition.path ?? '')"
          label="Body path"
          placeholder="body.error.code"
          @update:model-value="updateErrorCondition({ path: String($event) })"
        />
        <BaseInput
          :model-value="String(firstErrorMapping.condition.value ?? '')"
          label="Compare value"
          placeholder="400"
          @update:model-value="updateErrorValue(String($event))"
        />
      </div>
      <BaseInput
        :model-value="errorMessageValue"
        label="Message"
        placeholder="Request failed"
        @update:model-value="updateErrorMessage(String($event))"
      />
    </section>

    <section v-else-if="kind === 'output' && method" class="te-section">
      <div class="te-section__header">
        <h3>Output field</h3>
      </div>
      <div class="te-grid te-grid--2">
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
      </div>
      <div class="te-grid te-grid--2">
        <BaseSelect
          :model-value="firstResponseMapping.type"
          :options="outputTypeOptions"
          label="Output type"
          @update:model-value="updateResponseMapping({ type: String($event) as any })"
        />
        <BaseSwitch
          :model-value="Boolean(firstResponseMapping.required)"
          label="Required output"
          @update:model-value="updateResponseMapping({ required: Boolean($event) })"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import type {
  PluginBlueprintAuthType,
  PluginBlueprintCredentialField,
  PluginBlueprintErrorCondition,
  PluginBlueprintErrorMapping,
  PluginBlueprintInput,
  PluginBlueprintInputOption,
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
const errorSourceOptions = ['status', 'body'].map((value) => option(value))
const errorOperatorOptions = ([
  ['equals', 'equals'],
  ['notEquals', 'not equals'],
  ['greaterThan', 'greater than'],
  ['greaterThanOrEquals', 'greater/equal'],
  ['lessThan', 'less than'],
  ['lessThanOrEquals', 'less/equal'],
  ['exists', 'exists'],
  ['notExists', 'not exists'],
] satisfies Array<[string, string]>).map(([value, label]) => option(value, label))

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
const requestBody = computed(() => stringifyEditorValue(method.value?.request.body.value ?? {}))
const requestPreview = computed(() => stringifyEditorValue(method.value?.request ?? {}))
const inputDefaultValue = computed(() => stringifyEditorValue(firstInput.value?.default ?? null))
const inputOptionsValue = computed(() => stringifyEditorValue(firstInput.value?.options ?? []))
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
  const parsed = parseEditorValue(value)
  emit('updateRequest', method.value.id, {
    body: {
      type: method.value.request.body.type === 'none' ? 'json' : method.value.request.body.type,
      value: parsed,
    },
  })
}

function updateInputDefault(value: string) {
  updateInput({ default: parseEditorValue(value) })
}

function updateInputOptions(value: string) {
  const parsed = parseEditorValue(value)
  updateInput({ options: Array.isArray(parsed) ? (parsed as PluginBlueprintInputOption[]) : [] })
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

function updateErrorCondition(payload: Partial<PluginBlueprintErrorCondition>) {
  updateErrorMapping({
    condition: {
      ...firstErrorMapping.value.condition,
      ...payload,
    },
  })
}

function updateErrorValue(value: string) {
  updateErrorCondition({
    value: Number.isNaN(Number(value)) || value.trim() === '' ? value : Number(value),
  })
}

function updateErrorMessage(value: string) {
  updateErrorMapping({ message: { type: 'static', value } })
}

function stringifyEditorValue(value: unknown) {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function parseEditorValue(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
</script>

<style scoped>
.plugin-creator-node-editor {
  padding: 16px;
}

.te-section__eyebrow {
  margin: 0 0 4px;
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.te-section__header h3 {
  margin: 0;
}

.te-grid {
  display: grid;
  gap: 12px;
}

.te-grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.te-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 900px) {
  .te-grid--2,
  .te-grid--3 {
    grid-template-columns: 1fr;
  }
}
</style>
