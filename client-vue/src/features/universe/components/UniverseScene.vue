<template>
  <div ref="containerRef" class="universe-scene" aria-hidden="true" @contextmenu.prevent></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { createGalaxySystem, type GalaxySystem } from '../systems/galaxySystem'
import { createPluginNodeSystem, type PluginNodeSystem } from '../systems/pluginNodeSystem'
import type { UniversePluginNode } from '../types/universe.types'

const emit = defineEmits<{
  ready: []
  selectNode: [nodeId: string]
}>()

const props = defineProps<{
  nodes: UniversePluginNode[]
  focusedNode?: UniversePluginNode | null
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let galaxy: GalaxySystem | null = null
let pluginNodes: PluginNodeSystem | null = null
let animationFrame = 0
let pointerX = 0
let pointerY = 0
let yaw = 0
let pitch = -0.28
let isDragging = false
let isPanning = false
let lastPointerX = 0
let lastPointerY = 0
let dragStartX = 0
let dragStartY = 0
const pressedKeys = new Set<string>()
const cameraTarget = new THREE.Vector3(0, 0, 0)
const desiredCameraPosition = new THREE.Vector3()
const focusPosition = new THREE.Vector3()
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const forwardVector = new THREE.Vector3()
const rightVector = new THREE.Vector3()
const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ')

function getForwardVector() {
  cameraEuler.set(pitch, yaw, 0)
  return forwardVector.set(0, 0, -1).applyEuler(cameraEuler).normalize()
}

function getRightVector() {
  return rightVector.crossVectors(getForwardVector(), camera?.up ?? new THREE.Vector3(0, 1, 0)).normalize()
}

function clampCameraAwayFromCore() {
  if (!camera) return
  const minDistance = 15
  if (camera.position.length() < minDistance) {
    camera.position.setLength(minDistance)
  }
}

function resize() {
  if (!containerRef.value || !renderer || !camera) return

  const { width, height } = containerRef.value.getBoundingClientRect()
  const safeHeight = Math.max(height, 1)

  camera.aspect = Math.max(width, 1) / safeHeight
  camera.updateProjectionMatrix()
  renderer.setSize(width, safeHeight, false)
}

function animate() {
  if (!renderer || !scene || !camera || !galaxy) return

  const elapsed = performance.now() * 0.001

  galaxy.root.rotation.y += 0.0009
  galaxy.root.rotation.z = Math.sin(performance.now() * 0.00012) * 0.035
  galaxy.update(elapsed)

  const moveSpeed = 0.42
  const panSpeed = 0.18
  const forward = getForwardVector()
  const right = getRightVector()

  if (pressedKeys.has('w') || pressedKeys.has('arrowup')) camera.position.addScaledVector(forward, moveSpeed)
  if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) camera.position.addScaledVector(forward, -moveSpeed)
  if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) camera.position.addScaledVector(right, -panSpeed)
  if (pressedKeys.has('d') || pressedKeys.has('arrowright')) camera.position.addScaledVector(right, panSpeed)
  if (pressedKeys.has('e')) camera.position.y += panSpeed
  if (pressedKeys.has('q')) camera.position.y -= panSpeed

  if (props.focusedNode) {
    focusPosition.set(
      props.focusedNode.position.x,
      props.focusedNode.position.y,
      props.focusedNode.position.z,
    )
    const outward = focusPosition.clone().normalize()
    desiredCameraPosition.copy(focusPosition).add(outward.multiplyScalar(7))
    desiredCameraPosition.y += 3.2

    if (desiredCameraPosition.length() < 8) {
      desiredCameraPosition.setLength(8)
    }

    cameraTarget.lerp(focusPosition, 0.04)
    if (!isDragging && pressedKeys.size === 0) {
      camera.position.lerp(desiredCameraPosition, 0.025)
    }
  } else {
    cameraTarget.copy(camera.position).add(forward)
  }

  clampCameraAwayFromCore()
  camera.lookAt(cameraTarget)
  pluginNodes?.update(elapsed, camera, props.focusedNode?.id ?? null)

  renderer.render(scene, camera)
  animationFrame = window.requestAnimationFrame(animate)
}

