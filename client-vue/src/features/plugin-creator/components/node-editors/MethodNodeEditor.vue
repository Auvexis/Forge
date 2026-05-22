<template>
  <div v-if="node && method" class="node-editor-stack method-node-editor">
    <NodeEditorSection
      title="Method"
      eyebrow="Plugin action"
      icon="workflow"
      :description="method.description || 'Define how this action appears, receives inputs and stores credentials.'"
    >
      <div class="method-node-editor__action-row">
        <span class="method-node-editor__action-icon">
          <LucideIcon name="route" :size="15" />
        </span>
        <div class="method-node-editor__action-copy">
          <strong>{{ method.name || 'Untitled Method' }}</strong>
          <span>{{ method.handle || 'method_handle' }}</span>
        </div>
        <div class="method-node-editor__action-stats">
          <span>{{ method.inputs.length }} inputs</span>
          <span>{{ credentialCount }} credentials</span>
          <span>{{ method.responseMapping.length }} outputs</span>
        </div>
      </div>

      <div class="editor-hint editor-hint--violet">
        Workflows call this method by
        <span class="editor-code-snippet">{{ method.handle || 'handle' }}</span>
        and receive mapped outputs from the response nodes.
      </div>

      <div class="method-node-editor__grid method-node-editor__grid--2">
        <BaseInput
          :model-value="String(node.data.name ?? node.data.label ?? '')"
          label="Step name"
          placeholder="List records"
          hint="Visible label used on the canvas."
          @update:model-value="updateNodeData({ name: String($event), label: String($event) })"
        />
        <BaseInput
          :model-value="method.handle"
          label="Method handle"
          placeholder="listRecords"
          hint="Used by workflows."
          @update:model-value="updateMethodPatch({ handle: normalizeHandle(String($event)) })"
        />
      </div>
    </NodeEditorSection>

    <NodeEditorSection title="Method metadata" description="Public method identity used by generated plugin code.">
      <div class="method-node-editor__grid method-node-editor__grid--2">
        <BaseInput
          :model-value="method.name"
          label="Method name"
          placeholder="List records"
          @update:model-value="updateMethodPatch({ name: String($event) })"
        />
        <BaseInput :model-value="node.id" label="Node ID" hint="Edit this in Settings." disabled />
      </div>
      <BaseInput
        :model-value="method.category ?? ''"
        label="Category"
        placeholder="Records"
        @update:model-value="updateMethodPatch({ category: String($event) || undefined })"
      />
      <BaseCodeEditor
        :model-value="method.description"
        language="markdown"
        label="Method description"
        height="132px"
        @update:model-value="updateMethodPatch({ description: String($event) })"
      />
    </NodeEditorSection>

    <NodeEditorSection
      title="Inputs"
      description="Parameters exposed to workflows as method params."
    >
      <template #toolbar>
        <button class="method-node-editor__icon-action" type="button" title="Add input" @click="addInput">
          <LucideIcon name="plus" :size="14" />
          <span>Add input</span>
        </button>
      </template>

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
      <button v-else class="method-node-editor__empty-add" type="button" @click="addInput">
        <LucideIcon name="plus" :size="14" />
        Add input
      </button>
    </NodeEditorSection>

    <NodeEditorSection
      title="Credentials"
      description="Auth fields shared by methods in this plugin."
    >
      <template #toolbar>
        <button class="method-node-editor__icon-action" type="button" title="Add credential" @click="emit('addCredential')">
          <LucideIcon name="plus" :size="14" />
          <span>Add credential</span>
        </button>
      </template>

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
      <button v-else class="method-node-editor__empty-add" type="button" @click="emit('addCredential')">
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
const credentialCount = computed(() => credentials.value.length)

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
.node-editor-stack {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.method-node-editor__action-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-elevated);
}

.method-node-editor__action-icon {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  color: var(--sailor-accent);
}

.method-node-editor__action-copy {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
}

.method-node-editor__action-copy strong {
  color: var(--sailor-text-primary);
  font-size: 13px;
  font-weight: 750;
}

.method-node-editor__action-copy span {
  color: var(--sailor-text-muted);
  font-family: var(--sailor-font-mono);
  font-size: 11px;
}

.method-node-editor__action-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}

.method-node-editor__action-stats span {
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-weight: 650;
}

.method-node-editor__grid {
  display: grid;
  gap: 10px;
}

.method-node-editor__grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.method-node-editor__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.method-node-editor__row {
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(120px, 0.8fr) minmax(130px, 1fr) auto 32px;
  align-items: end;
  gap: 8px;
}

.method-node-editor__row--credentials {
  grid-template-columns: minmax(110px, 1fr) minmax(120px, 1fr) minmax(120px, 0.8fr) auto;
}

.method-node-editor__icon-action,
.method-node-editor__empty-add,
.method-node-editor__row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

.method-node-editor__icon-action {
  padding: 0 9px;
}

.method-node-editor__row-action {
  width: 30px;
  color: var(--sailor-text-muted);
}

.method-node-editor__empty-add {
  width: 100%;
  border-style: dashed;
}

.method-node-editor__icon-action:hover,
.method-node-editor__empty-add:hover,
.method-node-editor__row-action:hover {
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

@media (max-width: 980px) {
  .method-node-editor__action-row,
  .method-node-editor__action-copy,
  .method-node-editor__action-stats {
    align-items: flex-start;
    flex-direction: column;
  }

  .method-node-editor__grid--2,
  .method-node-editor__row,
  .method-node-editor__row--credentials {
    grid-template-columns: 1fr;
  }
}
</style>
