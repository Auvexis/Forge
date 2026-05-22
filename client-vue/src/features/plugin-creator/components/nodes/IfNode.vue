<template>
  <BaseNode :id="id" class="plugin-creator-node" icon="git-branch" color="#facc15" bg="rgba(250, 204, 21, 0.13)" border-color="rgba(250, 204, 21, 0.55)" has-target has-source :has-outgoing-connection="Boolean(data.hasOutgoingConnection)" :selected="selected" :status="data.status as any">
    <template #label><div class="plugin-creator-node__label"><strong>{{ data.name ?? 'If' }}</strong><span>{{ data.condition ?? 'condition' }}</span></div></template>
  </BaseNode>
</template>
<script setup lang="ts">
import BaseNode from '../../../workflow-editor/components/BaseNode.vue'
defineProps<{ id: string; data: Record<string, unknown>; selected?: boolean }>()
</script>
<style scoped src="./plugin-creator-node.css"></style>
