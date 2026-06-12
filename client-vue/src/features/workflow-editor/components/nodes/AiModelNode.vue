<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiModelNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'

const props = defineProps<
  NodeProps<AiModelNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Model')
const model = computed(() => props.data?.model || 'model')
const pluginId = computed(() => props.data?.pluginId || '')
const subtitle = computed(() => `${pluginId.value || 'Plugin'} / ${model.value}`)
const defaultPluginIcon = 'box'

const pluginIcon = ref(defaultPluginIcon)
const customBg = ref<string | undefined>(undefined)
const customBorder = ref<string | undefined>(undefined)
const customIconColor = ref<string | undefined>(undefined)
const { isDark } = useTheme()

async function loadPluginAppearance() {
  pluginIcon.value = defaultPluginIcon
  customBg.value = undefined
  customBorder.value = undefined
  customIconColor.value = undefined
  if (!pluginId.value) return

  try {
    const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pluginId.value))
    const metadata = plugin?.manifest?.metadata
    if (!metadata) return

    customBg.value = metadata.style?.bgColor
    customBorder.value = metadata.style?.borderColor
    customIconColor.value = metadata.style?.iconColor
    pluginIcon.value = resolvePluginIcon(metadata, { isDark: isDark.value, fallback: 'box' })
  } catch (err) {
    pluginIcon.value = defaultPluginIcon
    console.warn(`Failed to load model plugin icon for ${pluginId.value}`, err)
  }
}

watch(() => pluginId.value, loadPluginAppearance, { immediate: true })
watch(() => isDark.value, loadPluginAppearance)
</script>

<template>
  <div class="agent-config-node agent-config-node--model agent-config-node--round">
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
      has-source
      output-position="top"
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
