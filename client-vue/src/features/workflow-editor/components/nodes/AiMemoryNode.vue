<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { AiMemoryNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'

const props = defineProps<
  NodeProps<AiMemoryNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Memory')
const scope = computed(() => props.data?.scope || 'session')
const provider = computed(() => (props.data as any)?.provider || 'sqlite')
const subtitle = computed(() => `${scope.value} memory`)
const pluginId = computed(() => (props.data as any)?.pluginId || provider.value)
const defaultMemoryIcon = computed(() => {
  if (pluginId.value === 'sailor-postgresql') return 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/postgresql.svg'
  if (pluginId.value === 'sailor-supabase') return 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/supabase.svg'
  return 'database'
})

const pluginIcon = ref(defaultMemoryIcon.value)
const customBg = ref<string | undefined>(undefined)
const customBorder = ref<string | undefined>(undefined)
const customIconColor = ref<string | undefined>(undefined)
const { isDark } = useTheme()

onMounted(async () => {
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
})
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
