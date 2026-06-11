<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { VectorStoreNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'

const props = defineProps<
  NodeProps<VectorStoreNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Vector Store')
const subtitle = computed(() => props.data?.collectionName || props.data?.pluginId || 'collection')
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :has-outgoing-connection="props.hasOutgoingConnection"
    has-target
    has-source
    :title="stepTitle"
    :subtitle="subtitle"
    icon="database-zap"
    color="#0891b2"
    bg="#ecfeff"
    border-color="#67e8f9"
  >
    <BaseHandle id="target" type="target" :position="Position.Left" />
    <div class="vector-store-config vector-store-config--embedding">
      <span>Embedding</span>
      <BaseHandle id="embedding" type="target" :position="Position.Bottom" variant="diamond" />
    </div>
    <div class="vector-store-config vector-store-config--document">
      <span>Document</span>
      <BaseHandle id="document" type="target" :position="Position.Bottom" variant="diamond" />
    </div>
    <BaseHandle id="source" type="source" :position="Position.Right" />
  </BaseNode>
</template>

<style scoped>
.vector-store-config {
  position: absolute;
  bottom: -28px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--sailor-text-muted);
}

.vector-store-config--embedding {
  left: 20px;
}

.vector-store-config--document {
  right: 20px;
}

.vector-store-config :deep(.sailor-base-handle) {
  position: relative;
  inset: auto !important;
}
</style>
