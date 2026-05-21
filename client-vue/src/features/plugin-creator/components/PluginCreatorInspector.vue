<template>
  <aside class="plugin-creator-inspector" aria-label="Plugin Creator Inspector">
    <section>
      <h2>Plugin metadata</h2>
      <label>
        <span>Plugin name</span>
        <input :value="blueprint?.metadata.name ?? ''" @input="updateMetadata('name', $event)" />
      </label>
      <label>
        <span>Plugin handle</span>
        <input :value="blueprint?.metadata.handle ?? ''" @input="updateMetadata('handle', $event)" />
      </label>
      <label>
        <span>Plugin version</span>
        <input :value="blueprint?.metadata.version ?? ''" @input="updateMetadata('version', $event)" />
      </label>
      <label>
        <span>Description</span>
        <textarea
          :value="blueprint?.metadata.description ?? ''"
          rows="3"
          @input="updateMetadata('description', $event)"
        />
      </label>
    </section>

    <section v-if="selectedMethod">
      <h2>Method metadata</h2>
      <label>
        <span>Method name</span>
        <input :value="selectedMethod.name" @input="updateMethod('name', $event)" />
      </label>
      <label>
        <span>Method handle</span>
        <input :value="selectedMethod.handle" @input="updateMethod('handle', $event)" />
      </label>
      <label>
        <span>Description</span>
        <textarea
          :value="selectedMethod.description"
          rows="3"
          @input="updateMethod('description', $event)"
        />
      </label>
    </section>

    <section v-if="firstInput && selectedMethod">
      <h2>Input field</h2>
      <label>
        <span>Input name</span>
        <input :value="firstInput.name" @input="updateInput('name', $event)" />
      </label>
      <label>
        <span>Input type</span>
        <select :value="firstInput.type" @change="updateInput('type', $event)">
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="object">object</option>
          <option value="array">array</option>
          <option value="select">select</option>
          <option value="file">file</option>
        </select>
      </label>
      <label class="plugin-creator-inspector__check">
        <input :checked="firstInput.required" type="checkbox" @change="updateInputRequired" />
        <span>Required</span>
      </label>
    </section>

    <section v-if="firstCredential">
      <h2>Credential field</h2>
      <label>
        <span>Credential name</span>
        <input :value="firstCredential.name" @input="updateCredential('name', $event)" />
      </label>
      <label>
        <span>Credential label</span>
        <input :value="firstCredential.label" @input="updateCredential('label', $event)" />
      </label>
      <label>
        <span>Header name</span>
        <input :value="firstCredential.headerName ?? ''" @input="updateCredential('headerName', $event)" />
      </label>
    </section>

    <section v-if="selectedMethod">
      <h2>Request</h2>
      <label>
        <span>Request URL</span>
        <input :value="selectedMethod.request.url" @input="updateRequest('url', $event)" />
      </label>
      <label>
        <span>Request method</span>
        <select :value="selectedMethod.request.method" @change="updateRequest('method', $event)">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
        </select>
      </label>
      <label>
        <span>Query name</span>
        <input :value="firstQueryName" @input="updateFirstQueryName" />
      </label>
      <label>
        <span>JSON body</span>
        <textarea :value="requestBodyJson" rows="5" @input="updateRequestJsonBody" />
      </label>
    </section>

    <p v-if="blueprint && !selectedMethod" class="plugin-creator-inspector__empty">
      Select a method, input or request node to edit method details.
    </p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  PluginBlueprint,
  PluginBlueprintCredentialField,
  PluginBlueprintHttpMethod,
  PluginBlueprintInput,
  PluginBlueprintInputType,
  PluginBlueprintMetadata,
  PluginBlueprintMethod,
  PluginBlueprintRequest,
} from '../../../core/types/plugin-creator.types.ts'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
  selectedNodeId?: string | null
}>()

const emit = defineEmits<{
  'update-metadata': [payload: Partial<PluginBlueprintMetadata>]
  'update-node': [nodeId: string, payload: { data: Record<string, unknown> }]
  'update-method': [methodId: string, payload: Partial<PluginBlueprintMethod>]
  'update-input': [
    methodId: string,
    inputName: string,
    payload: Partial<PluginBlueprintInput>,
  ]
  'update-credential': [
    fieldName: string,
    payload: Partial<PluginBlueprintCredentialField>,
  ]
  'update-request': [methodId: string, payload: Partial<PluginBlueprintRequest>]
}>()

