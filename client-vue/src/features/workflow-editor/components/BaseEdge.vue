<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useVueFlow } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useExecutionStore } from '../stores/execution.store'

const props = defineProps<EdgeProps>()

const { removeEdges } = useVueFlow()
const executionStore = useExecutionStore()

// Calcula o formato "SmoothStep" nativo que usamos e extrae a posição central (X, Y)
const pathData = computed(() =>
  getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }),
)

const edgeStatus = computed(() => {
  let sStatus: string

  if (props.source === 'trigger') {
    // Use the real trigger node status if available.
    // Only fall back to 'success' when the workflow has actually finished.
    const triggerNodeStatus = executionStore.nodeStatuses['trigger']?.status
    if (triggerNodeStatus && triggerNodeStatus !== 'idle') {
      sStatus = triggerNodeStatus
    } else if (executionStore.workflowStatus === 'SUCCESS') {
      sStatus = 'success'
    } else {
      sStatus = 'idle'
    }
  } else {
    sStatus = executionStore.nodeStatuses[props.source]?.status || 'idle'
  }

  const tNodeState = executionStore.nodeStatuses[props.target]
  const tStatus = tNodeState?.status || 'idle'

  // Se o source não começou, a linha tá morta
  if (sStatus === 'idle') return 'idle'

  // Verifica roteamento condicional para Switch e If
  // Assim garantimos que o caminho ignorado fique cinza
  if (sStatus === 'success') {
    const sOutput = executionStore.nodeStatuses[props.source]?.output as any
    if (sOutput && typeof sOutput === 'object') {
      if ('branch' in sOutput) {
        const actualHandle = props.sourceHandleId || 'then'
        if (sOutput.branch !== actualHandle) return 'idle'
      } else if ('activeHandle' in sOutput) {
        if (sOutput.activeHandle !== props.sourceHandleId) return 'idle'
      }
    }
  }

  // A partir daqui sabemos que a linha FOI/ESTÁ sendo atravessada
  // A cor dela reflete o estado do Node de DESTINO
  if (tStatus !== 'idle') {
    return tStatus
  }

  // Se o destino ainda não rodou mas a origem já foi, a energia tá parada na linha aguardando (ex: Merge Node)
  if (sStatus === 'success') {
    return 'success'
  }

  return 'idle'
})

const strokeColor = computed(() => {
  if (props.selected) return 'var(--nod8-rf-edge-stroke-selected)'
  
  switch (edgeStatus.value) {
    case 'success': return 'var(--nod8-green-500, #22c55e)'
    case 'failed': return 'var(--nod8-red-500, #ef4444)'
    case 'running': return 'var(--nod8-amber-500, #f59e0b)'
    default: return 'var(--nod8-rf-edge-stroke)'
  }
})

// Aplica as cores via Tokens Globais que herdamos do React
const computedStyle = computed(() => ({
  ...props.style,
  stroke: strokeColor.value,
  strokeWidth: edgeStatus.value !== 'idle' ? 3 : 2,
  transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
}))

// Ação de Lixeira
const onDelete = () => {
  removeEdges(props.id) // Quebra a conexão pelo ID
}
</script>

<template>
  <!-- O Caminho do Fio -->
  <BaseEdge
    :id="id"
    :style="computedStyle"
    :path="pathData[0]"
    :marker-end="props.selected ? 'url(#nod8-arrow-selected)' : `url(#nod8-arrow-${edgeStatus})`"
  />

  <!-- A Toolbar Flutuante HtmlRender (Só aparece se o Fio estiver Selecionado) -->
  <EdgeLabelRenderer v-if="selected">
    <div
      class="nodrag nopan nod8-edge-toolbar flex-center gap-2"
      :style="{
        pointerEvents: 'all' /* Vital para o botão ser clicável sobre o SVG */,
        position: 'absolute',
        transform: `translate(-50%, 50%) translate(${pathData[1]}px,${pathData[2]}px)`,
      }"
    >
      <button class="nod8-edge-btn" @click.stop="onDelete" title="Deletar Conexão">
        <LucideIcon name="trash" :size="14" />
      </button>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.nod8-edge-toolbar {
  z-index: 2000; /* Garante que fica por cima dos wires e nodes vizinhos */
}

.nod8-edge-btn {
  background-color: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border); /* Vermelho translúcido */
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-muted);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nod8-edge-btn:hover {
  background-color: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
}
</style>
