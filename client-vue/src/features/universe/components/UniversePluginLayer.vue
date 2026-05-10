<template>
  <div class="universe-plugin-layer" aria-label="Plugin orbit nodes">
    <button
      v-for="(node, index) in nodes"
      :key="node.id"
      :ref="(element) => setNodeRef(element, index)"
      class="universe-plugin-node"
      :style="{ '--node-color': node.color }"
      type="button"
      :aria-label="`Focus ${node.label}`"
      @click="$emit('select', node.id)"
    >
      <span class="universe-plugin-node__icon">
        <UniversePluginIcon :icon="node.icon" :fallback="node.plugin.manifest.metadata.style?.icon" />
      </span>
      <span class="universe-plugin-node__label">{{ node.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import type { UniversePluginNode } from '../types/universe.types'
import UniversePluginIcon from './UniversePluginIcon.vue'

const props = defineProps<{
  nodes: UniversePluginNode[]
  focusedNodeId?: string | null
}>()

defineEmits<{
  select: [nodeId: string]
}>()

const nodeElements: Array<HTMLButtonElement | null> = []
let animationFrame = 0

function setNodeRef(element: unknown, index: number) {
  nodeElements[index] = element instanceof HTMLButtonElement ? element : null
}

function updateNodeElement(node: UniversePluginNode, element: HTMLButtonElement, index: number, time: number) {
  const angle = node.orbitOffset + time * node.orbitSpeed
  const depth = (Math.sin(angle) + 1) / 2
  const orbitScale = Math.min(node.orbitRadius / 15, 1)
  const x = 50 + Math.cos(angle) * (22 + orbitScale * 18)
  const y = 52 + Math.sin(angle * 0.82 + index * 0.16) * (8 + orbitScale * 9) + node.position.y * 3
  const isFocused = props.focusedNodeId === node.id
  const isNearby = isFocused || depth > 0.42
  const isCulled = !isFocused && depth < 0.12
  const scale = isNearby ? 0.72 + depth * 0.48 : 0.36
  const opacity = isCulled ? 0 : isNearby ? 0.55 + depth * 0.45 : 0.34

  element.style.transform = `translate3d(${x}vw, ${y}vh, 0) translate(-50%, -50%) scale(${scale})`
  element.style.opacity = String(opacity)
  element.style.zIndex = String(Math.round(10 + depth * 30 + (isFocused ? 40 : 0)))
  element.classList.toggle('universe-plugin-node--particle', !isNearby)
  element.classList.toggle('universe-plugin-node--focused', isFocused)
  element.setAttribute('aria-hidden', isCulled ? 'true' : 'false')
  element.tabIndex = isCulled ? -1 : 0
}

function animate() {
  const time = performance.now() * 0.001

  props.nodes.forEach((node, index) => {
    const element = nodeElements[index]
    if (!element) return
    updateNodeElement(node, element, index, time)
  })

  animationFrame = window.requestAnimationFrame(animate)
}

watch(
  () => props.nodes,
  () => {
    nodeElements.length = props.nodes.length
  },
)

onMounted(() => {
  animate()
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame)
})
</script>
