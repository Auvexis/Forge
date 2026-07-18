<template>
  <div class="web-page-blueprint-component-inspector">
    <BaseInspectorSection title="Node" icon="component">
      <BaseInspectorRow label="ID" :value="node.id" />
      <BaseInspectorRow label="Kind" value="component" />
      <BaseInspectorRow
        label="Name"
        :value="component.name"
        editable
        @update:value="$emit('updateName', component.id, $event)"
      />
      <BaseInspectorRow label="Type" value="page-component" />
    </BaseInspectorSection>

    <BaseInspectorSection title="Props" icon="sliders-horizontal">
      <template
        v-for="prop in component.props"
        :key="prop.id"
      >
        <BaseInspectorRow
          label="Name"
          :value="prop.label"
          editable
          @update:value="$emit('updatePortLabel', component.id, prop.id, $event)"
        />
        <BaseInspectorRow
          :label="prop.type ?? 'Target'"
          :value="componentFieldExpression(prop.id) ?? targetLabel(prop)"
          :placeholder="prop.type"
        />
      </template>
      <p v-if="component.props.length === 0" class="web-page-blueprint-inspector-empty">
        No props.
      </p>
    </BaseInspectorSection>

    <BaseInspectorSection title="Events" icon="mouse-pointer-click">
      <template
        v-for="event in component.events"
        :key="event.id"
      >
        <BaseInspectorRow
          label="Name"
          :value="event.label"
          editable
          @update:value="$emit('updatePortLabel', component.id, event.id, $event)"
        />
        <BaseInspectorRow
          label="Event"
          :value="componentFieldExpression(event.id) ?? targetLabel(event)"
          placeholder="event"
        />
      </template>
      <p v-if="component.events.length === 0" class="web-page-blueprint-inspector-empty">
        No events.
      </p>
    </BaseInspectorSection>

    <BaseInspectorSection title="Children" icon="list-tree">
      <BaseInspectorRow
        v-for="nodeId in component.nodeIds"
        :key="nodeId"
        label="Node"
        :value="nodeId"
      />
    </BaseInspectorSection>
  </div>
</template>

<script setup lang="ts">
import type {
  PageBlueprintComponent,
  PageBlueprintComponentNode,
  PageBlueprintComponentPort,
} from '../pageBlueprintSchema.ts'
import BaseInspectorRow from './BaseInspectorRow.vue'
import BaseInspectorSection from './BaseInspectorSection.vue'

const props = defineProps<{
  component: PageBlueprintComponent
  node: PageBlueprintComponentNode
}>()

defineEmits<{
  updateName: [componentId: string, name: string]
  updatePortLabel: [componentId: string, portId: string, label: string]
}>()

function componentFieldExpression(fieldId: string) {
  return props.node.fields.find((field) => field.id === fieldId)?.expression
}

function targetLabel(port: PageBlueprintComponentPort) {
  return `${port.target.nodeId}.${port.target.fieldId}`
}
</script>
