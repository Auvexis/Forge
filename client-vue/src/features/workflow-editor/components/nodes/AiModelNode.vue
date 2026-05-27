<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { AiModelNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
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

onMounted(async () => {
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
})
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
      width="82px"
      height="82px"
    />
    <BaseHandle id="source" type="source" :position="Position.Top" variant="diamond" />
  </div>
</template>

<style scoped>
.agent-config-node {
  position: relative;
}

.agent-config-node--round :deep(.sailor-base-node) {
  border-radius: 9999px;
}

.agent-config-node :deep(.sailor-base-node__icon-box svg) {
  width: 34px;
  height: 34px;
}

.agent-config-node :deep(.sailor-base-handle) {
  pointer-events: all;
}
</style>
