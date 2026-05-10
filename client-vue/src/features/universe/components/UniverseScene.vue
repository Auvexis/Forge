<template>
  <div class="universe-scene-wrapper">
    <div ref="containerRef" class="universe-scene" aria-hidden="true" @contextmenu.prevent></div>
    <div v-if="isFlyMode" class="fly-crosshair"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createGalaxySystem, type GalaxySystem } from '../systems/galaxySystem'
import { createPluginNodeSystem, type PluginNodeSystem } from '../systems/pluginNodeSystem'
import type { UniversePluginNode } from '../types/universe.types'

// ─── Props / Emits ────────────────────────────────────────────────────────────

const emit = defineEmits<{
  ready: []
  selectNode: [nodeId: string | null]
}>()

const props = defineProps<{
  nodes: UniversePluginNode[]
  focusedNode?: UniversePluginNode | null
}>()

// ─── Three.js state ───────────────────────────────────────────────────────────

const containerRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let bloomPass: UnrealBloomPass | null = null
let bokehPass: BokehPass | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let galaxy: GalaxySystem | null = null
let pluginNodes: PluginNodeSystem | null = null
let animationFrame = 0

// ─── Camera state ─────────────────────────────────────────────────────────────

// Position above the disk plane, angled down — mirrors reference lookAt(0,0,0)
const INITIAL_CAM_POS = new THREE.Vector3(0, 28, 55)
const INITIAL_YAW = Math.PI // facing galactic center
const INITIAL_PITCH = -0.46 // angled down to see the spiral disk

let yaw = INITIAL_YAW
let pitch = INITIAL_PITCH
let isDragging = false
let isPanning = false
let lastPtrX = 0
let lastPtrY = 0
let dragStartX = 0
let dragStartY = 0

const pressedKeys = new Set<string>()
const cameraTarget = new THREE.Vector3()
const cameraVelocity = new THREE.Vector3()
const isFlyMode = ref(false)
const desiredPos = new THREE.Vector3()
const focusPos = new THREE.Vector3()
const forwardVec = new THREE.Vector3()
const rightVec = new THREE.Vector3()
const upVec = new THREE.Vector3(0, 1, 0)
const focusOrbitOffset = new THREE.Vector3()
const cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ')
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

// ─── Camera helpers ───────────────────────────────────────────────────────────

function getForward(): THREE.Vector3 {
  cameraEuler.set(pitch, yaw, 0)
  return forwardVec.set(0, 0, -1).applyEuler(cameraEuler).normalize()
}

function getRight(): THREE.Vector3 {
  return rightVec.crossVectors(getForward(), upVec).normalize()
}

function clampFromCore() {
  if (!camera) return
  const minLen = props.focusedNode ? 6 : 14
  const maxLen = 145
  const len = camera.position.length()
  if (len < minLen) {
    camera.position.setLength(minLen)
  } else if (len > maxLen) {
    camera.position.setLength(maxLen)
  }
}

// ─── Resize ───────────────────────────────────────────────────────────────────

function resize() {
  if (!containerRef.value || !renderer || !camera || !composer) return
  const { width, height } = containerRef.value.getBoundingClientRect()
  const w = Math.max(width, 1)
  const h = Math.max(height, 1)

  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
  composer.setSize(w, h)

  // Update bloom resolution
  bloomPass?.setSize(w, h)

  // Update DoF focus distance based on distance to galaxy center
  if (bokehPass && camera) {
    const focusDist = camera.position.length()
    ;(bokehPass as any).uniforms['focus'].value = focusDist
  }
}

// ─── Animation loop ───────────────────────────────────────────────────────────

