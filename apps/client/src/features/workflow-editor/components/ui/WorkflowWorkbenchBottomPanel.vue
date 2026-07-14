<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
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
  rootId: string
  status: TimelineNodeStatus
  duration?: number
  childCount: number
  isActive: boolean
  isTrace: boolean
  isDimmed: boolean
  eventCount: number
  latestLabel: string
}

interface WorkflowTimelineConnector {
  id: string
  path: string
  isPassed: boolean
  status: TimelineNodeStatus
}

interface WorkflowTimelinePlacement {
  id: string
  parentId: string | null
  rootId: string
  lane: number
  column: number
  positionY: number
}

interface WorkflowTimelineLane {
  lane: number
  label: string
  isRoot: boolean
  isActive: boolean
}

interface WorkflowTimelineEntryPoint {
  id: string
  name: string
  type: string
  nodeCount: number
  eventCount: number
  status: TimelineNodeStatus
  isActive: boolean
}

const props = defineProps<{
  activeView: WorkflowBottomPanelView
  focusedNodeId?: string | null
}>()

const emit = defineEmits<{
  close: []
  nodeSelect: [nodeId: string]
  nodeFocus: [nodeId: string]
  nodeHover: [nodeId: string | null]
  nodeClear: []
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
const hoveredTimelineNodeId = ref<string | null>(null)
const traceTimelineNodeId = ref<string | null>(null)
const timelineCursorIndex = ref<number | null>(null)
const timelineTooltipX = ref(0)
const timelineTooltipY = ref(0)
const isDraggingTimelinePlayhead = ref(false)
const timelinePlayheadDragX = ref<number | null>(null)
const selectedTimelineEntryId = ref<string>('all')
const TIMELINE_COLUMN_WIDTH = 132
const TIMELINE_LANE_HEIGHT = 42
const TIMELINE_BLOCK_WIDTH = 104
const TIMELINE_CONTENT_LEFT = 76
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
const activeTimelineNodeId = computed<string>(() => {
  if (timelineCursorIndex.value !== null) return orderedTimelineNodes.value[timelineCursorIndex.value]?.id ?? latestTimelineNodeId.value
  return latestTimelineNodeId.value
})

const childIdsByParent = computed(() => {
  const childrenByParent = new Map<string, string[]>()
  const nodeIds = new Set(workflowNodes.value.map((node) => node.id))
  for (const edge of workflowEdges.value) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    const children = childrenByParent.get(edge.source) ?? []
    children.push(edge.target)
    childrenByParent.set(edge.source, children)
  }
  return childrenByParent
})

const parentIdsByChild = computed(() => {
  const parentsByChild = new Map<string, string[]>()
  const nodeIds = new Set(workflowNodes.value.map((node) => node.id))
  for (const edge of workflowEdges.value) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue
    const parents = parentsByChild.get(edge.target) ?? []
    parents.push(edge.source)
    parentsByChild.set(edge.target, parents)
  }
  return parentsByChild
})

function collectTimelineDescendantIds(rootId: string) {
  const visited = new Set<string>()
  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    for (const childId of childIdsByParent.value.get(nodeId) ?? []) visit(childId)
  }
  visit(rootId)
  return visited
}

const timelineRootNodes = computed(() =>
  workflowNodes.value
    .filter((node) => node.type === 'trigger' || !parentIdsByChild.value.has(node.id))
    .sort((a, b) => Number(a.type !== 'trigger') - Number(b.type !== 'trigger') || a.positionY - b.positionY),
)

const latestTimelineEntryId = computed(() => {
  const latestNodeId = latestNodeEvent.value?.nodeId
  if (!latestNodeId) return null
  return timelineRootNodes.value.find((root) => collectTimelineDescendantIds(root.id).has(latestNodeId))?.id ?? null
})

const selectedTimelineNodeIds = computed(() => (
  selectedTimelineEntryId.value === 'all'
    ? new Set(workflowNodes.value.map((node) => node.id))
    : collectTimelineDescendantIds(selectedTimelineEntryId.value)
))

const timelineWorkflowNodes = computed(() =>
  workflowNodes.value.filter((node) => selectedTimelineNodeIds.value.has(node.id)),
)

const timelineWorkflowEdges = computed(() =>
  workflowEdges.value.filter((edge) => selectedTimelineNodeIds.value.has(edge.source) && selectedTimelineNodeIds.value.has(edge.target)),
)

const latestTimelineNodeId = computed<string>(() => {
  const latestNodeId = latestNodeEvent.value?.nodeId
  if (latestNodeId && selectedTimelineNodeIds.value.has(latestNodeId)) return latestNodeId
  return timelineWorkflowNodes.value[0]?.id ?? workflowNodes.value[0]?.id ?? ''
})

