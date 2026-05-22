<template>
  <BaseNode
    :id="id"
    class="plugin-creator-node"
    title="Method"
    :subtitle="String(data.handle ?? data.name ?? 'methodHandle')"
    icon="workflow"
    color="#8aa2ff"
    bg="rgba(99, 102, 241, 0.14)"
    border-color="rgba(129, 140, 248, 0.65)"
    has-target
    has-source
    :has-outgoing-connection="Boolean(data.hasOutgoingConnection)"
    :selected="selected"
    :status="data.status as any"
  >
    <template #label>
      <div class="plugin-creator-node__label">
        <strong>{{ data.name ?? 'Untitled Method' }}</strong>
        <span>{{ data.handle ?? data.name ?? 'methodHandle' }}</span>
      </div>
    </template>
  </BaseNode>
</template>

<script setup lang="ts">
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'

defineProps<{
  id: string
  data: Record<string, unknown>
  selected?: boolean
}>()
</script>

<style scoped src="./plugin-creator-node.css"></style>
