<template>
  <svg class="web-page-blueprint-connections" aria-hidden="true">
    <g
      v-for="edge in renderedConnections"
      :key="edge.id"
      class="web-page-blueprint-connections__edge"
      :class="{ 'web-page-blueprint-connections__edge--active': activeConnectionId === edge.id }"
      @mouseenter="activeConnectionId = edge.id"
      @mouseleave="clearActiveConnection(edge.id)"
      @focusin="activeConnectionId = edge.id"
    >
      <path
        class="web-page-blueprint-connections__hit-path"
        :d="edge.path"
        vector-effect="non-scaling-stroke"
        tabindex="0"
        @pointerdown.stop="activeConnectionId = edge.id"
        @dblclick.stop="$emit('removeConnection', edge.id)"
      />
      <path
        class="web-page-blueprint-connections__path"
        :d="edge.path"
        vector-effect="non-scaling-stroke"
      />
    </g>
    <path
      v-if="pendingPath"
      class="web-page-blueprint-connections__path web-page-blueprint-connections__path--pending"
      :d="pendingPath"
      vector-effect="non-scaling-stroke"
    />
  </svg>
  <div
    v-for="edge in renderedConnections"
    :key="`${edge.id}:toolbar`"
    class="web-page-blueprint-edge-toolbar"
    :class="{ 'web-page-blueprint-edge-toolbar--active': activeConnectionId === edge.id }"
    :style="{ transform: `translate(${edge.toolbar.x}px, ${edge.toolbar.y}px)` }"
    data-base-canvas-no-drag
    @mouseenter="activeConnectionId = edge.id"
    @mouseleave="clearActiveConnection(edge.id)"
  >
    <button type="button" title="Delete connection" @click.stop="$emit('removeConnection', edge.id)">
      <LucideIcon name="trash-2" :size="12" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BaseCanvasPoint } from '@/shared/base-canvas/index.ts'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlueprintConnection, PageBlueprintConnectionEndpoint } from '../pageBlueprintSchema.ts'

export interface PageBlueprintConnectionField {
  id: string
}

export interface PageBlueprintConnectionNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  fields: PageBlueprintConnectionField[]
}

const HEADER_HEIGHT = 34
const INPUT_PORT_OFFSET_X = 9
const OUTPUT_PORT_OFFSET_X = 9

const props = withDefaults(defineProps<{
  nodes: PageBlueprintConnectionNode[]
  connections: PageBlueprintConnection[]
  portPoints?: Record<string, BaseCanvasPoint>
  pendingOutput?: PageBlueprintConnectionEndpoint | null
  pointer?: BaseCanvasPoint | null
}>(), {
  portPoints: () => ({}),
  pendingOutput: null,
  pointer: null,
})

defineEmits<{
  removeConnection: [connectionId: string]
}>()

const nodesById = computed(() => new Map(props.nodes.map((node) => [node.id, node])))
const activeConnectionId = ref<string | null>(null)

const renderedConnections = computed(() =>
  props.connections
    .map((connection) => {
      const from = portPoint(connection.from, 'output')
      const to = portPoint(connection.to, 'input')
      if (!from || !to) return null
      return {
        id: connection.id,
        path: connectionPath(from, to),
        toolbar: midpoint(from, to),
      }
    })
    .filter((edge): edge is { id: string; path: string; toolbar: BaseCanvasPoint } => Boolean(edge)),
)

const pendingPath = computed(() => {
  if (!props.pendingOutput || !props.pointer) return ''
  const from = portPoint(props.pendingOutput, 'output')
  return from ? connectionPath(from, props.pointer) : ''
})

function portPoint(endpoint: PageBlueprintConnectionEndpoint, side: 'input' | 'output'): BaseCanvasPoint | null {
  const measuredPoint = props.portPoints[portKey(endpoint, side)]
  if (measuredPoint) return measuredPoint
  const node = nodesById.value.get(endpoint.nodeId)
  if (!node) return null
  const fieldIndex = node.fields.findIndex((field) => field.id === endpoint.fieldId)
  if (fieldIndex < 0) return null
  return {
    x: side === 'output' ? node.x + node.width - OUTPUT_PORT_OFFSET_X : node.x + INPUT_PORT_OFFSET_X,
    y: node.y + fieldCenterY(node, fieldIndex),
  }
}

function portKey(endpoint: PageBlueprintConnectionEndpoint, side: 'input' | 'output') {
  return `${endpoint.nodeId}:${endpoint.fieldId}:${side}`
}

function fieldCenterY(node: PageBlueprintConnectionNode, fieldIndex: number) {
  const bodyHeight = Math.max(0, node.height - HEADER_HEIGHT)
  const fieldHeight = node.fields.length > 0 ? bodyHeight / node.fields.length : 0
  return HEADER_HEIGHT + fieldHeight * fieldIndex + fieldHeight / 2
}

function midpoint(from: BaseCanvasPoint, to: BaseCanvasPoint): BaseCanvasPoint {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  }
}

function connectionPath(from: BaseCanvasPoint, to: BaseCanvasPoint) {
  const distance = Math.abs(to.x - from.x)
  const handle = Math.max(48, Math.min(180, distance * 0.48))
  return `M ${from.x} ${from.y} C ${from.x + handle} ${from.y}, ${to.x - handle} ${to.y}, ${to.x} ${to.y}`
}

function clearActiveConnection(connectionId: string) {
  if (activeConnectionId.value === connectionId) activeConnectionId.value = null
}
</script>
