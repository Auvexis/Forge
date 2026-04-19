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
    badge-text="LOOP"
  >
    <div class="nod8-loop-body">
      <div class="nod8-loop-collection-wrapper">
        <span class="nod8-loop-label">Collection:</span>
        <code class="nod8-loop-collection" :title="collection">{{ collection }}</code>
      </div>

      <span class="nod8-loop-iterations">
        Max: <strong>{{ maxIterations }}</strong> iterations
      </span>
    </div>

    <!-- O Loop não tem o "source" nativo do BaseNode, ele tem DOIS handles específicos -->
    <BaseHandle id="loop-body" type="source" :position="Position.Right" style="top: 35%" />
    <span class="loop-handle-label" style="top: 35%; right: -28px">Body</span>

    <BaseHandle id="loop-done" type="source" :position="Position.Right" style="top: 65%" />
    <span class="loop-handle-label" style="top: 65%; right: -28px">Done</span>
  </BaseNode>
</template>

<style scoped>
.nod8-loop-body {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
  padding: 0 var(--nod8-space-1);
}

.nod8-loop-collection-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nod8-loop-label {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-weight: var(--nod8-font-medium);
}

.nod8-loop-collection {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  background-color: var(--nod8-node-loop-tag-bg);
  color: var(--nod8-node-loop-tag-text);
  padding: 2px 8px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-node-loop-tag-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.nod8-loop-iterations {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  margin-top: 4px;
}
.nod8-loop-iterations strong {
  color: var(--nod8-text-primary);
  font-weight: var(--nod8-font-semibold);
}

/* Legendas flutuantes paras os handles duplos do Loop */
.loop-handle-label {
  position: absolute;
  font-size: 9px;
  color: var(--nod8-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
  font-family: var(--nod8-font-mono);
}
</style>
