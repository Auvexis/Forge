<template>
  <div class="node-editor">
    <div v-if="node" class="node-editor__content">
      <div class="node-editor__info surface-elevated-pressed">
        <LucideIcon :name="iconName" :size="24" :color="nodeColor" class="mb-2" />
        <h4 class="node-title">
          {{ node.data?.name || node.data?.action || node.type?.toUpperCase() }}
        </h4>
        <div class="node-id-badge">{{ node.id }}</div>
      </div>

      <div class="node-editor__form">
        <p class="text-sm text-muted-foreground mt-4">
          Configurações para o node do tipo <strong class="text-primary">{{ node.type }}</strong> em
          breve.
        </p>

        <!-- Placeholder Form -->
        <div class="field-dev mt-4">
          <label>Node ID</label>
          <input type="text" disabled :value="node.id" class="input-dev" />
        </div>
      </div>
    </div>

    <div v-else class="node-editor__empty">
      <p>Nenhum Node selecionado</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { GraphNode } from '@vue-flow/core'
import type { WorkflowNodeType } from '@/core/types/workflow.types'
import { NODE_TYPE_META } from '@/core/constants/node-types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  node: GraphNode<any> | undefined
}>()

// Descobrir qual cor e icone mostrar com base no BaseNode token
const nodeColor = computed(() => {
  if (!props.node?.type) return 'var(--nod8-text-primary)'
  const typeStr = props.node.type as WorkflowNodeType
  return NODE_TYPE_META[typeStr]?.color || 'var(--nod8-text-primary)'
})

const iconName = computed(() => {
  if (props.node?.type === 'http') return 'globe'
  if (props.node?.type === 'plugin') return 'box'
  if (props.node?.type === 'code') return 'code-2'
  if (props.node?.type === 'if') return 'git-branch'
  if (props.node?.type === 'loop') return 'repeat'
  return 'settings'
})
</script>

<style scoped>
.node-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.node-editor__info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--nod8-space-6);
  border-radius: var(--nod8-radius-lg);
  background-color: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  text-align: center;
}

.node-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--nod8-text-primary);
}

.node-id-badge {
  margin-top: 4px;
  font-family: var(--nod8-font-mono);
  font-size: 11px;
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--nod8-text-secondary);
}

.field-dev {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-dev label {
  font-size: 12px;
  font-weight: 500;
  color: var(--nod8-text-secondary);
}

.input-dev {
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  padding: 8px 12px;
  color: var(--nod8-text-primary);
  font-size: 14px;
  width: 100%;
  font-family: var(--nod8-font-mono);
}

.input-dev:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.node-editor__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--nod8-text-muted);
}
</style>
