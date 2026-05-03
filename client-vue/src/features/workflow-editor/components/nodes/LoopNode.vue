<script setup lang="ts">
import { Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { LoopNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<LoopNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const collection = computed(() => (props.data as any)?.collectionPath || '—')
const maxIterations = computed(() => props.data?.maxIterations || 1000)
const stepTitle = computed(() => (props.data as any)?.name || 'Loop / ForEach')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    :title="stepTitle"
    subtitle="Iterate Array"
    icon="repeat"
    color="var(--nod8-node-loop-icon)"
    bg="var(--nod8-node-loop-bg)"
    border-color="var(--nod8-node-loop-border)"
  >
    <!-- O Loop não tem o "source" nativo do BaseNode, ele tem DOIS handles específicos -->
    <BaseHandle id="loop-body" type="source" :position="Position.Right" style="top: 35%" />
    <span class="loop-handle-label" style="top: 35%; right: -28px">Body</span>

    <BaseHandle id="loop-done" type="source" :position="Position.Right" style="top: 65%" />
    <span class="loop-handle-label" style="top: 65%; right: -28px">Done</span>
  </BaseNode>
</template>

<style scoped>
.loop-handle-label {
  position: absolute;
  font-size: 9px;
  color: var(--nod8-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
  font-family: var(--nod8-font-mono);
}
</style>