const timelineEntryPoints = computed<WorkflowTimelineEntryPoint[]>(() => {
  const statusRank: TimelineNodeStatus[] = ['failed', 'running', 'retrying', 'waiting', 'success', 'cancelled', 'info', 'idle']
  const resolveStatus = (nodeIds: Set<string>) => {
    const statuses = [...nodeIds].map((nodeId) => executionStore.nodeStatuses[nodeId]?.status ?? 'idle' as TimelineNodeStatus)
    return statusRank.find((status) => statuses.includes(status)) ?? 'idle'
  }
  const eventCountFor = (nodeIds: Set<string>) => executionStore.timeline.filter((event) => event.nodeId && nodeIds.has(event.nodeId)).length
  const allNodeIds = new Set(workflowNodes.value.map((node) => node.id))
  return [
    {
      id: 'all',
      name: 'All entry points',
      type: 'workspace',
      nodeCount: allNodeIds.size,
      eventCount: eventCountFor(allNodeIds),
      status: resolveStatus(allNodeIds),
      isActive: latestNodeEvent.value?.nodeId ? allNodeIds.has(latestNodeEvent.value.nodeId) : false,
    },
    ...timelineRootNodes.value.map((node) => {
      const nodeIds = collectTimelineDescendantIds(node.id)
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        nodeCount: nodeIds.size,
        eventCount: eventCountFor(nodeIds),
        status: resolveStatus(nodeIds),
        isActive: latestNodeEvent.value?.nodeId ? nodeIds.has(latestNodeEvent.value.nodeId) : false,
      }
    }),
  ]
})
const timelineEntryPointCount = computed(() => timelineRootNodes.value.length)

