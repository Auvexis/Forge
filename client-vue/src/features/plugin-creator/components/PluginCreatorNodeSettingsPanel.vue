<template>
  <section class="plugin-creator-node-settings">
    <div v-if="node" class="plugin-creator-node-settings__stack">
      <header>
        <p>{{ node.type }}</p>
        <h3>{{ String(node.data.name ?? node.data.label ?? node.id) }}</h3>
      </header>

      <BaseInput
        :model-value="String(node.data.name ?? node.data.label ?? '')"
        label="Node label"
        placeholder="Node label"
        @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
      />

      <template v-if="node.type === 'method' && method">
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
        <BaseCodeEditor
          :model-value="method.description"
          language="markdown"
          label="Method description"
          height="120px"
          @update:model-value="emit('updateMethod', method.id, { description: $event })"
        />
      </template>

      <template v-else-if="node.type === 'input' && method">
        <BaseInput
          :model-value="firstInput?.name ?? ''"
          label="Input name"
          placeholder="customerId"
          @update:model-value="updateInputName(String($event))"
        />
        <BaseSwitch
          :model-value="Boolean(firstInput?.required)"
          label="Required"
          @update:model-value="updateInputRequired($event)"
        />
      </template>

      <template v-else-if="node.type === 'credential'">
        <BaseInput
          :model-value="firstCredential?.name ?? ''"
          label="Credential name"
          placeholder="apiKey"
          @update:model-value="updateCredential('name', String($event))"
        />
        <BaseInput
          :model-value="firstCredential?.headerName ?? ''"
          label="Header name"
          placeholder="Authorization"
          @update:model-value="updateCredential('headerName', String($event))"
        />
      </template>

      <template v-else-if="isRequestLike && method">
        <BaseInput
          :model-value="method.request.method"
          label="HTTP method"
          placeholder="GET"
          @update:model-value="emit('updateRequest', method.id, { method: String($event) as any })"
        />
        <BaseInput
          :model-value="method.request.url"
          label="Request URL"
          placeholder="https://api.example.com"
          @update:model-value="emit('updateRequest', method.id, { url: String($event) })"
        />
        <BaseCodeEditor
          :model-value="requestBody"
          language="json"
          label="Request body"
          height="180px"
          @update:model-value="updateRequestBody"
        />
      </template>

      <template v-else-if="node.type === 'responseMapper' || node.type === 'output'">
        <BaseInput
          :model-value="String(node.data.path ?? '')"
          label="Response path"
          placeholder="{{ body.data.id }}"
          @update:model-value="updateNodeData({ path: String($event) })"
        />
      </template>

      <template v-else-if="node.type === 'errorMapper'">
        <BaseInput
          :model-value="String(node.data.status ?? '400')"
          label="Status code"
          placeholder="400"
          @update:model-value="updateNodeData({ status: String($event) })"
        />
      </template>

      <div class="plugin-creator-node-settings__tree">
        <span>Last response values</span>
        <JsonTreeView :data="jsonTreeData" :is-root="true" />
      </div>
    </div>

    <p v-else class="plugin-creator-node-settings__empty">Select a node to configure it.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import JsonTreeView from '@/features/workflow-editor/components/settings/shared/JsonTreeView.vue'
import type {
  PluginBlueprint,
  PluginBlueprintCredentialField,
  PluginBlueprintInput,
  PluginBlueprintMethod,
  PluginBlueprintNode,
  PluginBlueprintRequest,
  PluginCreatorTestResult,
} from '@/core/types/plugin-creator.types'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
  nodeId?: string | null
  lastTestResult?: PluginCreatorTestResult | null
}>()

const emit = defineEmits<{
  updateNode: [nodeId: string, payload: Partial<PluginBlueprintNode>]
  updateMethod: [methodId: string, payload: Partial<PluginBlueprintMethod>]
  updateInput: [methodId: string, inputName: string, payload: Partial<PluginBlueprintInput>]
  updateCredential: [fieldName: string, payload: Partial<PluginBlueprintCredentialField>]
  updateRequest: [methodId: string, payload: Partial<PluginBlueprintRequest>]
}>()

const node = computed(() =>
  props.blueprint && props.nodeId ? props.blueprint.canvas.nodes[props.nodeId] : null,
)
const method = computed(() => {
  if (!props.blueprint) return null
  const methodId = node.value?.data.methodId
  if (typeof methodId === 'string') {
    return props.blueprint.methods.find((candidate) => candidate.id === methodId) ?? null
  }
  return props.blueprint.methods[0] ?? null
})
const firstInput = computed(() => method.value?.inputs[0] ?? null)
const firstCredential = computed(() => props.blueprint?.auth.fields[0] ?? null)
const isRequestLike = computed(() =>
  ['request', 'header', 'query', 'body'].includes(String(node.value?.type)),
)
const requestBody = computed(() => JSON.stringify(method.value?.request.body.value ?? {}, null, 2))
const jsonTreeData = computed(
  () => props.lastTestResult?.body ?? { body: { data: { id: 'example' } } },
)

function updateNodeData(data: Record<string, unknown>) {
  if (!node.value) return
  emit('updateNode', node.value.id, { data })
}

function updateInputName(name: string) {
  if (!method.value || !firstInput.value) return
  emit('updateInput', method.value.id, firstInput.value.name, { name })
}

function updateInputRequired(required: boolean) {
  if (!method.value || !firstInput.value) return
  emit('updateInput', method.value.id, firstInput.value.name, { required })
}

function updateCredential(field: keyof PluginBlueprintCredentialField, value: string) {
  if (!firstCredential.value) return
  emit('updateCredential', firstCredential.value.name, { [field]: value })
}

function updateRequestBody(value: string) {
  if (!method.value) return
  try {
    emit('updateRequest', method.value.id, { body: { type: 'json', value: JSON.parse(value) } })
  } catch {
    emit('updateRequest', method.value.id, { body: { type: 'text', value } })
  }
}
</script>

<style scoped>
.plugin-creator-node-settings {
  height: 100%;
  overflow: auto;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.plugin-creator-node-settings__stack {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.plugin-creator-node-settings header p,
.plugin-creator-node-settings header h3 {
  margin: 0;
}

.plugin-creator-node-settings header p {
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.plugin-creator-node-settings header h3 {
  margin-top: 4px;
  font-size: 16px;
}

.plugin-creator-node-settings__tree {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
}

.plugin-creator-node-settings__tree > span {
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.plugin-creator-node-settings__empty {
  margin: 0;
  padding: 16px;
  color: var(--sailor-text-secondary);
}
</style>
