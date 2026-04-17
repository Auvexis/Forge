<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { SubWorkflowNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<SubWorkflowNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const workflowId = computed(() => props.data?.workflowId || 'not configured')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    title="Sub-Workflow"
    subtitle="Trigger external flow"
    icon="workflow"
    color="var(--nod8-node-subworkflow-icon)"
    bg="var(--nod8-node-subworkflow-bg)"
    badge-text="SUB-WORKFLOW"
  >
    <div class="nod8-subworkflow-body">
      <div class="nod8-subworkflow-label">Target:</div>
      <code class="nod8-subworkflow-target" :title="workflowId">{{ workflowId }}</code>
    </div>
  </BaseNode>
</template>

<style scoped>
.nod8-subworkflow-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 var(--nod8-space-1);
  width: 100%;
}

.nod8-subworkflow-label {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-weight: var(--nod8-font-medium);
}

.nod8-subworkflow-target {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  background-color: var(--nod8-node-subworkflow-tag-bg);
  color: var(--nod8-node-subworkflow-tag-text);
  padding: 2px 8px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-node-subworkflow-tag-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>
