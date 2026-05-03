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
  />
</template>
