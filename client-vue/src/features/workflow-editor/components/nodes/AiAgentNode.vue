<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { AiAgentNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'

const props = defineProps<
  NodeProps<AiAgentNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Agent')
const providerCount = computed(() => props.data?.providerCount ?? 0)
const memoryCount = computed(() => props.data?.memoryCount ?? 0)
const toolCount = computed(() => props.data?.toolCount ?? 0)
const missingRequiredModel = computed(() => providerCount.value === 0)
const subtitle = computed(() => {
  return `${providerCount.value} models | ${memoryCount.value} memories | ${toolCount.value} tools`
})
</script>

<template>
  <div
    class="ai-agent-node"
    :class="{ 'ai-agent-node--missing-model': missingRequiredModel }"
  >
    <BaseNode
      :id="props.id"
      :selected="props.selected"
      :status="props.status"
      has-target
      has-source
      icon="bot"
      color="rgb(14, 165, 233)"
      bg="rgba(14, 165, 233, 0.12)"
      border-color="rgba(14, 165, 233, 0.45)"
    >
      <span v-if="missingRequiredModel" class="ai-agent-node__warning">Model required</span>
      <div class="ai-agent-node__config-handles" aria-label="Agent configuration handles">
        <div class="ai-agent-node__config-handle" style="left: 16%">
          <BaseHandle id="chatModel" type="target" :position="Position.Bottom" />
          <span>Chat Model*</span>
        </div>
        <div class="ai-agent-node__config-handle" style="left: 50%">
          <BaseHandle id="memory" type="target" :position="Position.Bottom" />
          <span>Memory</span>
        </div>
        <div class="ai-agent-node__config-handle" style="left: 84%">
          <BaseHandle id="tool" type="target" :position="Position.Bottom" />
          <span>Tool</span>
        </div>
      </div>
      <template #label>
        <div class="ai-agent-node__label">
          <span class="ai-agent-node__label-title" :title="stepTitle">{{ stepTitle }}</span>
          <span class="ai-agent-node__label-subtitle">{{ subtitle }}</span>
        </div>
      </template>
    </BaseNode>
  </div>
</template>

<style scoped>
.ai-agent-node {
  position: relative;
}

.ai-agent-node--missing-model :deep(.sailor-base-node) {
  border-color: var(--sailor-amber-400, #f59e0b);
}

.ai-agent-node__warning {
  position: absolute;
  top: 8px;
  left: 50%;
  max-width: 88px;
  padding: 2px 6px;
  color: var(--sailor-amber-300, #fcd34d);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 6px;
  transform: translateX(-50%);
}

.ai-agent-node__config-handles {
  position: absolute;
  bottom: -28px;
  left: 50%;
  width: 180px;
  height: 28px;
  pointer-events: none;
  transform: translateX(-50%);
}

.ai-agent-node__config-handle {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--sailor-text-muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  width: 58px;
  text-align: center;
  white-space: normal;
  transform: translateX(-50%);
}

.ai-agent-node__config-handle :deep(.sailor-base-handle) {
  position: relative !important;
  pointer-events: all;
}

.ai-agent-node__label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-top: 42px;
}

.ai-agent-node__label-title {
  max-width: 140px;
  color: var(--sailor-text-primary);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}

.ai-agent-node__label-subtitle {
  max-width: 140px;
  color: var(--sailor-text-muted);
  font-size: 11px;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
