<template>
  <section class="installed-plugins">
    <header class="installed-plugins__header">
      <h2>Plugins</h2>
      <button class="icon-button" type="button" title="Atualizar" @click="$emit('refresh')">
        <RefreshCw :size="15" />
      </button>
    </header>

    <div class="installed-plugins__list">
      <article v-for="plugin in plugins" :key="plugin.id" class="installed-plugin">
        <div class="installed-plugin__icon">{{ plugin.manifest.metadata.icon || 'P' }}</div>
        <div class="installed-plugin__body">
          <strong>{{ plugin.manifest.metadata.name }}</strong>
          <span>{{ plugin.manifest.metadata.version }} · {{ plugin.manifest.metadata.author }}</span>
          <code>{{ plugin.id }}</code>
        </div>
      </article>

      <div v-if="plugins.length === 0" class="installed-plugins__empty">Nenhum plugin carregado</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import type { PluginSummary } from '@/core/types/plugin.types'

defineProps<{
  plugins: PluginSummary[]
}>()

defineEmits<{
  refresh: []
}>()
</script>

<style scoped>
.installed-plugins {
  min-width: 280px;
  border-right: 1px solid var(--nod8-border);
  background: var(--nod8-bg-surface);
}

.installed-plugins__header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--nod8-space-4);
  border-bottom: 1px solid var(--nod8-border);
}

.installed-plugins__header h2 {
  margin: 0;
  font-size: var(--nod8-text-base);
  font-weight: var(--nod8-font-semibold);
}

.icon-button {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
  background: var(--nod8-button-ghost-bg);
  color: var(--nod8-text-secondary);
}

.installed-plugins__list {
  display: grid;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-3);
}

.installed-plugin {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
  background: var(--nod8-bg-base);
}

.installed-plugin__icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
  font-size: var(--nod8-text-sm);
}

.installed-plugin__body {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.installed-plugin__body strong,
.installed-plugin__body span,
.installed-plugin__body code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.installed-plugin__body strong {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-medium);
}

.installed-plugin__body span,
.installed-plugin__body code,
.installed-plugins__empty {
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-xs);
}
</style>
