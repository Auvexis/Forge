<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import ExecutionBottomPanel from '../execution/ExecutionBottomPanel.vue'
import { useExecutionStore } from '../../stores/execution.store'
import { useWorkflowStore } from '../../stores/workflow.store'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { NodeExecutionStatus } from '@/core/types/execution.types'

export type WorkflowBottomPanelView = 'timeline' | 'tree' | 'execution' | 'variables'

type TimelineNodeStatus = NodeExecutionStatus | 'cancelled' | 'info'
interface WorkflowTimelineNode {
  id: string
  name: string
  type: string
  index: number
  status: TimelineNodeStatus
  duration?: number
  childCount: number
  isActive: boolean
}

const props = defineProps<{
  activeView: WorkflowBottomPanelView
}>()

const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const timelineTrackRef = ref<HTMLElement | null>(null)

const workflowNodes = computed(() =>
  Object.entries(workflowStore.activeWorkflow?.nodes ?? {}).map(([id, node]) => ({
    id,
    name: typeof node.name === 'string' && node.name.trim() ? node.name : id,
    type: node.type,
  })),
)

const workflowVariables = computed(() => workflowStore.activeWorkflow?.variables ?? [])
const workflowEdges = computed(() => workflowStore.activeWorkflow?.edges ?? [])
const latestNodeEvent = computed(() => [...executionStore.timeline].reverse().find((event) => event.nodeId))
const activeTimelineNodeId = computed<string>(() => latestNodeEvent.value?.nodeId ?? workflowNodes.value[0]?.id ?? '')

const timelineNodes = computed<WorkflowTimelineNode[]>(() =>
  workflowNodes.value.map((node, index) => {
    const state = executionStore.nodeStatuses[node.id]
    const events = executionStore.timeline.filter((event) => event.nodeId === node.id)
    const latestEvent = events.at(-1)
    const duration = state?.startedAt && state?.endedAt ? state.endedAt - state.startedAt : undefined
    const childCount = workflowEdges.value.filter((edge) => edge.source === node.id).length
    return {
      ...node,
      index,
      status: state?.status ?? latestEvent?.status ?? 'idle',
      duration,
      childCount,
      isActive: activeTimelineNodeId.value === node.id,
    }
  }),
)

const timelineStats = computed(() => {
  const passed = timelineNodes.value.filter((node) => node.status !== 'idle').length
  const success = timelineNodes.value.filter((node) => node.status === 'success').length
  const failed = timelineNodes.value.filter((node) => node.status === 'failed').length
  const waiting = timelineNodes.value.filter((node) => node.status === 'waiting' || node.status === 'retrying').length
  return { passed, success, failed, waiting }
})

const playheadStyle = computed(() => {
  const activeIndex = Math.max(0, timelineNodes.value.findIndex((node) => node.id === activeTimelineNodeId.value))
  return { '--workflow-timeline-playhead-x': `${activeIndex * 156 + 78}px` }
})

