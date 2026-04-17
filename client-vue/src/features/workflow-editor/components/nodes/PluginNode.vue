<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { PluginNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'

const props = defineProps<
  NodeProps<PluginNode> & { status?: 'idle' | 'running' | 'success' | 'failed' }
>()

const pluginName = computed(() => props.data?.name || props.data?.action || 'Plugin Action')
const subtitle = computed(() => props.data?.pluginId || 'plugin_action')

// Buscamos o plugin real do backend para usar o ícone original em URL do manifest
const pluginIcon = ref<string>('box')

onMounted(async () => {
  const pid = props.data?.pluginId
  if (pid) {
    try {
      const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pid))
      if (plugin?.manifest?.metadata?.icon) {
        pluginIcon.value = plugin.manifest.metadata.icon
      }
    } catch (err) {
      console.warn(`Failed to load plugin icon for ${pid}`, err)
    }
  }
})

// Computar os parâmetros restritos a 3 (design React)
const paramEntries = computed(() => {
  const params = props.data?.params || {}
  return Object.entries(params)
})

const visibleParams = computed(() => paramEntries.value.slice(0, 3))
const remainingParams = computed(() => Math.max(0, paramEntries.value.length - 3))
</script>

<template>
  <BaseNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    has-target
    has-source
    :title="pluginName"
    :subtitle="subtitle"
    :icon="pluginIcon"
    color="var(--nod8-node-plugin-icon)"
    bg="var(--nod8-node-plugin-bg)"
    badge-text="PLUGIN"
  >
    <div class="nod8-plugin-body">
      <div v-if="visibleParams.length > 0" class="nod8-plugin-params">
        <div v-for="[key, value] in visibleParams" :key="key" class="nod8-plugin-param-row">
          <span class="nod8-plugin-param-key" :title="key">{{ key }}:</span>
          <span class="nod8-plugin-param-val" :title="String(value)">{{ String(value) }}</span>
        </div>

        <span v-if="remainingParams > 0" class="nod8-plugin-param-more">
          +{{ remainingParams }} more
        </span>
      </div>
      <div v-else class="nod8-plugin-empty text-xs text-muted-foreground">
        No parameters configured
      </div>
    </div>
  </BaseNode>
</template>

<style scoped>
.nod8-plugin-body {
  padding: 0 var(--nod8-space-1);
  width: 100%;
}

.nod8-plugin-params {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nod8-plugin-param-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
}

.nod8-plugin-param-key {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

.nod8-plugin-param-val {
  font-family: var(--nod8-font-mono);
  background-color: rgba(255, 255, 255, 0.05); /* bg-muted/50 appx */
  padding: 2px 4px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.02);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nod8-plugin-param-more {
  font-size: 10px;
  color: var(--nod8-text-muted);
  font-style: italic;
  opacity: 0.6;
  margin-top: 2px;
}
</style>