const orderedTimelineNodes = computed(() => {
  const nodesById = new Map(timelineWorkflowNodes.value.map((node) => [node.id, node]))
  const incomingCount = new Map<string, number>()
  const columnById = new Map<string, number>()
  const parentByChild = new Map<string, string | null>()
  const rootByChild = new Map<string, string>()

  for (const edge of timelineWorkflowEdges.value) {
    if (!nodesById.has(edge.source) || !nodesById.has(edge.target)) continue
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1)
  }

  const roots = timelineWorkflowNodes.value
    .filter((node) => !incomingCount.has(node.id))
    .sort((a, b) => Number(a.type !== 'trigger') - Number(b.type !== 'trigger') || a.positionY - b.positionY)

  const assignColumn = (nodeId: string, column: number, parentId: string | null, rootId: string, path = new Set<string>()) => {
    if (path.has(nodeId)) return
    const node = nodesById.get(nodeId)
    if (!node) return
    columnById.set(nodeId, Math.max(columnById.get(nodeId) ?? 0, column))
    if (!parentByChild.has(nodeId)) parentByChild.set(nodeId, parentId)
    if (!rootByChild.has(nodeId)) rootByChild.set(nodeId, rootId)
    const nextPath = new Set(path)
    nextPath.add(nodeId)
    for (const childId of childIdsByParent.value.get(nodeId) ?? []) {
      if (!nodesById.has(childId)) continue
      assignColumn(childId, column + 1, nodeId, rootId, nextPath)
    }
  }

  roots.forEach((node) => assignColumn(node.id, 0, null, node.id))
  timelineWorkflowNodes.value.forEach((node) => assignColumn(
    node.id,
    columnById.get(node.id) ?? 0,
    parentByChild.get(node.id) ?? null,
    rootByChild.get(node.id) ?? node.id,
  ))

  const placements: WorkflowTimelinePlacement[] = timelineWorkflowNodes.value.map((node) => ({
    id: node.id,
    parentId: parentByChild.get(node.id) ?? null,
    rootId: rootByChild.get(node.id) ?? node.id,
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
      const parentPlacements = (parentIdsByChild.value.get(placement.id) ?? [])
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
        const childPlacements = (childIdsByParent.value.get(placement.id) ?? [])
          .map((childId) => placementById.get(childId))
          .filter((child): child is WorkflowTimelinePlacement => child !== undefined)
        if (childPlacements.length <= 1) continue
        placement.lane = childPlacements.reduce((sum, child) => sum + child.lane, 0) / childPlacements.length
      }
    }
  }

  const alignLinearChains = () => {
    const ordered = [...placements].sort((a, b) => a.column - b.column)
    for (const placement of ordered) {
      const parentPlacements = (parentIdsByChild.value.get(placement.id) ?? [])
        .map((parentId) => placementById.get(parentId))
        .filter((parent): parent is WorkflowTimelinePlacement => parent !== undefined)
      if (parentPlacements.length !== 1) continue

      const parent = parentPlacements[0]!
      const parentChildPlacements = (childIdsByParent.value.get(parent.id) ?? [])
        .map((childId) => placementById.get(childId))
        .filter((child): child is WorkflowTimelinePlacement => child !== undefined)
      if (parentChildPlacements.length !== 1) continue

      placement.lane = parent.lane
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
  alignLinearChains()
  separateColumnCollisions()
  centerSplitsFromChildren()
  alignLinearChains()
  separateColumnCollisions()

  const orderedPlacements = [...placements].sort((a, b) => a.column - b.column || a.lane - b.lane || a.positionY - b.positionY)
  const normalizedLaneByValue = new Map(
    [...new Set(orderedPlacements.map((node) => node.lane))]
      .sort((a, b) => a - b)
      .map((lane, index) => [lane, index]),
  )
  return orderedPlacements.map((placement, index) => ({
    ...nodesById.get(placement.id)!,
    lane: normalizedLaneByValue.get(placement.lane) ?? 0,
    column: placement.column,
    color: TIMELINE_COLORS[index % TIMELINE_COLORS.length] ?? '#4f8cff',
    parentId: placement.parentId,
    rootId: placement.rootId,
  }))
})

const timelineNodes = computed<WorkflowTimelineNode[]>(() =>
  orderedTimelineNodes.value.map((node, index) => {
    const state = executionStore.nodeStatuses[node.id]
    const events = executionStore.timeline.filter((event) => event.nodeId === node.id)
    const latestEvent = events.at(-1)
    const duration = state?.startedAt && state?.endedAt ? state.endedAt - state.startedAt : undefined
    const childCount = timelineWorkflowEdges.value.filter((edge) => edge.source === node.id).length
    const isTrace = traceNodeIds.value.has(node.id)
    return {
      ...node,
      index,
      status: state?.status ?? latestEvent?.status ?? 'idle',
      duration,
      childCount,
      isActive: activeTimelineNodeId.value === node.id,
      isTrace,
      isDimmed: traceNodeIds.value.size > 0 && !isTrace,
      eventCount: events.length,
      latestLabel: latestEvent?.label ?? 'No execution event',
    }
  }),
)

const hoveredTimelineNode = computed(() =>
  hoveredTimelineNodeId.value
    ? timelineNodes.value.find((node) => node.id === hoveredTimelineNodeId.value) ?? null
    : null,
)

const traceNodeIds = computed(() => {
  const anchorId = traceTimelineNodeId.value ?? hoveredTimelineNodeId.value
  if (!anchorId) return new Set<string>()

  const parentIdsByChild = new Map<string, string[]>()
  const childIdsByParent = new Map<string, string[]>()
  for (const edge of timelineWorkflowEdges.value) {
    const parents = parentIdsByChild.get(edge.target) ?? []
    parents.push(edge.source)
    parentIdsByChild.set(edge.target, parents)
    const children = childIdsByParent.get(edge.source) ?? []
    children.push(edge.target)
    childIdsByParent.set(edge.source, children)
  }

  const visited = new Set<string>([anchorId])
  const visit = (nodeId: string, map: Map<string, string[]>) => {
    for (const nextId of map.get(nodeId) ?? []) {
      if (visited.has(nextId)) continue
      visited.add(nextId)
      visit(nextId, map)
    }
  }
  visit(anchorId, parentIdsByChild)
  visit(anchorId, childIdsByParent)
  return visited
})

const timelineStats = computed(() => {
  const passed = timelineNodes.value.filter((node) => node.status !== 'idle').length
  const success = timelineNodes.value.filter((node) => node.status === 'success').length
  const failed = timelineNodes.value.filter((node) => node.status === 'failed').length
  const waiting = timelineNodes.value.filter((node) => node.status === 'waiting' || node.status === 'retrying').length
  return { passed, success, failed, waiting }
})

const timelineDepthColumns = computed(() => {
  const maxColumn = Math.max(0, ...timelineNodes.value.map((node) => node.column))
  return Array.from({ length: maxColumn + 1 }, (_, column) => ({
    column,
    label: column === 0 ? 'Trigger' : `Depth ${column}`,
    count: timelineNodes.value.filter((node) => node.column === column).length,
  }))
})

const timelineBranchLanes = computed<WorkflowTimelineLane[]>(() => {
  const lanes = [...new Set(timelineNodes.value.map((node) => node.lane))]
    .sort((a, b) => a - b)
  const rootLanes = timelineNodes.value
    .filter((node) => node.parentId === null)
    .map((node) => node.lane)

  return lanes.map((lane) => {
    const nearestRootLane = rootLanes.reduce((nearest, rootLane) => {
      if (nearest === undefined) return rootLane
      return Math.abs(rootLane - lane) < Math.abs(nearest - lane) ? rootLane : nearest
    }, undefined as number | undefined)
    const rootIndex = nearestRootLane === undefined ? -1 : lanes.indexOf(nearestRootLane)
    const laneIndex = lanes.indexOf(lane)
    const offsetFromRoot = rootIndex === -1 ? laneIndex : Math.abs(laneIndex - rootIndex)

    return {
      lane,
      label: `Lane ${offsetFromRoot + 1}`,
      isRoot: offsetFromRoot === 0,
      isActive: timelineNodes.value.some((node) => node.lane === lane && node.isActive),
    }
  })
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
  const playheadX = timelinePlayheadDragX.value ?? TIMELINE_CONTENT_LEFT + column * TIMELINE_COLUMN_WIDTH + 52
  return { '--workflow-timeline-playhead-x': `${playheadX}px` }
})

const timelineTrackStyle = computed(() => {
  const maxLane = Math.max(0, ...timelineNodes.value.map((node) => node.lane))
  const maxColumn = Math.max(0, ...timelineNodes.value.map((node) => node.column))
  return {
    ...playheadStyle.value,
    '--workflow-timeline-column-width': `${TIMELINE_COLUMN_WIDTH}px`,
    '--workflow-timeline-content-left': `${TIMELINE_CONTENT_LEFT}px`,
    '--workflow-timeline-lane-height': `${TIMELINE_LANE_HEIGHT}px`,
    '--workflow-timeline-track-width': `${maxColumn * TIMELINE_COLUMN_WIDTH + TIMELINE_BLOCK_WIDTH + TIMELINE_CONTENT_LEFT + 40}px`,
    '--workflow-timeline-track-height': `${maxLane * TIMELINE_LANE_HEIGHT + TIMELINE_TRACK_TOP + 56}px`,
  }
})

const timelineConnectors = computed<WorkflowTimelineConnector[]>(() => {
  const nodesById = new Map(timelineNodes.value.map((node) => [node.id, node]))
  return timelineWorkflowEdges.value.flatMap((edge) => {
    const source = nodesById.get(edge.source)
    const target = nodesById.get(edge.target)
    if (!source || !target) return []

    const sourceX = TIMELINE_CONTENT_LEFT + source.column * TIMELINE_COLUMN_WIDTH + TIMELINE_BLOCK_WIDTH
    const targetX = TIMELINE_CONTENT_LEFT + target.column * TIMELINE_COLUMN_WIDTH
    const sourceY = 18 + source.lane * TIMELINE_LANE_HEIGHT + 14
    const targetY = 18 + target.lane * TIMELINE_LANE_HEIGHT + 14
    const middleX = sourceX + Math.max(18, (targetX - sourceX) / 2)

    return [{
      id: edge.id,
      path: `M ${sourceX} ${sourceY} H ${middleX} V ${targetY} H ${targetX}`,
      isPassed: source.status !== 'idle' && target.status !== 'idle',
      status: target.status,
    }]
  })
})

function formatDuration(duration: number | undefined) {
  if (duration === undefined) return '...'
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

function durationLabel(duration: number | undefined) {
  if (duration === undefined) return ''
  return formatDuration(duration)
}

function iconForNodeType(type: string) {
  if (type === 'workspace') return 'boxes'
  if (type === 'trigger') return 'play'
  if (type === 'http') return 'globe-2'
  if (type === 'code') return 'code-2'
  if (type === 'return') return 'corner-down-left'
  if (type === 'if') return 'git-branch'
  if (type === 'switch') return 'git-branch-plus'
  if (type === 'set') return 'list-plus'
  return 'box'
}

function selectTimelineEntry(entryId: string) {
  selectedTimelineEntryId.value = entryId
  clearTimelineInteraction()
}

function focusTimelineFromCanvasNode(nodeId: string | null) {
  if (!nodeId) return
  const entryId = timelineRootNodes.value.find((root) =>
    collectTimelineDescendantIds(root.id).has(nodeId),
  )?.id
  if (entryId) selectedTimelineEntryId.value = entryId
  traceTimelineNodeId.value = nodeId
  setTimelineCursorToNode(nodeId)
}

function selectTimelineNode(nodeId: string) {
  traceTimelineNodeId.value = nodeId
  setTimelineCursorToNode(nodeId)
  emit('nodeSelect', nodeId)
}

function focusTimelineNode(nodeId: string) {
  traceTimelineNodeId.value = nodeId
  emit('nodeFocus', nodeId)
}

function hoverTimelineNode(nodeId: string | null) {
  hoveredTimelineNodeId.value = nodeId
  emit('nodeHover', nodeId)
}

function positionTimelineTooltip(event: MouseEvent) {
  timelineTooltipX.value = event.clientX + 12
  timelineTooltipY.value = event.clientY + 12
}

function scrollTimelineNodeIntoView(nodeId: string) {
  const scroller = timelineTrackRef.value
  const nodeElement = scroller
    ?.querySelector<HTMLElement>(`[data-workflow-timeline-node-id="${CSS.escape(nodeId)}"]`)
  if (!scroller || !nodeElement) return

  const padding = 24
  const left = nodeElement.offsetLeft
  const right = left + nodeElement.offsetWidth
  const top = nodeElement.offsetTop
  const bottom = top + nodeElement.offsetHeight
  const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
  const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  let nextLeft = scroller.scrollLeft
  let nextTop = scroller.scrollTop

  if (left < scroller.scrollLeft + padding) nextLeft = left - padding
  else if (right > scroller.scrollLeft + scroller.clientWidth - padding) nextLeft = right - scroller.clientWidth + padding

  if (top < scroller.scrollTop + padding) nextTop = top - padding
  else if (bottom > scroller.scrollTop + scroller.clientHeight - padding) nextTop = bottom - scroller.clientHeight + padding

  scroller.scrollTo({
    left: Math.min(maxLeft, Math.max(0, nextLeft)),
    top: Math.min(maxTop, Math.max(0, nextTop)),
    behavior: 'smooth',
  })
}

function setTimelineCursorToNode(nodeId: string) {
  const index = orderedTimelineNodes.value.findIndex((node) => node.id === nodeId)
  if (index !== -1) timelineCursorIndex.value = index
}

function setTimelineCursorToDepth(column: number) {
  const index = orderedTimelineNodes.value.findIndex((node) => node.column === column)
  if (index === -1) return
  timelineCursorIndex.value = index
  traceTimelineNodeId.value = orderedTimelineNodes.value[index]?.id ?? null
}

function getTimelineSnapColumnFromClientX(clientX: number) {
  const track = timelineTrackRef.value?.querySelector<HTMLElement>('.workflow-timeline__track')
  if (!track || timelineDepthColumns.value.length === 0) return null
  const rect = track.getBoundingClientRect()
  const rawColumn = Math.round((clientX - rect.left - TIMELINE_CONTENT_LEFT - 52) / TIMELINE_COLUMN_WIDTH)
  const columns = timelineDepthColumns.value.map((depth) => depth.column)
  return columns.reduce((closest, column) => (
    Math.abs(column - rawColumn) < Math.abs(closest - rawColumn) ? column : closest
  ), columns[0] ?? 0)
}

function setTimelinePlayheadDragX(clientX: number) {
  const track = timelineTrackRef.value?.querySelector<HTMLElement>('.workflow-timeline__track')
  if (!track) return
  const rect = track.getBoundingClientRect()
  const minX = TIMELINE_CONTENT_LEFT + 52
  const maxX = Math.max(minX, rect.width - 36)
  timelinePlayheadDragX.value = Math.min(maxX, Math.max(minX, clientX - rect.left))
}

function getTimelinePlayheadDragClientX() {
  const track = timelineTrackRef.value?.querySelector<HTMLElement>('.workflow-timeline__track')
  if (!track || timelinePlayheadDragX.value === null) return null
  return track.getBoundingClientRect().left + timelinePlayheadDragX.value
}

function moveTimelineCursor(delta: number) {
  if (timelineNodes.value.length === 0) return
  const activeIndex = timelineCursorIndex.value ?? timelineNodes.value.findIndex((node) => node.id === activeTimelineNodeId.value)
  const nextIndex = Math.min(timelineNodes.value.length - 1, Math.max(0, Math.max(0, activeIndex) + delta))
  timelineCursorIndex.value = nextIndex
  traceTimelineNodeId.value = timelineNodes.value[nextIndex]?.id ?? null
}

function handleTimelineKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  moveTimelineCursor(event.key === 'ArrowRight' ? 1 : -1)
}

function stopTimelinePlayheadDrag() {
  if (!isDraggingTimelinePlayhead.value) return
  const dragClientX = getTimelinePlayheadDragClientX()
  const snapColumn = dragClientX === null ? null : getTimelineSnapColumnFromClientX(dragClientX)
  if (snapColumn !== null) setTimelineCursorToDepth(snapColumn)
  timelinePlayheadDragX.value = null
  isDraggingTimelinePlayhead.value = false
  window.removeEventListener('pointermove', handleTimelinePlayheadDrag)
  window.removeEventListener('pointerup', stopTimelinePlayheadDrag)
  window.removeEventListener('pointercancel', stopTimelinePlayheadDrag)
}

function handleTimelinePlayheadDrag(event: PointerEvent) {
  if (!isDraggingTimelinePlayhead.value) return
  event.preventDefault()
  setTimelinePlayheadDragX(event.clientX)
}

function startTimelinePlayheadDrag(event: PointerEvent) {
  event.preventDefault()
  isDraggingTimelinePlayhead.value = true
  setTimelinePlayheadDragX(event.clientX)
  window.addEventListener('pointermove', handleTimelinePlayheadDrag)
  window.addEventListener('pointerup', stopTimelinePlayheadDrag, { once: true })
  window.addEventListener('pointercancel', stopTimelinePlayheadDrag, { once: true })
}

function clearTimelineInteraction() {
  hoveredTimelineNodeId.value = null
  traceTimelineNodeId.value = null
  timelineCursorIndex.value = null
  emit('nodeHover', null)
  emit('nodeClear')
}

function resetTimelineCursorForExecution() {
  traceTimelineNodeId.value = null
  timelineCursorIndex.value = null
  timelinePlayheadDragX.value = null
}

watch(
  () => [executionStore.activeExecutionId, executionStore.activeSessionId] as const,
  ([executionId, sessionId], [previousExecutionId, previousSessionId]) => {
    if (!executionId && !sessionId) return
    if (executionId === previousExecutionId && sessionId === previousSessionId) return
    resetTimelineCursorForExecution()
  },
)

watch(
  () => executionStore.timeline.at(-1)?.id ?? null,
  (latestEventId, previousLatestEventId) => {
    if (!latestEventId || latestEventId === previousLatestEventId) return
    if (latestTimelineEntryId.value) selectedTimelineEntryId.value = latestTimelineEntryId.value
    resetTimelineCursorForExecution()
  },
)

watch(
  () => executionStore.hasActiveExecution,
  (hasActiveExecution, hadActiveExecution) => {
    if (hasActiveExecution || !hadActiveExecution) return
    resetTimelineCursorForExecution()
  },
)

watch(timelineEntryPoints, (entryPoints) => {
  if (entryPoints.some((entry) => entry.id === selectedTimelineEntryId.value)) return
  selectedTimelineEntryId.value = 'all'
})

watch(
  () => props.focusedNodeId,
  (nodeId) => focusTimelineFromCanvasNode(nodeId ?? null),
  { immediate: true },
)

watch(activeTimelineNodeId, async (nodeId) => {
  await nextTick()
  scrollTimelineNodeIntoView(nodeId)
})

onBeforeUnmount(() => {
  stopTimelinePlayheadDrag()
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
      <aside class="workflow-timeline__entries" aria-label="Timeline entry points">
        <div class="workflow-timeline__entries-heading">
          <strong>Entry Points</strong>
          <code>{{ timelineEntryPointCount }}</code>
        </div>
        <div class="workflow-timeline__entries-list">
          <button
            v-for="entry in timelineEntryPoints"
            :key="entry.id"
            class="workflow-timeline__entry"
            :class="{
              'workflow-timeline__entry--selected': selectedTimelineEntryId === entry.id,
              'workflow-timeline__entry--active': entry.isActive,
              [`workflow-timeline__entry--${entry.status}`]: true,
            }"
            type="button"
            @click="selectTimelineEntry(entry.id)"
          >
            <LucideIcon :name="iconForNodeType(entry.type)" :size="14" />
            <span>{{ entry.name }}</span>
            <code>{{ entry.nodeCount }} nodes</code>
            <small>{{ entry.eventCount }} events</small>
          </button>
        </div>
      </aside>
      <div ref="timelineTrackRef" class="workflow-timeline__scroll">
        <div
          class="workflow-timeline__track"
          :style="timelineTrackStyle"
          tabindex="0"
          @keydown="handleTimelineKeydown"
          @click.self="clearTimelineInteraction"
        >
          <span
            class="workflow-timeline__playhead"
            :class="{ 'workflow-timeline__playhead--dragging': isDraggingTimelinePlayhead }"
            aria-hidden="true"
          />
          <button
            class="workflow-timeline__playhead-handle"
            :class="{ 'workflow-timeline__playhead-handle--dragging': isDraggingTimelinePlayhead }"
            type="button"
            aria-label="Move timeline cursor"
            @pointerdown.stop="startTimelinePlayheadDrag"
          />
          <div v-if="timelineNodes.length" class="workflow-timeline__depth-grid" @click.self="clearTimelineInteraction">
            <span
              v-for="depth in timelineDepthColumns"
              :key="depth.column"
              class="workflow-timeline__depth-column"
              :style="{ '--workflow-timeline-depth-x': `${depth.column * TIMELINE_COLUMN_WIDTH}px` }"
              @click.stop="setTimelineCursorToDepth(depth.column)"
            >
              <code>{{ depth.label }}</code>
              <small>{{ depth.count }}</small>
            </span>
          </div>
          <div v-if="timelineNodes.length" class="workflow-timeline__lanes" aria-hidden="true">
            <span
              v-for="lane in timelineBranchLanes"
              :key="lane.lane"
              class="workflow-timeline__lane"
              :class="{
                'workflow-timeline__lane--root': lane.isRoot,
                'workflow-timeline__lane--active': lane.isActive,
              }"
              :style="{ '--workflow-timeline-lane-y': `${lane.lane * TIMELINE_LANE_HEIGHT}px` }"
            >
              <code>{{ lane.label }}</code>
            </span>
          </div>
          <div class="workflow-timeline__plane" @click.self="clearTimelineInteraction">
            <svg class="workflow-timeline__connectors" aria-hidden="true">
              <path
                v-for="connector in timelineConnectors"
                :key="connector.id"
                class="workflow-timeline__connector"
                :class="[
                  `workflow-timeline__connector--${connector.status}`,
                  { 'workflow-timeline__connector--passed': connector.isPassed },
                ]"
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
                { 'workflow-timeline__clip--trace': node.isTrace },
                { 'workflow-timeline__clip--dimmed': node.isDimmed },
              ]"
              :data-workflow-timeline-node-id="node.id"
              role="button"
              tabindex="0"
              :style="{
                '--workflow-timeline-x': `${node.column * TIMELINE_COLUMN_WIDTH}px`,
                '--workflow-timeline-y': `${node.lane * TIMELINE_LANE_HEIGHT}px`,
                '--workflow-timeline-color': node.color,
              }"
              @click="selectTimelineNode(node.id)"
              @dblclick.stop="focusTimelineNode(node.id)"
              @mouseenter="(event) => { hoverTimelineNode(node.id); positionTimelineTooltip(event) }"
              @mousemove="positionTimelineTooltip"
              @mouseleave="hoverTimelineNode(null)"
              @keydown.enter.prevent="selectTimelineNode(node.id)"
              @keydown.space.prevent="selectTimelineNode(node.id)"
            >
              <LucideIcon :name="iconForNodeType(node.type)" :size="14" />
              <span>{{ node.name }}</span>
              <code v-if="durationLabel(node.duration)" class="workflow-timeline__duration">
                {{ durationLabel(node.duration) }}
              </code>
              <code v-else class="workflow-timeline__status">{{ node.status }}</code>
            </div>
          </div>
          <div
            v-if="hoveredTimelineNode"
            class="workflow-timeline__tooltip"
            role="tooltip"
            :style="{
              '--workflow-timeline-tooltip-x': `${timelineTooltipX}px`,
              '--workflow-timeline-tooltip-y': `${timelineTooltipY}px`,
            }"
          >
            <strong>{{ hoveredTimelineNode.name }}</strong>
            <span>{{ hoveredTimelineNode.latestLabel }}</span>
            <dl>
              <div><dt>Status</dt><dd>{{ hoveredTimelineNode.status }}</dd></div>
              <div><dt>Duration</dt><dd>{{ durationLabel(hoveredTimelineNode.duration) || 'No data' }}</dd></div>
              <div><dt>Events</dt><dd>{{ hoveredTimelineNode.eventCount }}</dd></div>
              <div><dt>Outputs</dt><dd>{{ hoveredTimelineNode.childCount }}</dd></div>
            </dl>
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