function animate() {
  if (!renderer || !scene || !camera || !galaxy || !composer) return
  animationFrame = window.requestAnimationFrame(animate)

  const elapsed = performance.now() * 0.001

  galaxy.root.rotation.y += 0.00045
  galaxy.root.rotation.z = Math.sin(elapsed * 0.07) * 0.018
  galaxy.update(elapsed)

  const MOVE_ACCEL = 0.015
  const PAN_ACCEL = 0.006
  const DAMPING = 0.9
  const fwd = getForward()
  const rgt = getRight()

  if (pressedKeys.has('escape')) {
    emit('selectNode', null)
    pressedKeys.delete('escape')
  }

  if (!props.focusedNode) {
    if (pressedKeys.has('w') || pressedKeys.has('arrowup'))
      cameraVelocity.addScaledVector(fwd, MOVE_ACCEL)
    if (pressedKeys.has('s') || pressedKeys.has('arrowdown'))
      cameraVelocity.addScaledVector(fwd, -MOVE_ACCEL)
    if (pressedKeys.has('a') || pressedKeys.has('arrowleft'))
      cameraVelocity.addScaledVector(rgt, -PAN_ACCEL)
    if (pressedKeys.has('d') || pressedKeys.has('arrowright'))
      cameraVelocity.addScaledVector(rgt, PAN_ACCEL)
    if (pressedKeys.has('e')) cameraVelocity.y += PAN_ACCEL
    if (pressedKeys.has('q')) cameraVelocity.y -= PAN_ACCEL

    camera.position.add(cameraVelocity)
    cameraVelocity.multiplyScalar(DAMPING)
  } else {
    cameraVelocity.set(0, 0, 0)
  }

  // Focus mode
  if (props.focusedNode) {
    focusPos.set(
      props.focusedNode.position.x,
      props.focusedNode.position.y,
      props.focusedNode.position.z,
    )
    desiredPos.copy(focusPos).add(focusOrbitOffset)
    if (desiredPos.length() < 8) desiredPos.setLength(8)

    const distTarget = cameraTarget.distanceTo(focusPos)
    const targetLerp = Math.min(0.038, 2.4 / Math.max(distTarget, 1))
    cameraTarget.lerp(focusPos, targetLerp)

    const distPos = camera.position.distanceTo(desiredPos)
    const posLerp = Math.min(0.035, 1.4 / Math.max(distPos, 1))
    camera.position.lerp(desiredPos, posLerp)
  } else {
    cameraTarget.copy(camera.position).add(fwd)
  }

  clampFromCore()
  camera.lookAt(cameraTarget)

  // ── Update DoF focus distance dynamically ──
  // When free-flying: focus on galaxy core (distance to origin)
  // When focused on a node: focus on the node
  if (bokehPass) {
    const targetFocusDist = props.focusedNode
      ? camera.position.distanceTo(focusPos)
      : camera.position.length() * 0.55 // focus roughly at 55% depth toward core
    const currentFocus = (bokehPass as any).uniforms['focus'].value as number
    ;(bokehPass as any).uniforms['focus'].value =
      currentFocus + (targetFocusDist - currentFocus) * 0.04
  }

  pluginNodes?.update(elapsed, camera, props.focusedNode?.id ?? null)

  // Use composer instead of renderer.render — applies bloom then DoF
  composer.render()
}

// ─── Input handlers ───────────────────────────────────────────────────────────

function handlePointerMove(event: PointerEvent) {
  if ((!isDragging && !isFlyMode.value) || !camera) return
  const dx = isFlyMode.value ? event.movementX : event.clientX - lastPtrX
  const dy = isFlyMode.value ? event.movementY : event.clientY - lastPtrY
  lastPtrX = event.clientX
  lastPtrY = event.clientY

  if (props.focusedNode) {
    const euler = new THREE.Euler(0, -dx * 0.006, 0, 'YXZ')
    focusOrbitOffset.applyEuler(euler)

    const right = new THREE.Vector3().crossVectors(focusOrbitOffset, upVec).normalize()
    focusOrbitOffset.applyAxisAngle(right, -dy * 0.006)

    const maxH = focusOrbitOffset.length() * 0.98
    if (focusOrbitOffset.y > maxH) focusOrbitOffset.y = maxH
    if (focusOrbitOffset.y < -maxH) focusOrbitOffset.y = -maxH
    return
  }

  if (isPanning) {
    cameraVelocity.addScaledVector(getRight(), -dx * 0.0035)
    cameraVelocity.y += dy * 0.0035
    return
  }
  yaw -= dx * 0.0035
  pitch = THREE.MathUtils.clamp(pitch - dy * 0.0028, -1.18, 0.75)
}

function handleWheel(event: WheelEvent) {
  if (!camera) return
  if (props.focusedNode) {
    const scale = event.deltaY > 0 ? 1.15 : 0.85
    focusOrbitOffset.multiplyScalar(scale)
    if (focusOrbitOffset.length() < 3.5) focusOrbitOffset.setLength(3.5)
    if (focusOrbitOffset.length() > 40) focusOrbitOffset.setLength(40)
    return
  }
  cameraVelocity.addScaledVector(getForward(), -event.deltaY * 0.003)
}

function handlePointerDown(event: PointerEvent) {
  if (!containerRef.value) return
  isDragging = true
  isPanning = event.shiftKey || event.button === 2
  lastPtrX = event.clientX
  lastPtrY = event.clientY
  dragStartX = event.clientX
  dragStartY = event.clientY
  try {
    containerRef.value.setPointerCapture(event.pointerId)
  } catch {
    /* ignored */
  }
}

