<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import { workflowNodesApi } from '@/core/api/workflowNodes.api'
import type { ExecutionLog } from '@/core/types/execution.types'
import type { PluginSummary } from '@/core/types/plugin.types'
import type { WorkflowNodeCatalogItem } from '@/core/types/workflow-node-catalog.types'
import type { WorkflowItem, WorkflowNode } from '@/core/types/workflow.types'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import { buildExecutionRunDetail } from './executionRunTreeModel.ts'
import type { ExecutionNodePresentation } from './executionRunTree.types.ts'
import ExecutionRunDetail from './ExecutionRunDetail.vue'
import ExecutionRunsView from './ExecutionRunsView.vue'

const props = withDefaults(defineProps<{
  runs: ExecutionLog[]
  workflow: WorkflowItem | null
  loading?: boolean
}>(), { loading: false })

const selectedRunId = ref<string | null>(null)
const nodePresentations = ref<Record<string, ExecutionNodePresentation>>({})
const { isDark } = useTheme()
const selectedRun = computed(() => props.runs.find((run) => run.id === selectedRunId.value) ?? null)
const selectedDetail = computed(() => selectedRun.value ? buildExecutionRunDetail({
  workflow: props.workflow,
  run: selectedRun.value,
  nodePresentations: nodePresentations.value,
}) : null)

const TRIGGER_PRESENTATION: Record<string, ExecutionNodePresentation> = {
  manual: { icon: 'mouse-pointer-2', iconColor: 'var(--sailor-text-primary)' },
  webhook: { icon: 'webhook', iconColor: 'rgb(16, 185, 129)' },
  cron: { icon: 'clock', iconColor: 'rgb(138, 82, 255)' },
  form: { icon: 'clipboard-list', iconColor: 'rgb(236, 72, 153)' },
  chat: { icon: 'message-circle', iconColor: 'rgb(20, 184, 166)' },
}

function nodePluginId(node: WorkflowNode): string | undefined {
  if (node.type === 'trigger') {
    return node.trigger?.type === 'plugin' ? node.trigger.pluginId : undefined
  }
  return 'pluginId' in node && typeof node.pluginId === 'string' ? node.pluginId : undefined
}

function presentationFor(
  node: WorkflowNode,
  catalogByType: Map<string, WorkflowNodeCatalogItem>,
  pluginsById: Map<string, PluginSummary>,
): ExecutionNodePresentation | null {
  const pluginId = nodePluginId(node)
  const plugin = pluginId ? pluginsById.get(pluginId) : undefined
  if (plugin) {
    const metadata = plugin.manifest.metadata
    return {
      icon: resolvePluginIcon(metadata, { isDark: isDark.value, fallback: node.ui?.icon ?? 'box' }),
      iconColor: metadata.style?.iconColor ?? 'var(--sailor-node-plugin-icon)',
    }
  }

  if (node.type === 'trigger') {
    const triggerType = node.trigger?.type ?? 'manual'
    return TRIGGER_PRESENTATION[triggerType] ?? null
  }

  const style = catalogByType.get(node.type)?.style
  return style ? { icon: style.icon, iconColor: style.iconColor } : null
}

async function loadNodePresentations() {
  if (!props.workflow) {
    nodePresentations.value = {}
    return
  }

  const [catalogResult, pluginsResult] = await Promise.allSettled([
    workflowNodesApi.getCatalog(),
    pluginsApi.getAll(),
  ])
  const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value.nodes : []
  const plugins = pluginsResult.status === 'fulfilled' ? pluginsResult.value : []
  const catalogByType = new Map(catalog.map((item) => [item.type, item]))
  const pluginsById = new Map(plugins.map((plugin) => [plugin.id, plugin]))

  nodePresentations.value = Object.fromEntries(
    Object.entries(props.workflow.nodes).flatMap(([nodeId, node]) => {
      const presentation = presentationFor(node, catalogByType, pluginsById)
      return presentation ? [[nodeId, presentation]] : []
    }),
  )
}

watch(() => props.runs, (runs) => {
  if (selectedRunId.value && !runs.some((run) => run.id === selectedRunId.value)) selectedRunId.value = null
})
watch([() => props.workflow, isDark], loadNodePresentations, { immediate: true })
</script>

<template>
  <div class="execution-run-explorer">
    <ExecutionRunsView :runs="props.runs" :loading="props.loading" @select="selectedRunId = $event" />
    <Transition name="execution-run-slide">
      <ExecutionRunDetail v-if="selectedDetail" class="execution-run-explorer__detail" :detail="selectedDetail" @back="selectedRunId = null" />
    </Transition>
  </div>
</template>

<style scoped>
.execution-run-explorer { position: relative; height: 100%; min-height: 0; overflow: hidden; }
.execution-run-explorer__detail { position: absolute; inset: 0; z-index: 1; box-shadow: -12px 0 28px color-mix(in srgb, var(--sailor-bg-base) 55%, transparent); }
.execution-run-slide-enter-active { transition: transform var(--sailor-duration-slow) var(--sailor-ease-decelerate), opacity var(--sailor-duration-base) var(--sailor-ease-standard); }
.execution-run-slide-leave-active { transition: transform var(--sailor-duration-base) var(--sailor-ease-accelerate), opacity var(--sailor-duration-fast) var(--sailor-ease-standard); }
.execution-run-slide-enter-from, .execution-run-slide-leave-to { opacity: 0; transform: translateX(100%); }
</style>