.workflow-timeline {
  grid-template-columns: 220px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.workflow-timeline__entries {
  display: grid;
  grid-template-rows: 28px minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--fabric-workbench-border);
  background: var(--fabric-workflow-timeline-entry-bg, var(--fabric-workbench-panel-bg));
}

.workflow-timeline__entries-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-border-muted);
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
}

.workflow-timeline__entries-heading code {
  color: var(--fabric-text-muted);
  font-size: 10px;
}

.workflow-timeline__entries-list {
  min-height: 0;
  overflow: auto;
}

.workflow-timeline__entry {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  grid-template-rows: 18px 14px;
  align-items: center;
  gap: 0 7px;
  width: 100%;
  min-height: 38px;
  padding: 3px 10px;
  border-bottom: 1px solid var(--fabric-border-muted);
  border-left: 2px solid transparent;
  color: var(--fabric-text-secondary);
  font-size: 11px;
  text-align: left;
}

.workflow-timeline__entry:hover,
.workflow-timeline__entry--selected {
  background: var(--fabric-button-ghost-hover);
  color: var(--fabric-text-primary);
}

.workflow-timeline__entry--active {
  border-left-color: var(--fabric-workflow-timeline-playhead, var(--fabric-accent));
}

.workflow-timeline__entry--running,
.workflow-timeline__entry--retrying {
  border-left-color: var(--fabric-workflow-timeline-clip-running-border, var(--fabric-status-running-border));
}

