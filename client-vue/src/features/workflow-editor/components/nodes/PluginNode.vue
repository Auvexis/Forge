<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { PluginNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { computed, ref, watch } from 'vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'

const props = defineProps<
  NodeProps<PluginNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const pluginName = computed(() => props.data?.name || props.data?.action || 'Plugin Action')
const displayPluginId = ref<string | undefined>(undefined)
const subtitle = computed(() => displayPluginId.value || props.data?.pluginId || 'plugin_action')

const pluginIcon = ref<string>('box')
const customBg = ref<string | undefined>(undefined)
const customBorder = ref<string | undefined>(undefined)
const customIconColor = ref<string | undefined>(undefined)
const { isDark } = useTheme()

async function loadPluginAppearance() {
  const pid = props.data?.pluginId
  pluginIcon.value = 'box'
  customBg.value = undefined
  customBorder.value = undefined
  customIconColor.value = undefined
  displayPluginId.value = undefined

  if (pid) {
    try {
      const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pid))
      if (plugin?.manifest?.metadata) {
        displayPluginId.value = plugin.manifest.metadata.id || plugin.id || pid
        const style = plugin.manifest.metadata.style
        if (style) {
          customBg.value = style.bgColor
          customBorder.value = style.borderColor
          customIconColor.value = style.iconColor
        }
        pluginIcon.value = resolvePluginIcon(plugin.manifest.metadata, {
          isDark: isDark.value,
          fallback: 'box',
        })
      }
    } catch (err) {
      console.warn(`Failed to load plugin icon for ${pid}`, err)
    }
  }
}

watch(() => props.data?.pluginId, loadPluginAppearance, { immediate: true })
watch(() => isDark.value, loadPluginAppearance)

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
    :color="customIconColor || 'var(--sailor-node-plugin-icon)'"
    :bg="customBg || 'var(--sailor-node-plugin-bg)'"
    :border-color="customBorder || 'var(--sailor-node-plugin-border)'"
  />
</template>