function handlePointerUp(event: PointerEvent) {
  if (!containerRef.value || !camera) return
  const dragDist = Math.abs(event.clientX - dragStartX) + Math.abs(event.clientY - dragStartY)
  isDragging = false
  isPanning = false
  try {
    containerRef.value.releasePointerCapture(event.pointerId)
  } catch {
    /* ignored */
  }

  if (!isFlyMode.value && dragDist > 4) return
  if (!pluginNodes) return

  if (isFlyMode.value) {
    pointer.x = 0
    pointer.y = 0
  } else {
    const bounds = containerRef.value.getBoundingClientRect()
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
  }
  
  raycaster.setFromCamera(pointer, camera)
  const node = pluginNodes.pick(raycaster)
  if (node) {
    emit('selectNode', node.id)
  } else {
    emit('selectNode', null)
  }
}

function handleKeyDown(e: KeyboardEvent) {
  const key = e.key.toLowerCase()
  pressedKeys.add(key)
  if (key === 'f') {
    if (!containerRef.value) return
    if (document.pointerLockElement === containerRef.value) {
      document.exitPointerLock()
    } else {
      containerRef.value.requestPointerLock()
    }
  }
  if (key === ' ' || key === 'spacebar') {
    if (isFlyMode.value) {
      emit('selectNode', null)
    }
  }
}
function handleKeyUp(e: KeyboardEvent) {
  pressedKeys.delete(e.key.toLowerCase())
}

// ─── Scene init ───────────────────────────────────────────────────────────────

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
  const { width, height } = containerRef.value.getBoundingClientRect()
  const w = Math.max(width, 1)
  const h = Math.max(height, 1)

  // ── Scene ────────────────────────────────────────────────────────────────
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#000008', 0.0016)

  // ── Camera ───────────────────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(72, w / h, 0.08, 600)
  camera.position.copy(INITIAL_CAM_POS)
  yaw = INITIAL_YAW
  pitch = INITIAL_PITCH

  // ── Renderer ─────────────────────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000008, 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8))
  renderer.setSize(w, h, false)
  containerRef.value.appendChild(renderer.domElement)

  // ── Post-processing ───────────────────────────────────────────────────────
  composer = new EffectComposer(renderer)

  // 1) Base scene render
  composer.addPass(new RenderPass(scene, camera))

  // 2) Bloom — concentrated on bright core region
  //    strength: how much bloom; radius: spread; threshold: only bright pixels bloom
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(w, h),
    1.15, // strength
    0.55, // radius
    0.22, // threshold — bright white core particles trigger bloom
  )
  composer.addPass(bloomPass)

  // 3) Depth of Field — subtle bokeh blur on out-of-focus areas
  //    focus: distance to sharp plane; aperture: blur strength; maxblur: cap
  bokehPass = new BokehPass(scene, camera, {
    focus: camera.position.length() * 0.55,
    aperture: 0.00004, // very subtle — galaxy still readable
    maxblur: 0.004,
  })
  composer.addPass(bokehPass)

  // 4) Tone-mapping / output
  composer.addPass(new OutputPass())

  // ── Galaxy + nodes ────────────────────────────────────────────────────────
  galaxy = createGalaxySystem()
  galaxy.root.rotation.x = -0.12
  scene.add(galaxy.root)

  rebuildPluginNodes()
  animate()
  emit('ready')
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  initScene()
  window.addEventListener('resize', resize)
  document.addEventListener('pointerlockchange', onPointerLockChange)
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerdown', handlePointerDown)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('wheel', handleWheel, { passive: true })
})

function onPointerLockChange() {
  isFlyMode.value = document.pointerLockElement === containerRef.value
}

watch(
  () => props.nodes,
  () => rebuildPluginNodes(),
  { deep: false },
)

watch(
  () => props.focusedNode,
  (node) => {
    if (node) {
      focusPos.set(node.position.x, node.position.y, node.position.z)
      const outward = focusPos.clone().normalize()
      focusOrbitOffset.copy(outward).multiplyScalar(5.5)
      focusOrbitOffset.y += 2.2

      if (camera) {
        cameraEuler.setFromQuaternion(camera.quaternion, 'YXZ')
        yaw = cameraEuler.y
        pitch = cameraEuler.x
        const distToNode = camera.position.distanceTo(focusPos)
        cameraTarget.copy(camera.position).add(getForward().clone().multiplyScalar(distToNode))
      }
    } else if (camera) {
      // Sync internal yaw/pitch so the camera doesn't snap when unfocused
      cameraEuler.setFromQuaternion(camera.quaternion, 'YXZ')
      yaw = cameraEuler.y
      pitch = cameraEuler.x
    }
  }
)

onBeforeUnmount(() => {
  window.cancelAnimationFrame(animationFrame)
  window.removeEventListener('resize', resize)
  document.removeEventListener('pointerlockchange', onPointerLockChange)
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

  composer?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()

  galaxy = pluginNodes = renderer = composer = bloomPass = bokehPass = scene = camera = null
})
</script>

<style scoped>
.universe-scene-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}
.universe-scene {
  width: 100%;
  height: 100%;
}
.fly-crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.9);
}
</style>
