<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiToolNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'

const props = defineProps<
  NodeProps<AiToolNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Tool')
const pluginId = computed(() => props.data?.pluginId || 'plugin')
const methodId = computed(() => props.data?.methodId || 'method')
const sideEffect = computed(() => props.data?.sideEffect || 'read')
const requiresApproval = computed(() => props.data?.requiresApproval ?? false)
const subtitle = computed(() => `${pluginId.value} / ${methodId.value}`)
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="subtitle"
    icon="wrench"
    color="rgb(244, 63, 94)"
    bg="rgba(244, 63, 94, 0.12)"
    border-color="rgba(244, 63, 94, 0.45)"
  >
    <span class="ai-tool-node__badge" :class="{ 'requires-approval': requiresApproval }">
      {{ sideEffect }}
    </span>
  </BaseNode>
</template>

<style scoped>
.ai-tool-node__badge {
  position: absolute;
  bottom: 8px;
  left: 50%;
  max-width: 84px;
  padding: 2px 6px;
  color: var(--sailor-text-muted);
  font-size: 10px;
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  transform: translateX(-50%);
}

.ai-tool-node__badge.requires-approval {
  color: var(--sailor-amber-300, #fcd34d);
  border-color: rgba(245, 158, 11, 0.45);
}
</style>