const selectedNode = computed(() => {
  if (!props.blueprint || !props.selectedNodeId) return null
  return props.blueprint.canvas.nodes[props.selectedNodeId] ?? null
})

const selectedMethod = computed(() => {
  if (!props.blueprint) return null
  const methodId = selectedNode.value?.data.methodId
  if (typeof methodId === 'string') {
    return props.blueprint.methods.find((method) => method.id === methodId) ?? null
  }
  return props.blueprint.methods[0] ?? null
})

const firstInput = computed(() => selectedMethod.value?.inputs[0] ?? null)
const firstCredential = computed(() => props.blueprint?.auth.fields[0] ?? null)
const firstQueryName = computed(() => String(selectedMethod.value?.request.query[0]?.name ?? ''))
const requestBodyJson = computed(() =>
  JSON.stringify(selectedMethod.value?.request.body.value ?? {}, null, 2),
)

function eventValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
}

function updateMetadata(field: keyof PluginBlueprintMetadata, event: Event) {
  emit('update-metadata', { [field]: eventValue(event) })
}

function updateMethod(field: 'name' | 'handle' | 'description', event: Event) {
  if (!selectedMethod.value) return
  const value = eventValue(event)
  emit('update-method', selectedMethod.value.id, { [field]: value })
  if (field === 'name' && selectedNode.value) {
    emit('update-node', selectedNode.value.id, { data: { name: value } })
  }
  if (field === 'handle' && selectedNode.value) {
    emit('update-node', selectedNode.value.id, { data: { handle: value } })
  }
}

function updateInput(field: 'name' | 'type', event: Event) {
  if (!selectedMethod.value || !firstInput.value) return
  const value = eventValue(event)
  emit('update-input', selectedMethod.value.id, firstInput.value.name, {
    [field]: field === 'type' ? (value as PluginBlueprintInputType) : value,
  })
}

function updateInputRequired(event: Event) {
  if (!selectedMethod.value || !firstInput.value) return
  emit('update-input', selectedMethod.value.id, firstInput.value.name, {
    required: (event.target as HTMLInputElement).checked,
  })
}

function updateCredential(field: 'name' | 'label' | 'headerName', event: Event) {
  if (!firstCredential.value) return
  emit('update-credential', firstCredential.value.name, { [field]: eventValue(event) })
}

function updateRequest(field: 'url' | 'method', event: Event) {
  if (!selectedMethod.value) return
  const value = eventValue(event)
  emit('update-request', selectedMethod.value.id, {
    [field]: field === 'method' ? (value as PluginBlueprintHttpMethod) : value,
  })
}

function updateFirstQueryName(event: Event) {
  if (!selectedMethod.value) return
  const [firstQuery, ...rest] = selectedMethod.value.request.query
  emit('update-request', selectedMethod.value.id, {
    query: [{ ...(firstQuery ?? { value: '' }), name: eventValue(event) }, ...rest],
  })
}

function updateRequestJsonBody(event: Event) {
  if (!selectedMethod.value) return
  try {
    emit('update-request', selectedMethod.value.id, {
      body: { type: 'json', value: JSON.parse(eventValue(event)) as unknown },
    })
  } catch {
    emit('update-request', selectedMethod.value.id, {
      body: { type: 'text', value: eventValue(event) },
    })
  }
}
</script>

<style scoped>
.plugin-creator-inspector {
  height: 100%;
  min-width: 0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: auto;
  border-left: 1px solid var(--sailor-border-subtle);
  background: var(--sailor-bg-base);
}

.plugin-creator-inspector section {
  display: grid;
  gap: 10px;
}

.plugin-creator-inspector h2 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: 13px;
  line-height: 1.2;
}

.plugin-creator-inspector label {
  display: grid;
  gap: 5px;
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.plugin-creator-inspector input,
.plugin-creator-inspector select,
.plugin-creator-inspector textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
  font: inherit;
  font-size: 13px;
}

.plugin-creator-inspector input,
.plugin-creator-inspector select {
  height: 34px;
  padding: 0 9px;
}

.plugin-creator-inspector textarea {
  resize: vertical;
  padding: 8px 9px;
  line-height: 1.4;
}

.plugin-creator-inspector__check {
  grid-template-columns: auto 1fr;
  align-items: center;
}

.plugin-creator-inspector__check input {
  width: 16px;
  height: 16px;
}

.plugin-creator-inspector__empty {
  margin: 0;
  color: var(--sailor-text-secondary);
  font-size: 13px;
  line-height: 1.45;
}
</style>
