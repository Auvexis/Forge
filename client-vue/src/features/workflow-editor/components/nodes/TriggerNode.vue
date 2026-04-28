<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { TriggerNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { Position } from '@vue-flow/core'
import { useWorkflowStore } from '../../stores/workflow.store'

const props = defineProps<
  NodeProps<TriggerNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const store = useWorkflowStore()

// No Nod8, os detalhes reais do Trigger (webhook, cron, manual) moram globalmente no fluxo.
const triggerData = computed(() => store.activeWorkflow?.trigger)

// Mapa de configuração igual ao REACT para dinamicamente alterar as cores/ícones
const triggerConfig = computed(() => {
  const type = triggerData.value?.type || 'manual'

  const configMap = {
    manual: {
      icon: 'play',
      title: 'Manual Trigger',
      color: 'var(--nod8-node-trigger-icon)',
      bg: 'var(--nod8-node-trigger-bg)',
    },
    webhook: {
      icon: 'webhook',
      title: 'Webhook',
      color: 'var(--nod8-node-trigger-webhook-icon)',
      bg: 'var(--nod8-node-trigger-webhook-bg)',
    },
    cron: {
      icon: 'clock',
      title: 'Schedule / Cron',
      color: 'var(--nod8-node-trigger-cron-icon)',
      bg: 'var(--nod8-node-trigger-cron-bg)',
    },
    event: {
      icon: 'zap',
      title: 'Event Trigger',
      color: 'var(--nod8-node-trigger-event-icon)',
      bg: 'var(--nod8-node-trigger-event-bg)',
    },
  }

  return configMap[type as keyof typeof configMap] ?? configMap.manual
})
</script>

<template>
  <BaseNode :id="props.id" :selected="props.selected" :status="props.status" class="trigger-node" has-source>
    <template #header>
      <div
        class="trigger-icon"
        :style="{ color: triggerConfig.color, backgroundColor: triggerConfig.bg }"
      >
        <LucideIcon :name="triggerConfig.icon" :size="16" />
      </div>

      <div class="trigger-title-box">
        <span class="trigger-title">{{ triggerConfig.title }}</span>
        <span class="trigger-subtitle">Workflow Entry Point</span>
      </div>
    </template>

    <div class="trigger-body">
      <!-- Exibição Condicional Baseada no Tipo de Trigger -->
      <code
        v-if="triggerData?.type === 'webhook' && triggerData.webhookPath"
        class="trigger-code webhook-code"
      >
        /webhooks/{{ triggerData.webhookPath }}
      </code>

      <code
        v-else-if="triggerData?.type === 'cron' && triggerData.cronExpression"
        class="trigger-code cron-code"
      >
        {{ triggerData.cronExpression }}
      </code>

      <code
        v-else-if="triggerData?.type === 'event' && triggerData.eventName"
        class="trigger-code event-code"
      >
        {{ triggerData.eventName }}
      </code>

      <template
        v-else-if="
          triggerData?.type === 'manual' &&
          triggerData.schema &&
          Object.keys(triggerData.schema).length > 0
        "
      >
        <span class="trigger-subtitle input-title">Expected inputs:</span>
        <div class="schema-tags">
          <span v-for="key in Object.keys(triggerData.schema)" :key="key" class="schema-tag">
            {{ key }}
          </span>
        </div>
      </template>

      <span v-else class="trigger-subtitle italic">
        {{
          triggerData?.type === 'manual'
            ? 'Standard manual execution.'
            : `Waiting for ${triggerData?.type} signal...`
        }}
      </span>
    </div>

    <!-- O ponto de saída nativo do VueFlow: Obrigatoriamente com id="source" para o Edge achar! -->
    <BaseHandle id="source" type="source" :position="Position.Right" />
  </BaseNode>
</template>

<style scoped>
/* Recriando o rounded-l-sm rounded-r-[2rem] do React mas via CSS BEM */
.trigger-node {
  border-radius: var(--nod8-radius-sm) 2rem 2rem var(--nod8-radius-sm) !important;
}

/* Redefinição do header superior para acompanhar o arrendondamento assíncrono */
:deep(.nod8-base-node__header) {
  border-radius: calc(var(--nod8-radius-sm) - 1px) calc(2rem - 1px) 0 0 !important;
}

/* Estrutura visual idêntica à antiga */
.trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
}

.trigger-title-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.trigger-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-subtitle {
  font-size: 12px;
  color: var(--nod8-text-muted);
}

.trigger-body {
  display: flex;
  flex-direction: column;
}

.input-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.italic {
  font-style: italic;
  opacity: 0.7;
}

/* Badges e tags de schema iguais ao do React */
.schema-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.schema-tag {
  font-size: 11px;
  font-family: var(--nod8-font-mono);
  padding: 2px 6px;
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: 4px;
  color: var(--nod8-text-secondary);
}

/* Códigos exibidos baseados no tipo do gatilho */
.trigger-code {
  font-size: 12px;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.webhook-code {
  color: var(--nod8-success);
  opacity: 0.8;
}
.cron-code {
  color: var(--nod8-warning);
  opacity: 0.8;
}
.event-code {
  color: var(--nod8-color-5);
  opacity: 0.8;
}
</style>
