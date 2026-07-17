<template>
  <div class="web-page-blueprint-inspector">
    <p v-if="!selectedNodeId" class="web-page-editor__empty">Select a Blueprint node.</p>

    <template v-else>
      <BaseInspectorSection title="Node" icon="box">
        <BaseInspectorRow label="ID" :value="selectedNodeId" />
        <BaseInspectorRow label="Kind" :value="node?.kind ?? inferredKind" />
        <BaseInspectorRow
          label="Label"
          :value="node?.label ?? selectedNodeId"
          :editable="Boolean(node)"
          @update:value="node && $emit('updateNodeLabel', node.id, $event)"
        />
        <BaseInspectorRow v-if="node" label="Type" :value="node.type" />
      </BaseInspectorSection>

      <BaseInspectorSection v-if="node" title="Fields" icon="list-tree">
        <div v-if="node.type === 'transform-data'" class="web-page-blueprint-inspector-actions">
          <BaseInspectorButton label="Add Field" icon="plus" @click="$emit('addNodeField', node.id)" />
        </div>
        <BaseInspectorRow
          v-for="field in node.fields"
          :key="field.id"
          :label="field.label"
          :value="field.expression ?? field.value ?? ''"
          :placeholder="field.type"
          :editable="Boolean(field.configurable)"
          @update:value="$emit('updateFieldValue', node.id, field.id, $event)"
        />
        <p v-if="node.fields.length === 0" class="web-page-blueprint-inspector-empty">
          No fields.
        </p>
      </BaseInspectorSection>

      <BaseInspectorSection v-if="node?.type === 'run-workflow'" title="Test Run" icon="play">
        <BaseInspectorTextarea
          v-model="runWorkflowJson"
          label="JSON"
          placeholder="{ &quot;name&quot;: &quot;Product&quot; }"
        />
        <p v-if="runWorkflowError" class="web-page-blueprint-inspector-error">{{ runWorkflowError }}</p>
        <div class="web-page-blueprint-inspector-actions">
          <BaseInspectorButton label="Test Run" icon="play" @click="testRunWorkflow" />
        </div>
      </BaseInspectorSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PageBlueprintDocument } from '../pageBlueprintDocument.ts'
import BaseInspectorButton from './BaseInspectorButton.vue'
import BaseInspectorRow from './BaseInspectorRow.vue'
import BaseInspectorSection from './BaseInspectorSection.vue'
import BaseInspectorTextarea from './BaseInspectorTextarea.vue'

const props = defineProps<{
  document: PageBlueprintDocument
  selectedNodeId: string | null
}>()

const emit = defineEmits<{
  updateNodeLabel: [nodeId: string, label: string]
  updateFieldValue: [nodeId: string, fieldId: string, value: string]
  addNodeField: [nodeId: string]
  testRunWorkflow: [nodeId: string, json: string]
}>()

const node = computed(() => props.document.nodes.find((item) => item.id === props.selectedNodeId))
const runWorkflowJson = ref('{\n  "name": "Product",\n  "price": 129,\n  "active": true\n}')
const runWorkflowError = ref('')

watch(node, (nextNode) => {
  if (nextNode?.type !== 'run-workflow') return
  const savedJson = nextNode.data?.testResultJson
  if (typeof savedJson === 'string') runWorkflowJson.value = savedJson
}, { immediate: true })

const inferredKind = computed(() => {
  if (props.selectedNodeId?.startsWith('blueprint-element:')) return 'element'
  if (props.selectedNodeId?.startsWith('blueprint-workflow:')) return 'workflow'
  if (props.selectedNodeId?.startsWith('blueprint-binding:')) return 'binding'
  return 'node'
})

function testRunWorkflow() {
  if (!node.value) return
  runWorkflowError.value = ''
  try {
    JSON.parse(runWorkflowJson.value)
  } catch {
    runWorkflowError.value = 'Invalid JSON.'
    return
  }
  emit('testRunWorkflow', node.value.id, runWorkflowJson.value)
}
</script>