function handlePointerMove(event: PointerEvent) {
  if (!containerRef.value) return

  const bounds = containerRef.value.getBoundingClientRect()
  pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
  pointerY = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2

  if (!isDragging || !camera) return

  const deltaX = event.clientX - lastPointerX
  const deltaY = event.clientY - lastPointerY
  lastPointerX = event.clientX
  lastPointerY = event.clientY

  if (isPanning) {
    camera.position.addScaledVector(getRightVector(), -deltaX * 0.018)
    camera.position.y += deltaY * 0.018
    return
  }

  yaw -= deltaX * 0.004
  pitch = THREE.MathUtils.clamp(pitch - deltaY * 0.003, -1.15, 0.72)
}

function handleWheel(event: WheelEvent) {
  if (!camera) return
  camera.position.addScaledVector(getForwardVector(), event.deltaY * 0.026)
  clampCameraAwayFromCore()
}

function handlePointerDown(event: PointerEvent) {
  if (!containerRef.value) return
  isDragging = true
  isPanning = event.shiftKey || event.button === 2
  lastPointerX = event.clientX
  lastPointerY = event.clientY
  dragStartX = event.clientX
  dragStartY = event.clientY
  try {
    containerRef.value.setPointerCapture(event.pointerId)
  } catch {
    // Pointer capture can fail when the browser starts the event outside the scene.
  }
}

function handlePointerUp(event: PointerEvent) {
  if (!containerRef.value || !camera) return

  const dragDistance = Math.abs(event.clientX - dragStartX) + Math.abs(event.clientY - dragStartY)
  isDragging = false
  isPanning = false
  try {
    containerRef.value.releasePointerCapture(event.pointerId)
  } catch {
    // Capture may already be released by the browser.
  }

  if (dragDistance > 3 || !pluginNodes) return

  const bounds = containerRef.value.getBoundingClientRect()
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const node = pluginNodes.pick(raycaster)
  if (node) {
    emit('selectNode', node.id)
  }
}

function handleKeyDown(event: KeyboardEvent) {
  pressedKeys.add(event.key.toLowerCase())
}

function handleKeyUp(event: KeyboardEvent) {
  pressedKeys.delete(event.key.toLowerCase())
}

function rebuildPluginNodes() {
  if (!scene) return

  if (pluginNodes) {
    scene.remove(pluginNodes.root)
    pluginNodes.dispose()
  }

  pluginNodes = createPluginNodeSystem(props.nodes)
  scene.add(pluginNodes.root)
}

function initScene() {
  if (!containerRef.value) return

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#03050b', 0.006)

  camera = new THREE.PerspectiveCamera(58, 1, 0.1, 280)
  camera.position.set(38, 5.5, -24)
  yaw = -0.82
  pitch = -0.08

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x03050b, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  containerRef.value.appendChild(renderer.domElement)

  galaxy = createGalaxySystem()
  galaxy.root.rotation.x = -0.08
  scene.add(galaxy.root)
  rebuildPluginNodes()

  resize()
  animate()
  emit('ready')
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('wheel', handleWheel, { passive: true })
})

watch(
  () => props.nodes,
  () => {
    rebuildPluginNodes()
  },
  { deep: false },
)

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('wheel', handleWheel)

  if (galaxy && scene) {
    scene.remove(galaxy.root)
    galaxy.dispose()
  }

  if (pluginNodes && scene) {
    scene.remove(pluginNodes.root)
    pluginNodes.dispose()
  }

  renderer?.dispose()
  renderer?.domElement.remove()
  galaxy = null
  pluginNodes = null
  renderer = null
  scene = null
  camera = null
})
</script>
