<template>
  <BaseNode :id="id" class="plugin-creator-node" icon="rotate-cw" color="#fb923c" bg="rgba(251, 146, 60, 0.13)" border-color="rgba(251, 146, 60, 0.55)" has-target has-source :has-outgoing-connection="Boolean(data.hasOutgoingConnection)" :selected="selected" :status="data.status as any">
    <template #label><div class="plugin-creator-node__label"><strong>{{ data.name ?? 'For' }}</strong><span>{{ data.itemVariable ?? 'item' }}</span></div></template>
  </BaseNode>
</template>
<script setup lang="ts">
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'
defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()
</script>
<style scoped src="./plugin-creator-node.css"></style>
