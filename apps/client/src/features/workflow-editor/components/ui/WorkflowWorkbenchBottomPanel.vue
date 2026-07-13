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
  lane: number
  column: number
  color: string
  parentId: string | null
  status: TimelineNodeStatus
  duration?: number
  childCount: number
  isActive: boolean
}

interface WorkflowTimelineConnector {
  id: string
  path: string
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
const TIMELINE_COLUMN_WIDTH = 132
const TIMELINE_LANE_HEIGHT = 42
const TIMELINE_BLOCK_WIDTH = 104
const TIMELINE_TRACK_TOP = 46
const TIMELINE_COLORS = [
  '#4f8cff',
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
  '#22c55e',
  '#ec4899',
  '#06b6d4',
]

const orderedTimelineNodes = computed(() => {
  const nodesById = new Map(workflowNodes.value.map((node) => [node.id, node]))
  const childIdsByParent = new Map<string, string[]>()
  const parentIdsByChild = new Map<string, string[]>()
  const incomingCount = new Map<string, number>()
  const placed: Array<{
    id: string
    parentId: string | null
    lane: number
    column: number
  }> = []
  const visited = new Set<string>()

  for (const edge of workflowEdges.value) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue
    const children = childIdsByParent.get(edge.source) ?? []
    children.push(edge.target)
    childIdsByParent.set(edge.source, children)
    const parents = parentIdsByChild.get(edge.target) ?? []
    parents.push(edge.source)
    parentIdsByChild.set(edge.target, parents)
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)
  }

  const roots = workflowNodes.value
    .filter((node) => !incomingCount.has(node.id))
    .sort((a, b) => Number(a.type !== 'trigger') - Number(b.type !== 'trigger'))

  const branchLane = (parentLane: number, branchIndex: number, totalBranches: number) => {
    if (totalBranches <= 1) return parentLane
    const distance = Math.ceil((branchIndex + 1) / 2)
    return parentLane + (branchIndex % 2 === 0 ? -distance : distance)
  }

  const walk = (nodeId: string, lane: number, column: number, parentId: string | null) => {
    const node = nodesById.get(nodeId)
    if (!node || visited.has(nodeId)) return
    visited.add(nodeId)
    placed.push({ id: nodeId, parentId, lane, column })
    const children = childIdsByParent.get(nodeId) ?? []
    children.forEach((childId, index) => {
      walk(childId, branchLane(lane, index, children.length), column + 1, nodeId)
    })
  }

  roots.forEach((node, index) => walk(node.id, index * 2, 0, null))
  workflowNodes.value.forEach((node) => walk(node.id, placed.length ? Math.max(...placed.map((item) => item.lane)) + 1 : 0, 0, null))

  const placementById = new Map(placed.map((placement) => [placement.id, placement]))
  const syncSingleParentChildren = (nodeId: string, lane: number) => {
    for (const childId of childIdsByParent.get(nodeId) ?? []) {
      const childParents = parentIdsByChild.get(childId) ?? []
      if (childParents.length !== 1) continue
      const childPlacement = placementById.get(childId)
      if (!childPlacement) continue
      childPlacement.lane = lane
      syncSingleParentChildren(childId, lane)
    }
  }

  for (const placement of placed) {
    const parents = parentIdsByChild.get(placement.id) ?? []
    if (parents.length <= 1) continue
    const parentPlacements = parents
      .map((parentId) => placementById.get(parentId))
      .filter((parent): parent is NonNullable<typeof parent> => parent !== undefined)
    if (parentPlacements.length <= 1) continue
    const centeredLane = parentPlacements.reduce((sum, parent) => sum + parent.lane, 0) / parentPlacements.length
    placement.lane = centeredLane
    syncSingleParentChildren(placement.id, centeredLane)
  }

  const pushSingleParentChildrenLane = (nodeId: string, lane: number) => {
    for (const childId of childIdsByParent.get(nodeId) ?? []) {
      const childParents = parentIdsByChild.get(childId) ?? []
      if (childParents.length !== 1) continue
      const childPlacement = placementById.get(childId)
      if (!childPlacement) continue
      childPlacement.lane = lane
      pushSingleParentChildrenLane(childId, lane)
    }
  }

  const occupiedSlots = new Set<string>()
  for (const placement of [...placed].sort((a, b) => a.column - b.column)) {
    let slotKey = `${placement.column}:${placement.lane}`
    let distance = 1
    while (occupiedSlots.has(slotKey)) {
      placement.lane += distance
      distance += 1
      slotKey = `${placement.column}:${placement.lane}`
    }
    occupiedSlots.add(slotKey)
    pushSingleParentChildrenLane(placement.id, placement.lane)
  }

