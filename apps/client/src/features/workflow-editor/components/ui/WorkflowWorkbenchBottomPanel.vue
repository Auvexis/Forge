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

interface WorkflowTimelinePlacement {
  id: string
  parentId: string | null
  lane: number
  column: number
  positionY: number
}

const props = defineProps<{
  activeView: WorkflowBottomPanelView
}>()

const emit = defineEmits<{
  close: []
}>()

const workflowStore = useWorkflowStore()
const executionStore = useExecutionStore()
const timelineTrackRef = ref<HTMLElement | null>(null)

const workflowNodes = computed(() =>
  Object.entries(workflowStore.activeWorkflow?.nodes ?? {}).map(([id, node]) => ({
    id,
    name: typeof node.name === 'string' && node.name.trim() ? node.name : id,
    type: node.type,
    positionY: typeof node.ui?.positionY === 'number' ? node.ui.positionY : 0,
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
  const columnById = new Map<string, number>()
  const parentByChild = new Map<string, string | null>()

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
    .sort((a, b) => Number(a.type !== 'trigger') - Number(b.type !== 'trigger') || a.positionY - b.positionY)

  const assignColumn = (nodeId: string, column: number, parentId: string | null, path = new Set<string>()) => {
    if (path.has(nodeId)) return
    const node = nodesById.get(nodeId)
    if (!node) return
    columnById.set(nodeId, Math.max(columnById.get(nodeId) ?? 0, column))
    if (!parentByChild.has(nodeId)) parentByChild.set(nodeId, parentId)
    const nextPath = new Set(path)
    nextPath.add(nodeId)
    for (const childId of childIdsByParent.get(nodeId) ?? []) {
      assignColumn(childId, column + 1, nodeId, nextPath)
    }
  }

  roots.forEach((node) => assignColumn(node.id, 0, null))
  workflowNodes.value.forEach((node) => assignColumn(node.id, columnById.get(node.id) ?? 0, parentByChild.get(node.id) ?? null))

  const placements: WorkflowTimelinePlacement[] = workflowNodes.value.map((node) => ({
    id: node.id,
    parentId: parentByChild.get(node.id) ?? null,
    lane: 0,
    column: columnById.get(node.id) ?? 0,
    positionY: node.positionY,
  }))
  const placementById = new Map(placements.map((placement) => [placement.id, placement]))
  const placementsByColumn = () => {
    const columns = new Map<number, WorkflowTimelinePlacement[]>()
    for (const placement of placements) {
      const columnPlacements = columns.get(placement.column) ?? []
      columnPlacements.push(placement)
      columns.set(placement.column, columnPlacements)
    }
    return columns
  }

  for (const columnPlacements of placementsByColumn().values()) {
    columnPlacements
      .sort((a, b) => a.positionY - b.positionY || a.id.localeCompare(b.id))
      .forEach((placement, index) => {
        placement.lane = index
      })
  }

  const centerMergesFromParents = () => {
    for (const placement of placements) {
      const parentPlacements = (parentIdsByChild.get(placement.id) ?? [])
        .map((parentId) => placementById.get(parentId))
        .filter((parent): parent is WorkflowTimelinePlacement => parent !== undefined)
      if (parentPlacements.length <= 1) continue
      placement.lane = parentPlacements.reduce((sum, parent) => sum + parent.lane, 0) / parentPlacements.length
    }
  }

  const centerSplitsFromChildren = () => {
    const columns = [...placementsByColumn().keys()].sort((a, b) => b - a)
    for (const column of columns) {
      const columnPlacements = placements.filter((placement) => placement.column === column)
      for (const placement of columnPlacements) {
        const childPlacements = (childIdsByParent.get(placement.id) ?? [])
          .map((childId) => placementById.get(childId))
          .filter((child): child is WorkflowTimelinePlacement => child !== undefined)
        if (childPlacements.length <= 1) continue
        placement.lane = childPlacements.reduce((sum, child) => sum + child.lane, 0) / childPlacements.length
      }
    }
  }

  const separateColumnCollisions = () => {
    for (const columnPlacements of placementsByColumn().values()) {
      const laneGroups = new Map<string, WorkflowTimelinePlacement[]>()
      for (const placement of columnPlacements) {
        const laneKey = placement.lane.toFixed(3)
        const laneGroup = laneGroups.get(laneKey) ?? []
        laneGroup.push(placement)
        laneGroups.set(laneKey, laneGroup)
      }

      for (const group of laneGroups.values()) {
        if (group.length <= 1) continue
        const baseLane = group.reduce((sum, placement) => sum + placement.lane, 0) / group.length
        group
          .sort((a, b) => a.positionY - b.positionY || a.id.localeCompare(b.id))
          .forEach((placement, index) => {
            placement.lane = baseLane + index - (group.length - 1) / 2
          })
      }

      columnPlacements
        .sort((a, b) => a.lane - b.lane || a.positionY - b.positionY)
        .forEach((placement, index, sortedPlacements) => {
          if (index === 0) return
          const previous = sortedPlacements[index - 1]
          if (!previous || placement.lane - previous.lane >= 1) return
          placement.lane = previous.lane + 1
        })
    }
  }

  centerMergesFromParents()
  separateColumnCollisions()
  centerSplitsFromChildren()
  separateColumnCollisions()

  const orderedPlacements = [...placements].sort((a, b) => a.column - b.column || a.lane - b.lane || a.positionY - b.positionY)
  const minLane = Math.min(0, ...orderedPlacements.map((node) => node.lane))
  return orderedPlacements.map((placement, index) => ({
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

const panelTitle = computed(() => {
  if (props.activeView === 'tree') return 'Workflow tree'
  if (props.activeView === 'execution') return 'Execution'
  if (props.activeView === 'variables') return 'Variables'
  return 'Timeline'
})

const panelMeta = computed(() => {
  if (props.activeView === 'tree') return `${workflowNodes.value.length} nodes`
  if (props.activeView === 'variables') return `${workflowVariables.value.length} local`
  if (props.activeView === 'execution') return `${executionStore.timeline.length} events`
  return ''
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
    <header class="workflow-bottom-panel__heading">
      <strong>{{ panelTitle }}</strong>
      <code v-if="panelMeta">{{ panelMeta }}</code>
      <template v-if="activeView === 'timeline'">
        <div class="workflow-timeline__stats" aria-label="Execution timeline stats">
          <code>{{ timelineStats.passed }} passed</code>
          <code>{{ timelineStats.success }} ok</code>
          <code>{{ timelineStats.failed }} errors</code>
          <code>{{ timelineStats.waiting }} waiting</code>
        </div>
      </template>
      <button
        class="workflow-bottom-panel__close"
        type="button"
        title="Close bottom panel"
        @click="emit('close')"
      >
        <LucideIcon name="x" :size="16" />
      </button>
    </header>

    <div v-if="activeView === 'timeline'" class="workflow-bottom-panel__view workflow-timeline">
      <div ref="timelineTrackRef" class="workflow-timeline__scroll">
        <div class="workflow-timeline__track" :style="timelineTrackStyle">
          <span class="workflow-timeline__playhead" aria-hidden="true" />
          <div class="workflow-timeline__plane">
            <svg class="workflow-timeline__connectors" aria-hidden="true">
              <path
                v-for="connector in timelineConnectors"
                :key="connector.id"
                class="workflow-timeline__connector"
                :d="connector.path"
              />
            </svg>
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
    </div>

    <div v-else-if="activeView === 'tree'" class="workflow-bottom-panel__view">
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
  grid-template-rows: 32px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  color: var(--fabric-workflow-timeline-text, var(--fabric-workbench-text));
  background: var(--fabric-workflow-timeline-bg, var(--fabric-workbench-panel-bg));
}

.workflow-bottom-panel__view {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
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
  background: var(--fabric-workflow-timeline-header-bg, var(--fabric-workbench-panel-header-bg, var(--fabric-workbench-rail-bg)));
  font-size: var(--fabric-text-xs);
}

.workflow-bottom-panel__heading code,
.workflow-bottom-panel__row code {
  color: var(--fabric-text-muted);
  font-size: 11px;
}

.workflow-bottom-panel__heading strong {
  min-width: 0;
  white-space: nowrap;
}

.workflow-bottom-panel__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-left: auto;
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-text-secondary);
  transition: background-color var(--fabric-duration-fast);
}

.workflow-bottom-panel__close:hover {
  background-color: var(--fabric-bg-muted);
  color: var(--fabric-text-primary);
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

.workflow-timeline__stats {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
}

.workflow-timeline__stats code {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  background: transparent;
}

.workflow-timeline__stats code:not(:last-child) {
  border-right: 1px solid var(--fabric-border-muted);
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

.workflow-timeline__plane {
  position: absolute;
  top: max(18px, calc((100% - var(--workflow-timeline-track-height, 120px)) / 2));
  left: 0;
  width: var(--workflow-timeline-track-width, 100%);
  height: var(--workflow-timeline-track-height, 120px);
}

.workflow-timeline__playhead {
  position: absolute;
  top: 8px;
  bottom: 0;
  left: calc(36px + var(--workflow-timeline-playhead-x, 52px));
  z-index: 3;
  width: 2px;
  background: var(--fabric-workflow-timeline-playhead, var(--fabric-accent));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--fabric-workflow-timeline-playhead, var(--fabric-accent)) 42%, transparent);
  transition: left 180ms linear;
}

.workflow-timeline__playhead::before {
  position: absolute;
  top: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  transform: translateX(-50%) rotate(45deg);
  background: var(--fabric-workflow-timeline-playhead, var(--fabric-accent));
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
  stroke: var(--fabric-workflow-timeline-connector, var(--fabric-border-strong));
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
    var(--fabric-workflow-timeline-clip-bg, var(--fabric-bg-surface));
  color: var(--fabric-text-primary);
  font-size: 11px;
  transition:
    transform var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.workflow-timeline__clip--success {
  border-color: var(--fabric-workflow-timeline-clip-success-border, var(--fabric-status-success-border));
}

.workflow-timeline__clip--failed {
  border-color: var(--fabric-workflow-timeline-clip-error-border, var(--fabric-status-error-border));
}

.workflow-timeline__clip--waiting,
.workflow-timeline__clip--retrying {
  border-color: var(--fabric-workflow-timeline-clip-waiting-border, var(--fabric-border-brand));
}

.workflow-timeline__clip--running {
  border-color: var(--fabric-workflow-timeline-clip-running-border, var(--fabric-status-running-border));
}

.workflow-timeline__clip--active {
  transform: translateY(-2px);
  background: var(--fabric-workflow-timeline-clip-active-bg, var(--fabric-bg-elevated));
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
