<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

const props = defineProps<{
  id?: string
  type: 'source' | 'target'
  position: Position
}>()
</script>

<template>
  <Handle 
    :id="props.id"
    :type="props.type"
    :position="props.position"
    class="nod8-base-handle"
    :class="`is-position-${props.position}`"
  />
</template>

<style scoped>
.nod8-base-handle {
  width: 8px;
  height: 25px;
  background-color: var(--nod8-handle-bg, #101012);
  border: 1px solid var(--nod8-handle-border, #262627);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: var(--nod8-radius-sm);
}

.nod8-base-handle:hover {
  background-color: var(--nod8-gray-600);
  border-color: var(--nod8-gray-400);
}

/* ─────────────────────────────────────────────────────────────
   EFEITO "FLYING" (Bolinha Flutuante Fora do Node)
   ─────────────────────────────────────────────────────────────
   Usa !important para realocar a raiz (left/right=0) que o VueFlow 
   injeta inline. Como a bolinha mantém o translate(-50%, -50%) inline 
   intocado, o "inchaço" por width/height no hover será milimetricamente 
   centralizado nesse novo Ponto Zero flutuante! 
*/
.nod8-base-handle.is-position-left {
  left: -10px !important;
}

.nod8-base-handle.is-position-right {
  right: -10px !important;
}
</style>