  const minLane = Math.min(0, ...placed.map((node) => node.lane))
  return placed.map((placement, index) => ({
    ...nodesById.get(placement.id)!,
    lane: placement.lane - minLane,
    column: placement.column,
    color: TIMELINE_COLORS[index % TIMELINE_COLORS.length] ?? '#4f8cff',
    parentId: placement.parentId,
  }))
})

const timelineNodes = computed<WorkflowTimelineNode[]>(() =>
  orderedTimelineNodes.value.map((node, index) => {
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
  const activeNode = timelineNodes.value.find((node) => node.id === activeTimelineNodeId.value)
  const column = activeNode?.column ?? 0
  return { '--workflow-timeline-playhead-x': `${column * TIMELINE_COLUMN_WIDTH + 52}px` }
})

const timelineTrackStyle = computed(() => {
  const maxLane = Math.max(0, ...timelineNodes.value.map((node) => node.lane))
  const maxColumn = Math.max(0, ...timelineNodes.value.map((node) => node.column))
  return {
    ...playheadStyle.value,
    '--workflow-timeline-track-width': `${maxColumn * TIMELINE_COLUMN_WIDTH + TIMELINE_BLOCK_WIDTH + 76}px`,
    '--workflow-timeline-track-height': `${maxLane * TIMELINE_LANE_HEIGHT + TIMELINE_TRACK_TOP + 56}px`,
  }
})

const timelineConnectors = computed<WorkflowTimelineConnector[]>(() => {
  const nodesById = new Map(timelineNodes.value.map((node) => [node.id, node]))
  return workflowEdges.value.flatMap((edge) => {
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (!source || !target) return []

    const sourceX = 36 + source.column * TIMELINE_COLUMN_WIDTH + TIMELINE_BLOCK_WIDTH
    const targetX = 36 + target.column * TIMELINE_COLUMN_WIDTH
    const sourceY = 18 + source.lane * TIMELINE_LANE_HEIGHT + 14
    const targetY = 18 + target.lane * TIMELINE_LANE_HEIGHT + 14
    const middleX = sourceX + Math.max(18, (targetX - sourceX) / 2)

    return [{
      id: edge.id,
      path: `M ${sourceX} ${sourceY} H ${middleX} V ${targetY} H ${targetX}`,
    }]
  })
})

function formatDuration(duration: number | undefined) {
  if (duration === undefined) return '...'
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

function iconForNodeType(type: string) {
  if (type === 'trigger') return 'play'
  if (type === 'http') return 'globe-2'
  if (type === 'code') return 'code-2'
  if (type === 'return') return 'corner-down-left'
  if (type === 'if') return 'git-branch'
  if (type === 'switch') return 'git-branch-plus'
  if (type === 'set') return 'list-plus'
  return 'box'
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
        <div class="workflow-timeline__track" :style="timelineTrackStyle">
          <svg class="workflow-timeline__connectors" aria-hidden="true">
            <path
              v-for="connector in timelineConnectors"
              :key="connector.id"
              class="workflow-timeline__connector"
              :d="connector.path"
            />
          </svg>
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
            :style="{
              '--workflow-timeline-x': `${node.column * TIMELINE_COLUMN_WIDTH}px`,
              '--workflow-timeline-y': `${node.lane * TIMELINE_LANE_HEIGHT}px`,
              '--workflow-timeline-color': node.color,
            }"
          >
            <LucideIcon :name="iconForNodeType(node.type)" :size="14" />
            <span>{{ node.name }}</span>
            <code>{{ formatDuration(node.duration) }}</code>
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
  overflow: auto;
}

.workflow-timeline__track {
  position: relative;
  width: var(--workflow-timeline-track-width, 100%);
  min-width: 100%;
  height: var(--workflow-timeline-track-height, 120px);
  min-height: 100%;
  padding: 18px 36px;
}

.workflow-timeline__playhead {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: calc(36px + var(--workflow-timeline-playhead-x, 52px));
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

.workflow-timeline__connectors {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.workflow-timeline__connector {
  fill: none;
  stroke: var(--fabric-border-strong);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.workflow-timeline__clip {
  position: absolute;
  top: calc(18px + var(--workflow-timeline-y, 0px));
  left: calc(36px + var(--workflow-timeline-x, 0px));
  z-index: 2;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px;
  width: 104px;
  height: 28px;
  padding: 0 7px;
  border: 1px solid color-mix(in srgb, var(--workflow-timeline-color) 72%, var(--fabric-border-muted));
  border-radius: 3px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--workflow-timeline-color) 24%, transparent), transparent 48%),
    var(--fabric-bg-surface);
  color: var(--fabric-text-primary);
  font-size: 11px;
  transition:
    transform var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard);
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
  transform: translateY(-2px);
  background: var(--fabric-bg-elevated);
  box-shadow: inset 0 0 0 1px var(--fabric-accent);
}

.workflow-timeline__clip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-timeline__clip code {
  color: var(--fabric-text-muted);
  font-size: 9px;
}
</style>
