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
import { useEventBus } from '@/shared/composables/useEventBus'
import BaseButton from '@/shared/components/base/BaseButton.vue'

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
      color: 'var(--nod8-text-primary)',
      bg: 'var(--nod8-node-body)',
      borderColor: 'var(--nod8-node-border)',
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
    plugin: {
      icon: 'plug',
      title: 'Plugin Trigger',
      subtitle: null,
      color: 'rgb(99, 179, 237)',
      bg: 'rgba(99,179,237,0.12)',
      borderColor: 'rgba(99,179,237,0.4)',
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

const hasOutgoingConnection = computed(() => {
  if (!props.id) return false
  if (!store.activeWorkflow) return false
  return store.activeWorkflow.edges.some((e) => e.source === props.id)
})

const onQuickAdd = () => {
  if (!props.id) return
  useEventBus('node:quick-add').emit({ sourceId: props.id })
}
</script>

<template>
  <div
    class="trigger-node"
    :class="[
      { 'is-selected': props.selected },
      effectiveStatus !== 'idle' ? `is-${effectiveStatus}` : '',
    ]"
    :style="{ '--trigger-border': triggerConfig.borderColor, '--node-tint': triggerConfig.bg }"
  >
    <!-- Execute button floating left -->
    <BaseButton
      variant="primary"
      size="md"
      class="trigger-node__execute-btn"
      icon-left="play"
      @click.stop="onExecuteWorkflow"
    >
      Execute Workflow
    </BaseButton>

    <!-- Lightning bolt accent (top-left corner like n8n) -->
    <div class="trigger-node__lightning">
      <LucideIcon name="zap" :size="24" />
    </div>

    <!-- Icon -->
    <div class="trigger-node__icon" :style="{ color: triggerConfig.color }">
      <LucideIcon :name="triggerConfig.icon" :size="48" />
    </div>
  </div>

  <!-- Source handle -->
  <BaseHandle id="source" type="source" :position="Position.Right" />

  <!-- Quick Add Cable (n8n style) -->
  <div
    v-if="!hasOutgoingConnection && props.id"
    class="trigger-node__quick-add"
    title="Adicionar node conectado"
    @click.stop="onQuickAdd"
  >
    <div class="trigger-node__quick-add-cable"></div>
    <button class="trigger-node__quick-add-btn">
      <LucideIcon name="plus" :size="11" />
    </button>
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
  border-radius: 50px 16px 16px 50px;
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
  border-color: color-mix(
    in srgb,
    var(--trigger-border, #3c3c3c) 80%,
    var(--nod8-text-primary) 20%
  );
}

.trigger-node.is-selected {
  border-color: color-mix(
    in srgb,
    var(--trigger-border, #3c3c3c) 80%,
    var(--nod8-text-primary) 20%
  );
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.5),
    0 0 0 3px color-mix(in srgb, var(--trigger-border, #3c3c3c) 50%, transparent);
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
  top: 50%;
  left: -50px;
  transform: translateY(-50%);
  color: var(--nod8-text-primary);
  opacity: 0.9;
  display: flex;
  align-items: center;
  line-height: 1;
  transition: opacity 0.2s var(--nod8-ease-standard);
}

.trigger-node:hover .trigger-node__lightning {
  opacity: 0;
  pointer-events: none;
}

/* ─── Execute Button (Slide from left) ──────────────────────── */
.trigger-node__execute-btn {
  position: absolute;
  top: 50%;
  left: -5px;
  transform: translate(-20px, -50%);
  display: flex;
  align-items: center;

  /* Initial state: hidden and slightly to the right (behind the node) */
  opacity: 0;
  pointer-events: none;
  z-index: -1;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

/* Invisible bridge to prevent hover loss between the node and the button */
.trigger-node::before {
  content: '';
  position: absolute;
  top: 0;
  left: -30px;
  width: 30px;
  height: 100%;
}

.trigger-node:hover .trigger-node__execute-btn {
  opacity: 1;
  pointer-events: auto;
  /* Final state: fully visible, pushed out to the left */
  transform: translate(calc(-100% - 16px), -50%);
}

/* ─── Main icon ─────────────────────────────────────────────── */
.trigger-node__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
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

/* ─── Quick Add Node (n8n style) ─────────────────────────────── */
.trigger-node__quick-add {
  position: absolute;
  top: 50%;
  right: -82px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  z-index: 5;
}

.trigger-node__quick-add-cable {
  width: 60px;
  height: 2px;
  background-color: var(--nod8-node-handle);
  transition: background-color 0.2s;
}

.trigger-node__quick-add-btn {
  border-radius: var(--nod8-radius-sm);
  background-color: var(--nod8-node-border);
  border: 2px solid var(--nod8-border-strong);
  color: var(--nod8-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 19px;
  height: 19px;
  transition: all 0.2s;
}
</style>
