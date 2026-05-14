<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { PluginNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'

const props = defineProps<
  NodeProps<PluginNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const pluginName = computed(() => props.data?.name || props.data?.action || 'Plugin Action')
const subtitle = computed(() => props.data?.pluginId || 'plugin_action')

const pluginIcon = ref<string>('box')
const customBg = ref<string | undefined>(undefined)
const customBorder = ref<string | undefined>(undefined)
const customIconColor = ref<string | undefined>(undefined)

onMounted(async () => {
  const pid = props.data?.pluginId
  if (pid) {
    try {
      const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pid))
      if (plugin?.manifest?.metadata) {
        const style = plugin.manifest.metadata.style
        if (style) {
          customBg.value = style.bgColor
          customBorder.value = style.borderColor
          customIconColor.value = style.iconColor
          pluginIcon.value = style.icon || plugin.manifest.metadata.icon || 'box'
        } else {
          pluginIcon.value = plugin.manifest.metadata.icon || 'box'
        }
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
    :color="customIconColor || 'var(--nod8-node-plugin-icon)'"
    :bg="customBg || 'var(--nod8-node-plugin-bg)'"
    :border-color="customBorder || 'var(--nod8-node-plugin-border)'"
  />
</template>