.workflow-timeline__entry--success {
  border-left-color: var(--fabric-workflow-timeline-clip-success-border, var(--fabric-status-success-border));
}

.workflow-timeline__entry--failed {
  border-left-color: var(--fabric-workflow-timeline-clip-error-border, var(--fabric-status-error-border));
}

.workflow-timeline__entry svg {
  grid-row: 1 / span 2;
}

.workflow-timeline__entry span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-timeline__entry code,
.workflow-timeline__entry small {
  color: var(--fabric-text-muted);
  font-size: 10px;
}

.workflow-timeline__entry small {
  grid-column: 2 / span 2;
}

.workflow-timeline__scroll {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.workflow-timeline__track {
  position: relative;
  --workflow-timeline-plane-top: max(18px, calc((100% - var(--workflow-timeline-track-height, 120px)) / 2));
  width: var(--workflow-timeline-track-width, 100%);
  min-width: 100%;
  height: var(--workflow-timeline-track-height, 120px);
  min-height: 100%;
  padding: 18px 36px;
  user-select: none;
}

.workflow-timeline__depth-grid,
.workflow-timeline__lanes {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.workflow-timeline__depth-grid {
  z-index: 0;
  pointer-events: auto;
}

.workflow-timeline__lanes {
  z-index: 1;
  pointer-events: none;
}

.workflow-timeline__depth-column {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--workflow-timeline-content-left, 76px) + var(--workflow-timeline-depth-x, 0px));
  width: var(--workflow-timeline-column-width, 132px);
  border-left: 1px solid var(--fabric-workflow-timeline-depth-border, var(--fabric-border-muted));
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
}

