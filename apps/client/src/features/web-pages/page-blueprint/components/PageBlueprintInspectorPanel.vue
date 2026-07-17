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
        <BaseInspectorRow
          v-for="field in node.fields"
          :key="field.id"
          :label="field.label"
          :value="field.expression ?? field.value ?? ''"
          :placeholder="field.type"
          :editable="Boolean(field.configurable)"
          @update:value="$emit('updateFieldValue', node.id, field.id, $event)"
        />
      </BaseInspectorSection>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlueprintDocument } from '../pageBlueprintDocument.ts'
import BaseInspectorRow from './BaseInspectorRow.vue'
import BaseInspectorSection from './BaseInspectorSection.vue'

const props = defineProps<{
  document: PageBlueprintDocument
  selectedNodeId: string | null
}>()

defineEmits<{
  updateNodeLabel: [nodeId: string, label: string]
  updateFieldValue: [nodeId: string, fieldId: string, value: string]
}>()

const node = computed(() => props.document.nodes.find((item) => item.id === props.selectedNodeId))
const inferredKind = computed(() => {
  if (props.selectedNodeId?.startsWith('blueprint-element:')) return 'element'
  if (props.selectedNodeId?.startsWith('blueprint-workflow:')) return 'workflow'
  if (props.selectedNodeId?.startsWith('blueprint-binding:')) return 'binding'
  return 'node'
})
</script>
