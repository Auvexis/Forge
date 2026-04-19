<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { HttpNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed } from 'vue'

const props = defineProps<
  NodeProps<HttpNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const method = computed(() => props.data?.method || 'GET')
const url = computed(() => props.data?.url || 'https://...')
const stepTitle = computed(() => (props.data as any)?.name || 'HTTP Request')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="`${method} request`"
    icon="globe"
    color="var(--nod8-node-http-icon)"
    bg="var(--nod8-node-http-bg)"
    badge-text="HTTP"
  >
    <!-- Substitui o body com a arte visual da URL replicando o React -->
    <div class="nod8-http-body">
      <span class="nod8-http-method">{{ method }}</span>
      <code class="nod8-http-url" :title="url">{{ url }}</code>
    </div>
  </BaseNode>
</template>

<style scoped>
.nod8-http-body {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: 0 var(--nod8-space-1);
  width: 100%;
}

.nod8-http-method {
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-semibold);
  padding: 2px 6px;
  background-color: var(--nod8-node-http-tag-bg);
  color: var(--nod8-node-http-tag-text);
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-node-http-tag-border);
  flex-shrink: 0;
}

.nod8-http-url {
  font-size: var(--nod8-text-xs);
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 15ch; /* Previne que o card fique largo demais */
}
</style>