.workflow-timeline__depth-column:hover {
  background: var(--fabric-workflow-timeline-lane-active-bg, transparent);
}

.workflow-timeline__depth-column code,
.workflow-timeline__depth-column small,
.workflow-timeline__lane code {
  position: absolute;
  color: var(--fabric-workflow-timeline-muted-text, var(--fabric-text-muted));
  font-family: var(--fabric-font-mono);
  font-size: 9px;
  line-height: 1;
  opacity: 0.56;
  text-transform: uppercase;
}

.workflow-timeline__depth-column code {
  top: 9px;
  left: 8px;
}

.workflow-timeline__depth-column small {
  top: 9px;
  right: 8px;
}

.workflow-timeline__lane {
  position: absolute;
  right: 0;
  left: 0;
  top: calc(var(--workflow-timeline-plane-top, 18px) + 11px + var(--workflow-timeline-lane-y, 0px));
  height: var(--workflow-timeline-lane-height, 42px);
  border-top: 1px solid var(--fabric-workflow-timeline-lane-border, var(--fabric-border-muted));
  border-bottom: 1px solid var(--fabric-workflow-timeline-lane-border, var(--fabric-border-muted));
}

.workflow-timeline__lane--root {
  border-top-color: var(--fabric-workflow-timeline-lane-root-border, var(--fabric-border-strong));
}

