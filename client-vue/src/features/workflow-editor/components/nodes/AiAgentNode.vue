<script setup lang="ts">
import { computed } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { AiAgentNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import QuickAddButton from '../QuickAddButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<
  NodeProps<AiAgentNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'AI Agent')
</script>

<template>
  <div class="ai-agent-node">
    <BaseNode
      :id="props.id"
      :selected="props.selected"
      :status="props.status"
      has-target
      has-source
      :has-outgoing-connection="props.hasOutgoingConnection"
      color="var(--sailor-text-muted)"
      bg="transparent"
      border-color="var(--sailor-node-border)"
      width="236px"
      height="100px"
    >
      <template #icon>
        <div class="ai-agent-node__card-content">
          <div class="ai-agent-node__icon">
            <LucideIcon name="bot" :size="36" />
          </div>
          <div class="ai-agent-node__copy">
            <span class="ai-agent-node__title" :title="stepTitle">{{ stepTitle }}</span>
            <span class="ai-agent-node__subtitle">Tools Agent</span>
          </div>
        </div>
      </template>

      <div class="ai-agent-node__config-handles" aria-label="Agent configuration handles">
        <div class="ai-agent-node__config-handle">
          <BaseHandle id="chatModel" type="target" :position="Position.Bottom" variant="diamond" />
          <span>Chat Model*</span>
          <QuickAddButton
            :node-id="props.id"
            handle-id="chatModel"
            target-handle-id="chatModel"
            mode="agent-config"
            direction="down"
          />
        </div>
        <div class="ai-agent-node__config-handle">
          <BaseHandle id="memory" type="target" :position="Position.Bottom" variant="diamond" />
          <span>Memory</span>
          <QuickAddButton
            :node-id="props.id"
            handle-id="memory"
            target-handle-id="memory"
            mode="agent-config"
            direction="down"
          />
        </div>
        <div class="ai-agent-node__config-handle">
          <BaseHandle id="tool" type="target" :position="Position.Bottom" variant="diamond" />
          <span>Tool</span>
          <QuickAddButton
            :node-id="props.id"
            handle-id="tool"
            target-handle-id="tool"
            mode="agent-config"
            direction="down"
            always-visible
          />
        </div>
      </div>
    </BaseNode>
  </div>
</template>

<style scoped>
.ai-agent-node {
  position: relative;
}

.ai-agent-node :deep(.sailor-base-node) {
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
}

.ai-agent-node__card-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  width: 100%;
  padding: 0 28px;
  box-sizing: border-box;
}

.ai-agent-node__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(--sailor-text-muted);
  flex-shrink: 0;
}

.ai-agent-node__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.ai-agent-node__title {
  max-width: 128px;
  color: var(--sailor-text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-agent-node__subtitle {
  color: var(--sailor-text-muted);
  font-size: 11px;
  line-height: 1.2;
}

.ai-agent-node__config-handles {
  position: absolute;
  bottom: -86px;
  left: 50%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: start;
  justify-items: center;
  width: 236px;
  height: 86px;
  --qab-size: 19px;
  --qab-cable-length: 48px;
  pointer-events: all;
  transform: translateX(-50%);
}

.ai-agent-node__config-handle {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  color: var(--sailor-text-muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  width: 58px;
  text-align: center;
  white-space: normal;
}

.ai-agent-node__config-handle > span {
  position: absolute;
  top: 19px;
  left: 50%;
  z-index: 5100;
  width: 72px;
  pointer-events: none;
  transform: translateX(-50%);
}

.ai-agent-node__config-handle :deep(.sailor-base-handle) {
  position: relative !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  margin: 0 auto;
  pointer-events: all;
}

.ai-agent-node__config-handle :deep(.qab-wrap--down) {
  margin-top: 0;
}
</style>
