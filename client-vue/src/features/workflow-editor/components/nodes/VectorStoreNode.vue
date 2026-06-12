<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { VectorStoreNode } from '@/core/types/workflow.types'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseAdvancedNode from '../BaseAdvancedNode.vue'
import { VECTOR_STORE_HANDLERS } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<VectorStoreNode> & {
    status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed'
    hasOutgoingConnection?: boolean
  }
>()

const stepTitle = computed(() => props.data?.name || 'Vector Store')
const subtitle = computed(() => props.data?.collectionName || 'collection')
const pluginId = computed(() => props.data?.pluginId || '')
const pluginIcon = ref('database-zap')
const customBg = ref<string | undefined>(undefined)
const customBorder = ref<string | undefined>(undefined)
const customIconColor = ref<string | undefined>(undefined)
const { isDark } = useTheme()

async function loadPluginAppearance() {
  pluginIcon.value = 'database-zap'
  customBg.value = undefined
  customBorder.value = undefined
  customIconColor.value = undefined
  if (!pluginId.value) return

  try {
    const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pluginId.value))
    const metadata = plugin?.manifest?.metadata
    if (!metadata) return

    pluginIcon.value = resolvePluginIcon(metadata, { isDark: isDark.value, fallback: 'database-zap' })
    customBg.value = metadata.style?.bgColor
    customBorder.value = metadata.style?.borderColor
    customIconColor.value = metadata.style?.iconColor
  } catch (err) {
    console.warn(`Failed to load vector store plugin icon for ${pluginId.value}`, err)
  }
}

watch(pluginId, loadPluginAppearance, { immediate: true })
watch(isDark, loadPluginAppearance)
</script>

<template>
  <BaseAdvancedNode
    :id="props.id"
    :selected="props.selected"
    :status="props.status"
    :has-outgoing-connection="props.hasOutgoingConnection"
    :title="stepTitle"
    :description="subtitle"
    :handlers="VECTOR_STORE_HANDLERS"
    auto-organize
    has-target
    has-source
    :bg="customBg || 'transparent'"
    :border-color="customBorder || 'var(--sailor-node-border)'"
  >
    <template #icon-left>
      <LucideIcon
        :name="pluginIcon"
        :size="30"
        :style="{ color: customIconColor || 'var(--sailor-node-plugin-icon)' }"
      />
    </template>
  </BaseAdvancedNode>
</template>
