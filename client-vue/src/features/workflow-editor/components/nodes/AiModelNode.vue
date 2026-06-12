<script setup lang="ts">
import { computed } from 'vue'
import type { NodeProps } from '@vue-flow/core'
import type { AiModelNode } from '@/core/types/workflow.types'
import BaseNode from '../BaseNode.vue'
import { usePluginNodePresentation } from '../../composables/usePluginNodePresentation'
import { CONFIGURATION_SOURCE_HANDLER } from '../../layout/advancedNodeDefinitions'

const props = defineProps<
  NodeProps<AiModelNode> & { status?: 'idle' | 'waiting' | 'running' | 'retrying' | 'success' | 'failed' }
>()

const stepTitle = computed(() => props.data?.name || 'AI Model')
const model = computed(() => props.data?.model || 'model')
const pluginId = computed(() => props.data?.pluginId || '')
const subtitle = computed(() => `${pluginId.value || 'Plugin'} / ${model.value}`)
const { pluginIcon, customBg, customBorder, customIconColor } = usePluginNodePresentation(pluginId, 'box')
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
