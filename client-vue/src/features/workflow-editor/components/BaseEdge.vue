<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useVueFlow } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<EdgeProps>()

const { removeEdges } = useVueFlow()

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

// Aplica as cores via Tokens Globais que herdamos do React
const computedStyle = computed(() => ({
  ...props.style,
  stroke: props.selected ? 'var(--nod8-rf-edge-stroke-selected)' : 'var(--nod8-rf-edge-stroke)',
  strokeWidth: 2,
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
    :marker-end="props.selected ? 'url(#nod8-arrow-selected)' : 'url(#nod8-arrow-normal)'"
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
