<template>
  <BaseNode :id="id" class="plugin-creator-node" icon="list" color="#a3e635" bg="rgba(163, 230, 53, 0.13)" border-color="rgba(163, 230, 53, 0.55)" has-target has-source :has-outgoing-connection="Boolean(data.hasOutgoingConnection)" :selected="selected" :status="data.status as any">
    <template #label><div class="plugin-creator-node__label"><strong>{{ data.name ?? 'ForEach' }}</strong><span>{{ data.arrayExpression ?? 'array' }}</span></div></template>
  </BaseNode>
</template>
<script setup lang="ts">
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'
defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()
</script>
<style scoped src="./plugin-creator-node.css"></style>
