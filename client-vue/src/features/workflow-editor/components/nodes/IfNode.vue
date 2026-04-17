<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { IfNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<NodeProps<IfNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }>()

const condition = computed(() => props.data?.condition || '—')

</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    title="Conditional"
    subtitle="If / Else pathing"
    icon="git-branch"
    color="var(--nod8-node-if-icon)"
    bg="var(--nod8-node-if-bg)"
    badge-text="CONDITIONAL"
  >
    <div class="nod8-if-body">
      <div class="nod8-if-label">Condition:</div>
      <code class="nod8-if-condition" :title="condition">{{ condition }}</code>
    </div>
  </BaseNode>
</template>

<style scoped>
.nod8-if-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 var(--nod8-space-1);
  width: 100%;
}

.nod8-if-label {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-weight: var(--nod8-font-medium);
}

.nod8-if-condition {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  background-color: var(--nod8-node-if-tag-bg);
  color: var(--nod8-node-if-tag-text);
  padding: 2px 8px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-node-if-tag-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>
