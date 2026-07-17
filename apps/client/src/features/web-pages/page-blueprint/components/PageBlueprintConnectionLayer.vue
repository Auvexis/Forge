<template>
  <svg class="web-page-blueprint-connections" aria-hidden="true">
    <path
      v-for="edge in renderedConnections"
      :key="edge.id"
      class="web-page-blueprint-connections__path"
      :d="edge.path"
      vector-effect="non-scaling-stroke"
    />
    <path
      v-if="pendingPath"
      class="web-page-blueprint-connections__path web-page-blueprint-connections__path--pending"
      :d="pendingPath"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BaseCanvasPoint } from '@/shared/base-canvas/index.ts'
import type { PageBlueprintConnection, PageBlueprintConnectionEndpoint } from '../pageBlueprintSchema.ts'

export interface PageBlueprintConnectionField {
  id: string
}

export interface PageBlueprintConnectionNode {
  id: string
  x: number
  y: number
  width: number
  fields: PageBlueprintConnectionField[]
}

const HEADER_HEIGHT = 34
const FIELD_HEIGHT = 32
const FIELD_CENTER_Y = 16

const props = withDefaults(defineProps<{
  nodes: PageBlueprintConnectionNode[]
  connections: PageBlueprintConnection[]
  pendingOutput?: PageBlueprintConnectionEndpoint | null
  pointer?: BaseCanvasPoint | null
}>(), {
  pendingOutput: null,
  pointer: null,
})

const nodesById = computed(() => new Map(props.nodes.map((node) => [node.id, node])))

const renderedConnections = computed(() =>
  props.connections
    .map((connection) => {
      const from = portPoint(connection.from, 'output')
      const to = portPoint(connection.to, 'input')
      if (!from || !to) return null
      return {
        id: connection.id,
        path: connectionPath(from, to),
      }
    })
    .filter((edge): edge is { id: string; path: string } => Boolean(edge)),
)

const pendingPath = computed(() => {
  if (!props.pendingOutput || !props.pointer) return ''
  const from = portPoint(props.pendingOutput, 'output')
  return from ? connectionPath(from, props.pointer) : ''
})

function portPoint(endpoint: PageBlueprintConnectionEndpoint, side: 'input' | 'output'): BaseCanvasPoint | null {
  const node = nodesById.value.get(endpoint.nodeId)
  if (!node) return null
  const fieldIndex = node.fields.findIndex((field) => field.id === endpoint.fieldId)
  if (fieldIndex < 0) return null
  return {
    x: side === 'output' ? node.x + node.width : node.x,
    y: node.y + HEADER_HEIGHT + FIELD_CENTER_Y + fieldIndex * FIELD_HEIGHT,
  }
}

function connectionPath(from: BaseCanvasPoint, to: BaseCanvasPoint) {
  const distance = Math.abs(to.x - from.x)
  const handle = Math.max(48, Math.min(180, distance * 0.48))
  return `M ${from.x} ${from.y} C ${from.x + handle} ${from.y}, ${to.x - handle} ${to.y}, ${to.x} ${to.y}`
}
</script>
