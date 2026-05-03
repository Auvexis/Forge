<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { TriggerNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { Position } from '@vue-flow/core'
import { useWorkflowStore } from '../../stores/workflow.store'
import { useExecutionStore } from '../../stores/execution.store'

const props = defineProps<
  NodeProps<TriggerNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const store = useWorkflowStore()
const executionStore = useExecutionStore()

const triggerData = computed(() => store.activeWorkflow?.trigger)

const triggerConfig = computed(() => {
  const type = triggerData.value?.type || 'manual'

  const configMap = {
    manual: {
      icon: 'mouse-pointer-2',
      title: 'Manual Trigger',
      subtitle: null,
      color: '#ffffff',
      bg: 'rgba(255,255,255,0.07)',
      borderColor: '#3c3c3c',
    },
    webhook: {
      icon: 'webhook',
      title: 'Webhook',
      subtitle: null,
      color: 'rgb(16, 185, 129)',
      bg: 'rgba(16,185,129,0.12)',
      borderColor: 'rgba(16,185,129,0.4)',
    },
    cron: {
      icon: 'clock',
      title: 'Schedule',
      subtitle: null,
      color: 'rgb(138, 82, 255)',
      bg: 'rgba(138,82,255,0.12)',
      borderColor: 'rgba(138,82,255,0.4)',
    },
    event: {
      icon: 'zap',
      title: 'Event Trigger',
      subtitle: null,
      color: 'rgb(245, 158, 11)',
      bg: 'rgba(245,158,11,0.12)',
      borderColor: 'rgba(245,158,11,0.4)',
    },
  }

  return configMap[type as keyof typeof configMap] ?? configMap.manual
})

const nodeTitle = computed(() => {
  const type = triggerData.value?.type || 'manual'
  if (type === 'webhook' && triggerData.value?.webhookPath) {
    return `/${triggerData.value.webhookPath}`
  }
  if (type === 'cron' && triggerData.value?.cronExpression) {
    return triggerData.value.cronExpression
  }
  if (type === 'event' && triggerData.value?.eventName) {
    return triggerData.value.eventName
  }
  return triggerConfig.value.title
})

const effectiveStatus = computed<'idle' | 'running' | 'success' | 'failed'>(() => {
  const storeStatus = executionStore.nodeStatuses['trigger']?.status
  if (storeStatus && storeStatus !== 'idle') return storeStatus
  return props.status ?? 'idle'
})

const onExecuteWorkflow = async () => {
  if (store.activeWorkflow?.metadata.id) {
    await executionStore.execute(store.activeWorkflow.metadata.id)
  }
}
</script>

<template>
  <div
    class="trigger-node"
    :class="[{ 'is-selected': props.selected }, effectiveStatus !== 'idle' ? `is-${effectiveStatus}` : '']"
    :style="{ '--trigger-border': triggerConfig.borderColor, '--node-tint': triggerConfig.bg }"
  >
    <!-- Execute button floating left -->
    <button class="trigger-node__execute-btn" @click.stop="onExecuteWorkflow">
      <LucideIcon name="play" :size="14" />
      <span>Execute Workflow</span>
    </button>

    <!-- Lightning bolt accent (top-left corner like n8n) -->
    <div class="trigger-node__lightning">
      <LucideIcon name="zap" :size="12" />
    </div>

    <!-- Icon -->
    <div
      class="trigger-node__icon"
      :style="{ color: triggerConfig.color }"
    >
      <LucideIcon :name="triggerConfig.icon" :size="48" />
    </div>

    <!-- Status badge -->
    <div
      v-if="effectiveStatus === 'success'"
      class="trigger-node__status trigger-node__status--success"
    >
      <LucideIcon name="check" :size="10" />
    </div>
    <div
      v-else-if="effectiveStatus === 'failed'"
      class="trigger-node__status trigger-node__status--error"
    >
      <LucideIcon name="x" :size="10" />
    </div>
    <div
      v-else-if="effectiveStatus === 'running'"
      class="trigger-node__status trigger-node__status--running"
    >
      <LucideIcon name="loader-2" :size="10" class="spin" />
    </div>

    <!-- Source handle -->
    <BaseHandle id="source" type="source" :position="Position.Right" />
  </div>

  <!-- Label outside -->
  <div class="trigger-node__label-area">
    <span class="trigger-node__label-title">{{ nodeTitle }}</span>
    <span v-if="triggerData?.type === 'webhook'" class="trigger-node__label-subtitle">
      /webhooks{{ triggerData.webhookPath ? `/${triggerData.webhookPath}` : '' }}
    </span>
    <span v-else-if="triggerData?.type === 'cron'" class="trigger-node__label-subtitle">
      {{ triggerData.cronExpression }}
    </span>
  </div>
</template>

<style scoped>
/* ─── Trigger card — same square shape as n8n, special border accent ── */
.trigger-node {
  position: relative;
  width: 100px;
  height: 100px;
  background-color: var(--nod8-node-body);
  background-image: linear-gradient(var(--node-tint, transparent), var(--node-tint, transparent));
  border: 2px solid var(--trigger-border, #3c3c3c);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
  overflow: visible;
}

.trigger-node:hover {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  border-color: color-mix(in srgb, var(--trigger-border, #3c3c3c) 150%, white 30%);
}

.trigger-node.is-selected {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--nod8-green-400) 25%, transparent);
  border-color: var(--nod8-green-400);
}

.trigger-node.is-running {
  border-color: var(--nod8-amber-400);
}

.trigger-node.is-success {
  border-color: var(--nod8-green-400);
}

.trigger-node.is-failed {
  border-color: var(--nod8-red-400);
}

/* ─── Lightning bolt accent ─────────────────────────────────── */
.trigger-node__lightning {
  position: absolute;
  top: 6px;
  left: 8px;
  color: var(--nod8-red-400);
  opacity: 0.9;
  display: flex;
  align-items: center;
  line-height: 1;
}

/* ─── Execute Button (Slide from left) ──────────────────────── */
.trigger-node__execute-btn {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(-20px, -50%);
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--nod8-accent);
  color: #fff;
  border: none;
  border-radius: var(--nod8-radius-full);
  padding: 6px 12px 6px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nod8-shadow-md);
  
  /* Initial state: hidden and slightly to the right (behind the node) */
  opacity: 0;
  pointer-events: none;
  z-index: -1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.trigger-node:hover .trigger-node__execute-btn {
  opacity: 1;
  pointer-events: auto;
  /* Final state: fully visible, pushed out to the left */
  transform: translate(calc(-100% - 16px), -50%);
}

.trigger-node__execute-btn:hover {
  background-color: var(--nod8-brand-600);
}

/* ─── Main icon ─────────────────────────────────────────────── */
.trigger-node__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* ─── Status badge ──────────────────────────────────────────── */
.trigger-node__status {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--nod8-node-body);
}

.trigger-node__status--success {
  background-color: var(--nod8-green-400);
  color: #000;
}

.trigger-node__status--error {
  background-color: var(--nod8-red-400);
  color: #fff;
}

.trigger-node__status--running {
  background-color: var(--nod8-amber-400);
  color: #000;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── Label (outside the card) ──────────────────────────────── */
.trigger-node__label-area {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
}

.trigger-node__label-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--nod8-text-primary);
  line-height: 1.3;
  word-break: break-word;
  white-space: normal;
  text-align: center;
  max-width: 140px;
}

.trigger-node__label-subtitle {
  font-size: 11px;
  color: var(--nod8-text-muted);
  text-align: center;
  margin-top: 2px;
}
</style>