.workflow-timeline__lane--active {
  background: var(--fabric-workflow-timeline-lane-active-bg, transparent);
}

.workflow-timeline__lane code {
  top: 15px;
  left: 8px;
  width: calc(var(--workflow-timeline-content-left, 76px) - 18px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-timeline__plane {
  position: absolute;
  top: var(--workflow-timeline-plane-top);
  left: 0;
  width: var(--workflow-timeline-track-width, 100%);
  height: var(--workflow-timeline-track-height, 120px);
}

.workflow-timeline__playhead {
  position: absolute;
  top: 8px;
  bottom: 0;
  left: var(--workflow-timeline-playhead-x, 128px);
  z-index: 5;
  width: 2px;
  background: var(--fabric-workflow-timeline-playhead, var(--fabric-accent));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--fabric-workflow-timeline-playhead, var(--fabric-accent)) 42%, transparent);
  cursor: grab;
  pointer-events: none;
  touch-action: none;
  transition: left 180ms linear;
}

.workflow-timeline__playhead--dragging {
  transition: none;
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

.workflow-timeline__playhead-handle {
  position: absolute;
  top: 3px;
  left: var(--workflow-timeline-playhead-x, 128px);
  z-index: 50;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  transform: translateX(-50%);
  background: transparent;
  cursor: grab;
  touch-action: none;
}

.workflow-timeline__playhead-handle--dragging {
  cursor: grabbing;
}

.workflow-timeline__connectors {
  position: absolute;
  inset: 0;
  z-index: 2;
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

.workflow-timeline__connector--passed {
  stroke: var(--fabric-workflow-timeline-trail, var(--fabric-accent));
  stroke-width: 2;
  opacity: 0.82;
}

.workflow-timeline__connector--success.workflow-timeline__connector--passed {
  stroke: var(--fabric-workflow-timeline-clip-success-border, var(--fabric-status-success-border));
}

.workflow-timeline__connector--failed.workflow-timeline__connector--passed,
.workflow-timeline__connector--cancelled.workflow-timeline__connector--passed {
  stroke: var(--fabric-workflow-timeline-clip-error-border, var(--fabric-status-error-border));
}

.workflow-timeline__connector--waiting.workflow-timeline__connector--passed,
.workflow-timeline__connector--retrying.workflow-timeline__connector--passed {
  stroke: var(--fabric-workflow-timeline-clip-waiting-border, var(--fabric-border-brand));
}

.workflow-timeline__connector--running.workflow-timeline__connector--passed {
  stroke: var(--fabric-workflow-timeline-clip-running-border, var(--fabric-status-running-border));
}

.workflow-timeline__clip {
  position: absolute;
  top: calc(18px + var(--workflow-timeline-y, 0px));
  left: calc(var(--workflow-timeline-content-left, 76px) + var(--workflow-timeline-x, 0px));
  z-index: 4;
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
  cursor: pointer;
  transition:
    transform var(--fabric-duration-fast) var(--fabric-ease-standard),
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.workflow-timeline__clip--success {
  outline: 2px solid var(--fabric-workflow-timeline-clip-success-border, var(--fabric-status-success-border));
  outline-offset: 1px;
}

.workflow-timeline__clip--failed {
  outline: 2px solid var(--fabric-workflow-timeline-clip-error-border, var(--fabric-status-error-border));
  outline-offset: 1px;
}

.workflow-timeline__clip--waiting,
.workflow-timeline__clip--retrying {
  outline: 2px solid var(--fabric-workflow-timeline-clip-waiting-border, var(--fabric-border-brand));
  outline-offset: 1px;
}

.workflow-timeline__clip--running {
  outline: 2px solid var(--fabric-workflow-timeline-clip-running-border, var(--fabric-status-running-border));
  outline-offset: 1px;
}

.workflow-timeline__clip--active {
  transform: translateY(-2px);
  background: var(--fabric-workflow-timeline-clip-active-bg, var(--fabric-bg-elevated));
  box-shadow: inset 0 0 0 1px var(--fabric-accent);
}

.workflow-timeline__clip--trace {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fabric-accent) 72%, transparent);
}

.workflow-timeline__clip--dimmed {
  opacity: 0.38;
}

.workflow-timeline__clip:hover,
.workflow-timeline__clip:focus-visible {
  z-index: 40;
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

.workflow-timeline__duration {
  min-width: 32px;
  padding: 2px 4px;
  border: 1px solid var(--fabric-workflow-timeline-duration-border, var(--fabric-border-muted));
  border-radius: 2px;
  background: var(--fabric-workflow-timeline-duration-bg, var(--fabric-bg-muted));
  color: var(--fabric-workflow-timeline-duration-text, var(--fabric-text-primary)) !important;
  text-align: center;
}

.workflow-timeline__tooltip {
  position: fixed;
  top: var(--workflow-timeline-tooltip-y, 0);
  left: var(--workflow-timeline-tooltip-x, 0);
  z-index: 100;
  display: grid;
  gap: 6px;
  width: 220px;
  padding: 8px;
  border: 1px solid var(--fabric-workflow-timeline-tooltip-border, var(--fabric-border));
  border-radius: 4px;
  background: var(--fabric-workflow-timeline-tooltip-bg, var(--fabric-workbench-panel-bg));
  color: var(--fabric-text-primary);
  box-shadow: var(--fabric-shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.32));
  pointer-events: none;
  opacity: 1;
}

.workflow-timeline__tooltip strong,
.workflow-timeline__tooltip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-timeline__tooltip span {
  color: var(--fabric-text-secondary);
  font-size: 11px;
}

.workflow-timeline__tooltip dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 8px;
  margin: 0;
}

.workflow-timeline__tooltip div {
  min-width: 0;
}

.workflow-timeline__tooltip dt {
  color: var(--fabric-text-muted);
  font-size: 9px;
  text-transform: uppercase;
}

.workflow-timeline__tooltip dd {
  margin: 1px 0 0;
  overflow: hidden;
  color: var(--fabric-text-primary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-timeline__status {
  color: var(--fabric-workflow-timeline-muted-text, var(--fabric-text-muted)) !important;
}
</style>
