<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WorkflowNodeProps as NodeProps } from '../../workflow-canvas/workflowGraphTypes'
import type { AiMemoryNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import { CONFIGURATION_SOURCE_HANDLER } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<AiMemoryNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Memory')
const scope = computed(() => props.data?.scope || 'session')
const provider = computed(() => (props.data as any)?.provider || 'sqlite')
const isLongTermMemory = computed(() => props.data?.adapter === 'plugin-memory-store')
const subtitle = computed(() => isLongTermMemory.value ? `${scope.value} long-term memory` : 'short-term memory')
const pluginId = computed(() => (props.data as any)?.pluginId || provider.value)
const defaultMemoryIcon = computed(() => {
  if (pluginId.value === 'fabric-postgresql') return 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/postgresql.svg'
  if (pluginId.value === 'fabric-supabase') return 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/supabase.svg'
  return 'database'
})

const pluginIcon = ref(defaultMemoryIcon.value)
const customBg = ref<string | undefined>(undefined)
const customBorder = ref<string | undefined>(undefined)
const customIconColor = ref<string | undefined>(undefined)
const { isDark } = useTheme()

async function loadPluginAppearance() {
  pluginIcon.value = defaultMemoryIcon.value
  customBg.value = undefined
  customBorder.value = undefined
  customIconColor.value = undefined

  try {
    const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pluginId.value))
    const metadata = plugin?.manifest?.metadata
    if (!metadata) return

    customBg.value = metadata.style?.bgColor
    customBorder.value = metadata.style?.borderColor
    customIconColor.value = metadata.style?.iconColor
    pluginIcon.value = resolvePluginIcon(metadata, { isDark: isDark.value, fallback: 'database' })
  } catch (err) {
    pluginIcon.value = defaultMemoryIcon.value
    console.warn(`Failed to load memory plugin icon for ${pluginId.value}`, err)
  }
}

watch(() => pluginId.value, loadPluginAppearance, { immediate: true })
watch(() => isDark.value, loadPluginAppearance)
</script>

<template>
  <div class="agent-config-node agent-config-node--memory agent-config-node--round">
    <BaseNode
      :id="props.id"
      :selected="props.selected"
      :status="props.status"
      :title="stepTitle"
      :subtitle="subtitle"
      :icon="pluginIcon"
      :color="customIconColor || 'var(--fabric-node-plugin-icon)'"
      :bg="customBg || 'var(--fabric-node-plugin-bg)'"
      :border-color="customBorder || 'var(--fabric-node-plugin-border)'"
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

.agent-config-node :deep(.fabric-base-node__icon-box svg) {
  width: 34px;
  height: 34px;
}

.agent-config-node :deep(.fabric-base-handle) {
  pointer-events: all;
}
</style>