function formatDuration(duration: number | undefined) {
  if (duration === undefined) return '...'
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

watch(activeTimelineNodeId, async (nodeId) => {
  await nextTick()
  timelineTrackRef.value
    ?.querySelector(`[data-workflow-timeline-node-id="${CSS.escape(nodeId)}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
})
</script>

<template>
  <section class="workflow-bottom-panel" aria-label="Workflow bottom panel">
    <div v-if="activeView === 'timeline'" class="workflow-bottom-panel__view workflow-timeline">
      <div class="workflow-bottom-panel__heading workflow-timeline__header">
        <strong>Timeline</strong>
        <div class="workflow-timeline__stats" aria-label="Execution timeline stats">
          <code>{{ timelineStats.passed }} passed</code>
          <code>{{ timelineStats.success }} ok</code>
          <code>{{ timelineStats.failed }} errors</code>
          <code>{{ timelineStats.waiting }} waiting</code>
        </div>
      </div>

      <div ref="timelineTrackRef" class="workflow-timeline__scroll">
        <div class="workflow-timeline__track" :style="playheadStyle">
          <span class="workflow-timeline__playhead" aria-hidden="true" />
          <div
            v-for="node in timelineNodes"
            :key="node.id"
            class="workflow-timeline__clip"
            :class="[
              `workflow-timeline__clip--${node.status}`,
              { 'workflow-timeline__clip--active': node.isActive },
            ]"
            :data-workflow-timeline-node-id="node.id"
          >
            <div class="workflow-timeline__clip-top">
              <LucideIcon name="box" :size="13" />
              <span>{{ node.name }}</span>
              <code>{{ formatDuration(node.duration) }}</code>
            </div>
            <div class="workflow-timeline__clip-bottom">
              <span>{{ node.type }}</span>
              <code>{{ node.childCount }} out</code>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="activeView === 'tree'" class="workflow-bottom-panel__view">
      <div class="workflow-bottom-panel__heading">
        <strong>Workflow tree</strong>
        <code>{{ workflowNodes.length }} nodes</code>
      </div>
      <div v-if="workflowNodes.length" class="workflow-bottom-panel__rows">
        <button
          v-for="node in workflowNodes"
          :key="node.id"
          class="workflow-bottom-panel__row"
          type="button"
        >
          <LucideIcon name="box" :size="14" />
          <span>{{ node.name }}</span>
          <code>{{ node.type }}</code>
        </button>
      </div>
      <div v-else class="workflow-bottom-panel__empty">No nodes added.</div>
    </div>

    <ExecutionBottomPanel v-else-if="activeView === 'execution'" />

    <div v-else class="workflow-bottom-panel__view">
      <div class="workflow-bottom-panel__heading">
        <strong>Variables</strong>
        <code>{{ workflowVariables.length }} local</code>
      </div>
      <div v-if="workflowVariables.length" class="workflow-bottom-panel__rows">
        <div
          v-for="variable in workflowVariables"
          :key="variable.name"
          class="workflow-bottom-panel__row"
        >
          <LucideIcon name="tag" :size="14" />
          <span>{{ variable.name }}</span>
          <code>{{ variable.type }}</code>
        </div>
      </div>
      <div v-else class="workflow-bottom-panel__empty">No workflow variables.</div>
    </div>
  </section>
</template>

<style scoped>
.workflow-bottom-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  color: var(--fabric-workbench-text);
  background: var(--fabric-workbench-panel-bg);
}

.workflow-bottom-panel__view {
  display: grid;
  grid-template-rows: 32px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.workflow-bottom-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-workbench-border);
  font-size: var(--fabric-text-xs);
}

.workflow-bottom-panel__heading code,
.workflow-bottom-panel__row code {
  color: var(--fabric-text-muted);
  font-size: 11px;
}

.workflow-bottom-panel__rows {
  min-height: 0;
  overflow: auto;
}

.workflow-bottom-panel__row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 28px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-border-muted);
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
  text-align: left;
}

.workflow-bottom-panel__row:hover {
  color: var(--fabric-text-primary);
  background: var(--fabric-button-ghost-hover);
}

.workflow-bottom-panel__row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-bottom-panel__empty {
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.workflow-timeline__header {
  justify-content: flex-start;
}

.workflow-timeline__stats {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-left: auto;
  border: 1px solid var(--fabric-border-muted);
  background: var(--fabric-border-muted);
}

.workflow-timeline__stats code {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  background: var(--fabric-workbench-panel-bg);
}

.workflow-timeline__scroll {
  min-width: 0;
  min-height: 0;
  overflow: auto hidden;
}

.workflow-timeline__track {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: max-content;
  height: 100%;
  padding: 24px 32px;
}

.workflow-timeline__track::before {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
  background: var(--fabric-border-muted);
  content: '';
}

.workflow-timeline__playhead {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: var(--workflow-timeline-playhead-x, 78px);
  z-index: 3;
  width: 2px;
  background: var(--fabric-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--fabric-accent) 42%, transparent);
  transition: left 180ms linear;
}

.workflow-timeline__playhead::before {
  position: absolute;
  top: -8px;
  left: 50%;
  width: 10px;
  height: 10px;
  transform: translateX(-50%) rotate(45deg);
  background: var(--fabric-accent);
  content: '';
}

.workflow-timeline__clip {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-rows: 1fr 1fr;
  width: 144px;
  height: 54px;
  border: 1px solid var(--fabric-border-muted);
  background: var(--fabric-bg-surface);
  color: var(--fabric-text-secondary);
}

.workflow-timeline__clip::after {
  position: absolute;
  top: 50%;
  right: -13px;
  width: 12px;
  height: 1px;
  background: var(--fabric-border-strong);
  content: '';
}

.workflow-timeline__clip:last-child::after {
  display: none;
}

.workflow-timeline__clip--success {
  border-color: var(--fabric-status-success-border);
}

.workflow-timeline__clip--failed {
  border-color: var(--fabric-status-error-border);
}

.workflow-timeline__clip--waiting,
.workflow-timeline__clip--retrying {
  border-color: var(--fabric-border-brand);
}

.workflow-timeline__clip--running {
  border-color: var(--fabric-status-running-border);
}

.workflow-timeline__clip--active {
  color: var(--fabric-text-primary);
  background: var(--fabric-bg-elevated);
}

.workflow-timeline__clip-top,
.workflow-timeline__clip-bottom {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 8px;
}

.workflow-timeline__clip-bottom {
  grid-template-columns: minmax(0, 1fr) auto;
  border-top: 1px solid var(--fabric-border-muted);
}

.workflow-timeline__clip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
