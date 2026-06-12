<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiToolNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import { CONFIGURATION_SOURCE_HANDLER } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<AiToolNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Tool')
const pluginId = computed(() => props.data?.pluginId || 'plugin')
const methodId = computed(() => props.data?.methodId || 'method')
const subtitle = computed(() => `${pluginId.value} / ${methodId.value}`)

const pluginIcon = ref('box')
const customBg = ref<string | undefined>(undefined)
const customBorder = ref<string | undefined>(undefined)
const customIconColor = ref<string | undefined>(undefined)
const { isDark } = useTheme()

async function loadPluginAppearance(currentPluginId: string) {
  pluginIcon.value = 'box'
  customBg.value = undefined
  customBorder.value = undefined
  customIconColor.value = undefined

  if (!currentPluginId || currentPluginId === 'plugin') return

  try {
    const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(currentPluginId))
    const metadata = plugin?.manifest?.metadata
    if (!metadata) return

    customBg.value = metadata.style?.bgColor
    customBorder.value = metadata.style?.borderColor
    customIconColor.value = metadata.style?.iconColor
    pluginIcon.value = resolvePluginIcon(metadata, { isDark: isDark.value, fallback: 'box' })
  } catch (err) {
    console.warn(`Failed to load tool plugin icon for ${currentPluginId}`, err)
  }
}

watch(() => pluginId.value, loadPluginAppearance, { immediate: true })
watch(() => isDark.value, () => loadPluginAppearance(pluginId.value))
</script>

<template>
  <div class="agent-config-node agent-config-node--tool agent-config-node--round">
    <BaseNode
      :id="props.id"
      :selected="props.selected"
      :status="props.status"
      :title="stepTitle"
      :subtitle="subtitle"
      :icon="pluginIcon"
      :color="customIconColor || 'var(--sailor-node-plugin-icon)'"
      :bg="customBg || 'var(--sailor-node-plugin-bg)'"
      :border-color="customBorder || 'var(--sailor-node-plugin-border)'"
      :handlers="[CONFIGURATION_SOURCE_HANDLER]"
      rounded="full"
      width="100px"
      height="100px"
    />
  </div>
</template>

<style scoped>
.agent-config-node {
  position: relative;
}

.agent-config-node :deep(.sailor-base-node__icon-box svg) {
  width: 34px;
  height: 34px;
}

.agent-config-node :deep(.sailor-base-handle) {
  pointer-events: all;
}

</style>
