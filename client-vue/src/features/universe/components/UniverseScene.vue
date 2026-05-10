<template>
  <div ref="containerRef" class="universe-scene" aria-hidden="true"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { createGalaxySystem, type GalaxySystem } from '../systems/galaxySystem'

const emit = defineEmits<{
  ready: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let galaxy: GalaxySystem | null = null
let animationFrame = 0
let pointerX = 0
let pointerY = 0

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

  camera.position.x += (pointerX * 1.8 - camera.position.x) * 0.018
  camera.position.y += (6.4 + pointerY * 0.9 - camera.position.y) * 0.018
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
  animationFrame = window.requestAnimationFrame(animate)
}

function handlePointerMove(event: PointerEvent) {
  if (!containerRef.value) return

  const bounds = containerRef.value.getBoundingClientRect()
  pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
  pointerY = -((event.clientY - bounds.top) / bounds.height - 0.5) * 2
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
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resize)
  window.removeEventListener('pointermove', handlePointerMove)

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
