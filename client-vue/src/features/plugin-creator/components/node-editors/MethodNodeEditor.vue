<template>
  <div v-if="node && method" class="editor-stack method-node-editor">
    <NodeEditorSection
      title="Method"
      eyebrow="Plugin action"
      icon="workflow"
      :description="method.description || 'Define how this action appears, receives inputs and stores credentials.'"
    >
      <div class="te-field">
        <span class="te-label">Step Name</span>
        <BaseInput
          :model-value="String(node.data.name ?? node.data.label ?? '')"
          placeholder="List records"
          @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
        />
        <p class="te-hint">Visible label used on the canvas.</p>
      </div>

      <div class="te-field">
        <span class="te-label">Method Handle</span>
        <BaseInput
          :model-value="method.handle"
          placeholder="listRecords"
          @update:model-value="updateMethodPatch({ handle: normalizeHandle(String($event)) })"
        />
        <p class="te-hint">
          Workflows call this method by
          <code class="editor-code-snippet">{{ method.handle || 'handle' }}</code>.
        </p>
      </div>
    </NodeEditorSection>

    <NodeEditorSection title="Method metadata" description="Public method identity used by generated plugin code.">
      <div class="te-field">
        <span class="te-label">Method Name</span>
        <BaseInput
          :model-value="method.name"
          placeholder="List records"
          @update:model-value="updateMethodPatch({ name: String($event) })"
        />
      </div>
      <div class="te-field">
        <span class="te-label">Category</span>
        <BaseInput
          :model-value="method.category ?? ''"
          placeholder="Records"
          @update:model-value="updateMethodPatch({ category: String($event) || undefined })"
        />
      </div>
      <div class="te-field">
        <span class="te-label">Method Description</span>
        <BaseCodeEditor
          :model-value="method.description"
          language="markdown"
          height="132px"
          @update:model-value="updateMethodPatch({ description: String($event) })"
        />
      </div>
    </NodeEditorSection>

    <NodeEditorSection
      title="Inputs"
      description="Parameters exposed to workflows as method params."
    >
      <div v-if="method.inputs.length" class="method-node-editor__rows">
        <div v-for="(input, index) in method.inputs" :key="`${input.name}_${index}`" class="method-node-editor__row">
          <BaseInput
            :model-value="input.name"
            label="Name"
            placeholder="customerId"
            @update:model-value="updateInputAt(index, { name: normalizeHandle(String($event)) })"
          />
          <BaseSelect
            :model-value="input.type"
            :options="inputTypeOptions"
            label="Type"
            @update:model-value="updateInputAt(index, { type: String($event) as PluginBlueprintInputType })"
          />
          <BaseInput
            :model-value="String(input.placeholder ?? '')"
            label="Placeholder"
            placeholder="cus_123"
            @update:model-value="updateInputAt(index, { placeholder: String($event) || undefined })"
          />
          <BaseSwitch
            :model-value="Boolean(input.required)"
            label="Required"
            @update:model-value="updateInputAt(index, { required: Boolean($event) })"
          />
          <button class="method-node-editor__row-action" type="button" title="Remove input" @click="removeInputAt(index)">
            <LucideIcon name="x" :size="14" />
          </button>
        </div>
      </div>
      <button class="editor-add-btn" type="button" @click="addInput">
        <LucideIcon name="plus" :size="14" />
        Add input
      </button>
    </NodeEditorSection>

    <NodeEditorSection
      title="Credentials"
      description="Auth fields shared by methods in this plugin."
    >
      <div v-if="credentials.length" class="method-node-editor__rows">
        <div
          v-for="(credential, index) in credentials"
          :key="`${credential.name}_${index}`"
          class="method-node-editor__row method-node-editor__row--credentials"
        >
          <BaseInput
            :model-value="credential.name"
            label="Name"
            placeholder="apiKey"
            @update:model-value="updateCredentialAt(index, { name: normalizeHandle(String($event)) })"
          />
          <BaseInput
            :model-value="credential.label"
            label="Label"
            placeholder="API Key"
            @update:model-value="updateCredentialAt(index, { label: String($event) })"
          />
          <BaseSelect
            :model-value="credential.target"
            :options="credentialTargetOptions"
            label="Target"
            @update:model-value="updateCredentialAt(index, { target: String($event) as PluginCredentialTarget })"
          />
          <BaseSwitch
            :model-value="Boolean(credential.required)"
            label="Required"
            @update:model-value="updateCredentialAt(index, { required: Boolean($event) })"
          />
        </div>
      </div>
      <button class="editor-add-btn" type="button" @click="emit('addCredential')">
        <LucideIcon name="plus" :size="14" />
        Add credential
      </button>
    </NodeEditorSection>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect, { type SelectOption } from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type {
  PluginBlueprintCredentialField,
  PluginBlueprintInput,
  PluginBlueprintInputType,
  PluginCredentialTarget,
} from '@/core/types/plugin-creator.types'
import NodeEditorSection from './NodeEditorSection.vue'
import { usePluginCreatorNodeEditorContext } from './usePluginCreatorNodeEditorContext'
import type { PluginCreatorNodeEditorEmits, PluginCreatorNodeEditorProps } from './types'

