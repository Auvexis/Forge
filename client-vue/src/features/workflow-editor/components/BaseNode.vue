<script setup lang="ts">
import { computed } from 'vue'
import { Position } from '@vue-flow/core'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseHandle from './BaseHandle.vue'

const props = defineProps<{
  id?: string // O ID real do Node na malha

  // Customização Visual Opcional
  title?: string
  subtitle?: string
  icon?: string
  color?: string
  bg?: string
  badgeText?: string

  // Controle Rápido de Handles (Orelhas de conexão)
  hasTarget?: boolean
  hasSource?: boolean

  selected?: boolean
  status?: 'idle' | 'running' | 'success' | 'failed'
}>()

// Classes computadas baseadas no status de execução
const statusClasses = computed(() => {
  if (!props.status || props.status === 'idle') return ''
  return `is-${props.status}`
})
</script>

<template>
  <!-- O Card Pai (Envolve tudo) -->
  <div class="nod8-base-node" :class="[{ 'is-selected': selected }, statusClasses]">
    <!-- ID flutuante acima do nó reproduzindo o React -->
    <div v-if="props.id || $slots.badge" class="nod8-base-node__id-badge">
      <slot name="badge">
        {{ props.id }}
      </slot>
    </div>

    <!-- HEADER: Se passarmos o Title, ele monta o Header padronizado. Senão, libera o slot manual. -->
    <template v-if="props.title || $slots.header">
      <div class="nod8-base-node__header">
        <slot name="header">
          <!-- Box do Ícone -->
          <div
            v-if="props.icon"
            class="nod8-base-node__icon-box"
            :style="{ color: props.color, backgroundColor: props.bg }"
          >
            <LucideIcon :name="props.icon" :size="16" />
          </div>

          <!-- Textos: Título, Badge Menor, Status Dot e Subtítulo -->
          <div class="nod8-base-node__title-box">
            <div class="nod8-base-node__title-row">
              <span class="nod8-base-node__title" :title="props.title">{{ props.title }}</span>

              <!-- Badge Tag tipo "HTTP", "CODE" -->
              <span
                v-if="props.badgeText"
                class="nod8-base-node__tag"
                :style="{ color: props.color, backgroundColor: props.bg }"
              >
                {{ props.badgeText }}
              </span>

              <!-- Status Dot (Bolinha pulsante no rodando) -->
              <span
                v-if="props.status && props.status !== 'idle'"
                class="nod8-base-node__status-dot"
                :class="`is-${props.status}`"
              ></span>
            </div>

            <span v-if="props.subtitle" class="nod8-base-node__subtitle">{{ props.subtitle }}</span>
          </div>
        </slot>
      </div>
    </template>

    <!-- CONTEÚDO (BODY) -->
    <div class="nod8-base-node__content">
      <slot></slot>
    </div>

    <!-- HANDLES AUTOMÁTICOS -->
    <BaseHandle v-if="props.hasTarget" id="target" type="target" :position="Position.Left" />
    <BaseHandle v-if="props.hasSource" id="source" type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.nod8-base-node {
  position: relative;
  min-width: 240px;
  max-width: 340px;
  background-color: var(--nod8-node-body);
  border: 1px solid var(--nod8-node-border);
  transition: all 0.15s ease;
  overflow: visible; /* Vital para o badge e para os Handles vazarem */

  border-radius: var(--nod8-radius-md);
  display: flex;
  flex-direction: column;
}

/* ─────────────────────────────────────────────────────────────
   ESTADOS (SELEÇÃO E EXECUÇÃO)
   ───────────────────────────────────────────────────────────── */

.nod8-base-node.is-selected {
  border-color: var(--nod8-node-selected);
}

.nod8-base-node.is-running {
  border-color: var(--nod8-warning);
}
.nod8-base-node.is-success {
  border-color: var(--nod8-success);
}
.nod8-base-node.is-failed {
  border-color: var(--nod8-error);
}

/* ─────────────────────────────────────────────────────────────
   ID BADGE FLUTUANTE
   ───────────────────────────────────────────────────────────── */
.nod8-base-node__id-badge {
  position: absolute;
  top: -21.5px;
  left: 12px;
  background-color: var(--nod8-node-header);
  border: 1px solid var(--nod8-border);
  border-bottom: none !important;
  border-radius: 4px 4px 0 0;
  padding: 2px 6px;
  font-family: var(--nod8-font-mono);
  font-size: 11px;
  color: var(--nod8-text-muted);
  z-index: 10;
  cursor: text;
  transition: color 0.15s;
}

.nod8-base-node__id-badge:hover {
  color: var(--nod8-text-primary);
}

/* ─────────────────────────────────────────────────────────────
   HEADER UNIFICADO (TÍtulo, Ícone)
   ───────────────────────────────────────────────────────────── */
.nod8-base-node__header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3);
  background-color: var(--nod8-node-header);
  border-bottom: 1px solid var(--nod8-border);
  border-radius: calc(var(--nod8-radius-md) - 1px) calc(var(--nod8-radius-md) - 1px) 0 0;
}

.nod8-base-node__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.nod8-base-node__title-box {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.nod8-base-node__title-row {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
}

.nod8-base-node__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nod8-base-node__tag {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.nod8-base-node__subtitle {
  font-size: 12px;
  color: var(--nod8-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─────────────────────────────────────────────────────────────
   STATUS DOT (Bolinha de acompanhamento)
   ───────────────────────────────────────────────────────────── */
.nod8-base-node__status-dot {
  display: block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.nod8-base-node__status-dot.is-running {
  background-color: var(--nod8-warning);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.nod8-base-node__status-dot.is-success {
  background-color: var(--nod8-success);
}
.nod8-base-node__status-dot.is-failed {
  background-color: var(--nod8-error);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ─────────────────────────────────────────────────────────────
   CONTEÚDO E RODAPÉ
   ───────────────────────────────────────────────────────────── */
.nod8-base-node__content {
  display: flex;
  flex-direction: column;
  padding: var(--nod8-space-3);
  gap: var(--nod8-space-2);
}
</style>
