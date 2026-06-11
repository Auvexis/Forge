<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Position, type NodeProps } from '@vue-flow/core'
import type { VectorStoreNode } from '@/core/types/workflow.types'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseNode from '../BaseNode.vue'
import BaseHandle from '../BaseHandle.vue'
import QuickAddButton from '../QuickAddButton.vue'

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
  <div class="vector-store-node">
    <BaseNode
      :id="props.id"
      :selected="props.selected"
      :status="props.status"
      :has-outgoing-connection="props.hasOutgoingConnection"
      has-target
      has-source
      :bg="customBg || 'transparent'"
      :border-color="customBorder || 'var(--sailor-node-border)'"
      width="236px"
      height="100px"
    >
      <template #icon>
        <div class="vector-store-node__card-content">
          <div
            class="vector-store-node__icon"
            :style="{ color: customIconColor || 'var(--sailor-node-plugin-icon)' }"
          >
            <LucideIcon :name="pluginIcon" :size="30" />
          </div>
          <div class="vector-store-node__copy">
            <span class="vector-store-node__title" :title="stepTitle">{{ stepTitle }}</span>
            <span class="vector-store-node__subtitle">{{ subtitle }}</span>
          </div>
        </div>
      </template>

      <div class="vector-store-node__config-handles" aria-label="Vector Store configuration handles">
        <div class="vector-store-node__config-handle">
          <BaseHandle id="embedding" type="target" :position="Position.Bottom" variant="diamond" />
          <span>Embedding</span>
          <QuickAddButton
            :node-id="props.id"
            handle-id="embedding"
            target-handle-id="embedding"
            mode="vector-config"
            direction="down"
          />
        </div>
        <div class="vector-store-node__config-handle">
          <BaseHandle id="document" type="target" :position="Position.Bottom" variant="diamond" />
          <span>Document</span>
          <QuickAddButton
            :node-id="props.id"
            handle-id="document"
            target-handle-id="document"
            mode="vector-config"
            direction="down"
          />
        </div>
      </div>
    </BaseNode>
  </div>
</template>

<style scoped>
.vector-store-node {
  position: relative;
}

.vector-store-node :deep(.sailor-base-node) {
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
}

.vector-store-node__card-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  width: 100%;
  padding: 0 28px;
  box-sizing: border-box;
}

.vector-store-node__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
}

.vector-store-node__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
}

.vector-store-node__title {
  max-width: 128px;
  overflow: hidden;
  color: var(--sailor-text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vector-store-node__subtitle {
  max-width: 128px;
  overflow: hidden;
  color: var(--sailor-text-muted);
  font-size: 11px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vector-store-node__config-handles {
  position: absolute;
  bottom: -86px;
  left: 50%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: start;
  justify-items: center;
  width: 178px;
  height: 86px;
  --qab-size: 19px;
  --qab-cable-length: 48px;
  pointer-events: all;
  transform: translateX(-50%);
}

.vector-store-node__config-handle {
  position: relative;
  display: flex;
  width: 72px;
  flex-direction: column;
  align-items: center;
  color: var(--sailor-text-muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.vector-store-node__config-handle > span {
  position: absolute;
  top: 19px;
  left: 50%;
  z-index: 5100;
  width: 72px;
  pointer-events: none;
  transform: translateX(-50%);
}

.vector-store-node__config-handle :deep(.sailor-base-handle) {
  position: relative !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  margin: 0 auto;
  pointer-events: all;
}

.vector-store-node__config-handle :deep(.qab-wrap--down) {
  margin-top: 0;
}
</style>