const props = defineProps<PluginCreatorNodeEditorProps>()
const emit = defineEmits<PluginCreatorNodeEditorEmits>()
const { blueprint, node, method, updateNodeData, updateMethodPatch } =
  usePluginCreatorNodeEditorContext(props, emit)

const option = (value: string, label = value, icon?: string): SelectOption => ({ value, label, icon })
const inputTypeOptions = [
  option('string', 'Text', 'type'),
  option('number', 'Number', 'hash'),
  option('boolean', 'Boolean', 'toggle-left'),
  option('object', 'Object', 'braces'),
  option('array', 'Array', 'list'),
  option('select', 'Select', 'list-checks'),
  option('file', 'File', 'file'),
]
const credentialTargetOptions = [
  option('header', 'Header', 'panel-top'),
  option('query', 'Query', 'search'),
  option('body', 'Body', 'braces'),
]

const credentials = computed(() => blueprint.value?.auth.fields ?? [])

function addInput() {
  if (!method.value) return
  updateMethodPatch({
    inputs: [
      ...method.value.inputs,
      {
        name: `input${method.value.inputs.length + 1}`,
        type: 'string',
        required: false,
        placeholder: '',
      },
    ],
  })
}

function updateInputAt(index: number, payload: Partial<PluginBlueprintInput>) {
  if (!method.value) return
  updateMethodPatch({
    inputs: method.value.inputs.map((input, currentIndex) =>
      currentIndex === index ? { ...input, ...payload } : input,
    ),
  })
}

function removeInputAt(index: number) {
  if (!method.value) return
  updateMethodPatch({
    inputs: method.value.inputs.filter((_, currentIndex) => currentIndex !== index),
  })
}

function updateCredentialAt(index: number, payload: Partial<PluginBlueprintCredentialField>) {
  const credential = credentials.value[index]
  if (!credential) return
  emit('updateCredential', credential.name, payload)
}

function normalizeHandle(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_:-]/g, '_')
    .replace(/_{2,}/g, '_')
}
</script>

<style scoped>
.method-node-editor__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.method-node-editor__row {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(120px, 0.8fr) minmax(130px, 1fr) minmax(102px, auto) 32px;
  align-items: end;
  gap: 8px;
}

.method-node-editor__row--credentials {
  grid-template-columns: minmax(110px, 1fr) minmax(120px, 1fr) minmax(120px, 0.8fr) auto;
}

.method-node-editor__row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  margin-bottom: 1px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

.method-node-editor__row :deep(.base-switch-wrapper) {
  min-height: 32px;
  justify-content: flex-start;
  white-space: nowrap;
}

.method-node-editor__row-action {
  width: 30px;
  color: var(--sailor-text-muted);
}

.method-node-editor__row-action:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

@media (max-width: 980px) {
  .method-node-editor__row,
  .method-node-editor__row--credentials {
    grid-template-columns: 1fr;
  }
}
</style>
