<template>
  <BaseNode :id="id" class="plugin-creator-node" icon="braces" color="#2dd4bf" bg="rgba(45, 212, 191, 0.13)" border-color="rgba(45, 212, 191, 0.55)" has-target has-source :has-outgoing-connection="Boolean(data.hasOutgoingConnection)" :selected="selected" :status="data.status as any">
    <template #label><div class="plugin-creator-node__label"><strong>{{ data.name ?? 'JSON Transform' }}</strong><span>{{ data.outputName ?? 'output' }}</span></div></template>
  </BaseNode>
</template>
<script setup lang="ts">
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'
defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()
</script>
<style scoped src="./plugin-creator-node.css"></style>
