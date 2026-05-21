<template>
  <div class="plugin-creator-canvas">
    <VueFlow
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :default-zoom="1"
      :min-zoom="0.4"
      :max-zoom="1.8"
      fit-view-on-init
      :nodes-draggable="true"
      :nodes-connectable="true"
      :elements-selectable="true"
      class="plugin-creator-canvas__flow"
      @node-click="onNodeClick"
    >
      <Background
        :gap="20"
        :size="1"
        variant="dots"
        color="var(--sailor-canvas-grid)"
        :style="{ 'background-color': 'var(--sailor-canvas-bg)' }"
      />

      <svg style="position: absolute; width: 0; height: 0" aria-hidden="true">
        <defs>
          <marker
            v-for="marker in edgeMarkers"
            :id="marker.id"
            :key="marker.id"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 2 2 L 10 6 L 2 10 z"
              :fill="marker.color"
              :stroke="marker.color"
              stroke-width="2"
              stroke-linejoin="round"
            />
          </marker>
        </defs>
      </svg>

      <template #edge-plugin-creator-edge="edgeProps">
        <PluginCreatorEdge v-bind="edgeProps" />
      </template>

      <div v-if="!blueprint" class="plugin-creator-canvas__empty nodrag nopan">
        Open or create a plugin to start mapping methods.
      </div>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, type Edge, type Node, type NodeTypesObject } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import type { PluginBlueprint } from '../../../core/types/plugin-creator.types.ts'
import MethodNode from './nodes/MethodNode.vue'
import InputNode from './nodes/InputNode.vue'
import CredentialNode from './nodes/CredentialNode.vue'
import RequestNode from './nodes/RequestNode.vue'
import ResponseMapperNode from './nodes/ResponseMapperNode.vue'
import ErrorMapperNode from './nodes/ErrorMapperNode.vue'
import OutputNode from './nodes/OutputNode.vue'
import PluginCreatorEdge from '../../workflow-editor/components/BaseEdge.vue'

const props = defineProps<{
  blueprint?: PluginBlueprint | null
}>()

const emit = defineEmits<{
  'select-node': [nodeId: string]
}>()

const nodeTypes = {
  method: MethodNode,
  input: InputNode,
  credential: CredentialNode,
  request: RequestNode,
  responseMapper: ResponseMapperNode,
  errorMapper: ErrorMapperNode,
  output: OutputNode,
} as unknown as NodeTypesObject

const edgeMarkers = [
  { id: 'sailor-arrow-idle', color: 'var(--sailor-rf-arrow-stroke)' },
  { id: 'sailor-arrow-success', color: 'var(--sailor-green-500, #22c55e)' },
  { id: 'sailor-arrow-failed', color: 'var(--sailor-red-500, #ef4444)' },
  { id: 'sailor-arrow-running', color: 'var(--sailor-amber-500, #f59e0b)' },
  { id: 'sailor-arrow-selected', color: 'var(--sailor-rf-arrow-stroke-selected)' },
]

const nodes = computed<Node[]>({
  get() {
    const blueprint = props.blueprint
    if (!blueprint) return []

    return Object.values(blueprint.canvas.nodes).map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
    }))
  },
  set() {
    // Store sync lands in a later inspector/canvas task.
  },
})

const edges = computed<Edge[]>({
  get() {
    const blueprint = props.blueprint
    if (!blueprint) return []

    return blueprint.canvas.edges.map((edge) => ({
      ...edge,
      type: 'plugin-creator-edge',
    }))
  },
  set() {
    // Store sync lands in a later inspector/canvas task.
  },
})

function onNodeClick(event: { node?: Node }) {
  if (event.node?.id) {
    emit('select-node', event.node.id)
  }
}
</script>

<style scoped>
.plugin-creator-canvas {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: var(--sailor-canvas-bg, #080909);
}

.plugin-creator-canvas__flow {
  width: 100%;
  height: 100%;
}

.plugin-creator-canvas__empty {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 5;
  transform: translate(-50%, -50%);
  color: var(--sailor-text-secondary, #526173);
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
}
</style>
