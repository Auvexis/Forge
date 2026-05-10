<template>
  <div ref="containerRef" class="universe-scene" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { createGalaxySystem, type GalaxySystem } from '../systems/galaxySystem'
import type { UniversePluginNode } from '../types/universe.types'

const emit = defineEmits<{
  ready: []
}>()

const props = defineProps<{
  focusedNode?: UniversePluginNode | null
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let galaxy: GalaxySystem | null = null
let animationFrame = 0
let pointerX = 0
let pointerY = 0
let cameraDistance = 18
const cameraTarget = new THREE.Vector3(0, 0, 0)
const overviewTarget = new THREE.Vector3(0, 0, 0)
const desiredCameraPosition = new THREE.Vector3(0, 6.4, cameraDistance)
const focusPosition = new THREE.Vector3()

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

  galaxy.root.rotation.y += 0.0009
  galaxy.root.rotation.z = Math.sin(performance.now() * 0.00012) * 0.035

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
    camera.position.lerp(desiredCameraPosition, 0.035)
  } else {
    desiredCameraPosition.set(pointerX * 1.8, 6.4 + pointerY * 0.9, cameraDistance)
    cameraTarget.lerp(overviewTarget, 0.035)
    camera.position.lerp(desiredCameraPosition, 0.024)
  }

  camera.lookAt(cameraTarget)

  renderer.render(scene, camera)
  animationFrame = window.requestAnimationFrame(animate)
}

function handlePointerMove(event: PointerEvent) {
  if (!containerRef.value) return

  const bounds = containerRef.value.getBoundingClientRect()
  pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
  pointerY = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2
}

function handleWheel(event: WheelEvent) {
  cameraDistance = THREE.MathUtils.clamp(cameraDistance + event.deltaY * 0.006, 13, 24)
}

function initScene() {
  if (!containerRef.value) return

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#03050b', 0.035)

  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 120)
  camera.position.set(0, 6.4, 18)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x03050b, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  containerRef.value.appendChild(renderer.domElement)

  galaxy = createGalaxySystem()
  galaxy.root.rotation.x = -0.16
  scene.add(galaxy.root)

  resize()
  animate()
  emit('ready')
}

onMounted(() => {
  initScene()
  window.addEventListener('resize', resize)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('wheel', handleWheel, { passive: true })
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('wheel', handleWheel)

  if (galaxy && scene) {
    scene.remove(galaxy.root)
    galaxy.dispose()
  }

  renderer?.dispose()
  renderer?.domElement.remove()
  galaxy = null
  renderer = null
  scene = null
  camera = null
})
</script>
