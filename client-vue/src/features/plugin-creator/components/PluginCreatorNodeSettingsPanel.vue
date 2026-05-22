<template>
  <section class="plugin-creator-node-settings">
    <component
      :is="editorComponent"
      v-if="node && editorComponent"
      :blueprint="blueprint"
      :node-id="nodeId"
      :last-test-result="lastTestResult"
      @update-node="forwardUpdateNode"
      @update-method="forwardUpdateMethod"
      @update-input="forwardUpdateInput"
      @update-credential="forwardUpdateCredential"
      @update-request="forwardUpdateRequest"
      @add-credential="emit('addCredential')"
    />
    <p v-else class="plugin-creator-node-settings__empty">Select a node to configure it.</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  PluginBlueprint,
  PluginBlueprintCredentialField,
  PluginBlueprintInput,
  PluginBlueprintMethod,
  PluginBlueprintNode,
  PluginBlueprintRequest,
  PluginCreatorTestResult,
} from '@/core/types/plugin-creator.types'
import MethodNodeEditor from './node-editors/MethodNodeEditor.vue'
import InputFieldNodeEditor from './node-editors/InputFieldNodeEditor.vue'
import CredentialFieldNodeEditor from './node-editors/CredentialFieldNodeEditor.vue'
import RequestNodeEditor from './node-editors/RequestNodeEditor.vue'
import HeaderNodeEditor from './node-editors/HeaderNodeEditor.vue'
import QueryParamNodeEditor from './node-editors/QueryParamNodeEditor.vue'
import JsonBodyNodeEditor from './node-editors/JsonBodyNodeEditor.vue'
import ResponseMapperNodeEditor from './node-editors/ResponseMapperNodeEditor.vue'
import ErrorMapperNodeEditor from './node-editors/ErrorMapperNodeEditor.vue'
import CodeBlockNodeEditor from './node-editors/CodeBlockNodeEditor.vue'
import OutputNodeEditor from './node-editors/OutputNodeEditor.vue'
import IfNodeEditor from './node-editors/IfNodeEditor.vue'
import SwitchNodeEditor from './node-editors/SwitchNodeEditor.vue'
import TryCatchNodeEditor from './node-editors/TryCatchNodeEditor.vue'
import PluginCreatorNodeEditorFields from './node-editors/PluginCreatorNodeEditorFields.vue'

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
  addCredential: []
}>()

const node = computed(() =>
  props.blueprint && props.nodeId ? props.blueprint.canvas.nodes[props.nodeId] : null,
)

const editorComponent = computed(() => {
  switch (node.value?.type) {
    case 'method':
      return MethodNodeEditor
    case 'input':
      return InputFieldNodeEditor
    case 'credential':
      return CredentialFieldNodeEditor
    case 'request':
      return RequestNodeEditor
    case 'header':
      return HeaderNodeEditor
    case 'query':
      return QueryParamNodeEditor
    case 'body':
      return JsonBodyNodeEditor
    case 'responseMapper':
      return ResponseMapperNodeEditor
    case 'errorMapper':
      return ErrorMapperNodeEditor
    case 'codeBlock':
      return CodeBlockNodeEditor
    case 'output':
      return OutputNodeEditor
    case 'if':
      return IfNodeEditor
    case 'switch':
      return SwitchNodeEditor
    case 'tryCatch':
      return TryCatchNodeEditor
    default:
      return null
  }
})

function forwardUpdateNode(nodeId: string, payload: Partial<PluginBlueprintNode>) {
  emit('updateNode', nodeId, payload)
}

function forwardUpdateMethod(methodId: string, payload: Partial<PluginBlueprintMethod>) {
  emit('updateMethod', methodId, payload)
}

function forwardUpdateInput(
  methodId: string,
  inputName: string,
  payload: Partial<PluginBlueprintInput>,
) {
  emit('updateInput', methodId, inputName, payload)
}

function forwardUpdateCredential(
  fieldName: string,
  payload: Partial<PluginBlueprintCredentialField>,
) {
  emit('updateCredential', fieldName, payload)
}

function forwardUpdateRequest(methodId: string, payload: Partial<PluginBlueprintRequest>) {
  emit('updateRequest', methodId, payload)
}
</script>

<style scoped>
.plugin-creator-node-settings {
  height: 100%;
  overflow: auto;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.plugin-creator-node-settings__empty {
  margin: 0;
  padding: 16px;
  color: var(--sailor-text-secondary);
}
</style>
