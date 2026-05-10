<template>
  <div class="universe-scene-wrapper">
    <div ref="containerRef" class="universe-scene" aria-hidden="true" @contextmenu.prevent></div>
    <div v-if="isFlyMode" class="fly-crosshair"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { createGalaxySystem, type GalaxySystem } from '../systems/galaxySystem'
import { createPluginNodeSystem, type PluginNodeSystem } from '../systems/pluginNodeSystem'
import type { UniversePluginNode } from '../types/universe.types'

import skyRight from '../skybox/jettelly_space_common_black_RIGHT.png'
import skyLeft  from '../skybox/jettelly_space_common_black_LEFT.png'
import skyUp    from '../skybox/jettelly_space_common_black_UP.png'
import skyDown  from '../skybox/jettelly_space_common_black_DOWN.png'
import skyFront from '../skybox/jettelly_space_common_black_FRONT.png'
import skyBack  from '../skybox/jettelly_space_common_black_BACK.png'

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
let dustPoints: THREE.Points | null = null
let camera: THREE.PerspectiveCamera | null = null
let galaxy: GalaxySystem | null = null
let pluginNodes: PluginNodeSystem | null = null
let animationFrame = 0

// ─── Camera state ─────────────────────────────────────────────────────────────

// ── God View (default) ───────────────────────────────────────────────────────
let godOrbitAngle  = Math.PI * 0.8   // start slightly off-front
let godOrbitRadius = 90              // distance from core
let godOrbitHeight = 24              // height above disk plane
const GOD_ORBIT_SPEED = 0.00018      // radians per frame — imperceptibly slow

// ── Fly Mode ─────────────────────────────────────────────────────────────────
let yaw   = Math.PI
let pitch = -0.22
let targetYaw   = Math.PI
let targetPitch = -0.22

// ── Shared ────────────────────────────────────────────────────────────────────
let isDragging = false
let isPanning  = false
let lastPtrX   = 0
let lastPtrY   = 0
let dragStartX = 0
let dragStartY = 0

type CameraMode = 'god' | 'fly' | 'focused'
const cameraMode = ref<CameraMode>('god')
const isFlyMode  = computed(() => cameraMode.value === 'fly')

const pressedKeys      = new Set<string>()
const cameraTarget     = new THREE.Vector3()
const cameraVelocity   = new THREE.Vector3()
const desiredPos       = new THREE.Vector3()
const focusPos         = new THREE.Vector3()
const forwardVec       = new THREE.Vector3()
const rightVec         = new THREE.Vector3()
const upVec            = new THREE.Vector3(0, 1, 0)
const cameraEuler      = new THREE.Euler(0, 0, 0, 'YXZ')
const raycaster        = new THREE.Raycaster()
const pointer          = new THREE.Vector2()

// ── Focus orbit ── camera orbits around the focused (moving) plugin
// These are in the plugin's LOCAL frame, so they stay stable as the plugin orbits
let focusCamLocalAngle = 0.0  // azimuth offset relative to plugin's outward direction
let focusCamElevation  = 0.35 // elevation angle (radians)
let focusCamDist       = 10   // distance from plugin
// Remember what mode was active before entering focus so we can restore it on unfocus
let preFocusMode: CameraMode = 'god'

function getForward(): THREE.Vector3 {
  cameraEuler.set(targetPitch, targetYaw, 0)
  return forwardVec.set(0, 0, -1).applyEuler(cameraEuler).normalize()
}

function getRight(): THREE.Vector3 {
  return rightVec.crossVectors(getForward(), upVec).normalize()
}

function clampGodRadius() {
  godOrbitRadius = THREE.MathUtils.clamp(godOrbitRadius, 40, 200)
  godOrbitHeight = THREE.MathUtils.clamp(godOrbitHeight, 8, 90)
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

  galaxy.root.rotation.y += 0.000055
  galaxy.root.rotation.z = Math.sin(elapsed * 0.04) * 0.01
  galaxy.update(elapsed)

  // ── ESC always deselects ───────────────────────────────────────────────────
  if (pressedKeys.has('escape')) {
    emit('selectNode', null)
    pressedKeys.delete('escape')
  }

  if (cameraMode.value === 'god' && !props.focusedNode) {
    // ── God View: auto-orbit the core ─────────────────────────────────────
    godOrbitAngle += GOD_ORBIT_SPEED
    const godTarget = new THREE.Vector3(
      Math.cos(godOrbitAngle) * godOrbitRadius,
      godOrbitHeight,
      Math.sin(godOrbitAngle) * godOrbitRadius,
    )
    camera.position.lerp(godTarget, 0.03)
    // Smoothly rotate back to looking at core — no snap
    cameraTarget.lerp(new THREE.Vector3(0, 0, 0), 0.05)
    camera.lookAt(cameraTarget)

  } else if (cameraMode.value === 'fly' && !props.focusedNode) {
    // ── Fly View: FPS free movement ────────────────────────────────────────
    const MOVE_ACCEL = 0.007
    const PAN_ACCEL  = 0.003
    const DAMPING    = 0.88
    const fwd = getForward()
    const rgt = getRight()

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

    yaw   += (targetYaw   - yaw)   * 0.055
    pitch += (targetPitch - pitch) * 0.055
    cameraEuler.set(pitch, yaw, 0)
    camera.quaternion.setFromEuler(cameraEuler)

    camera.position.add(cameraVelocity)
    cameraVelocity.multiplyScalar(DAMPING)

    // Clamp to galaxy bounds
    const len = camera.position.length()
    if (len > 220) camera.position.setLength(220)
    if (len < 8)   camera.position.setLength(8)

    cameraTarget.copy(camera.position).add(getForward())
    camera.lookAt(cameraTarget)
  }

  // ── Focused Mode: orbits around the (moving) focused plugin ─────────────────
  if (props.focusedNode) {
    // Plugin moves every frame (it's orbiting the core) — always read latest position
    focusPos.set(
      props.focusedNode.position.x,
      props.focusedNode.position.y,
      props.focusedNode.position.z,
    )

    // Camera position in plugin-local polar coordinates.
    // pluginWorldAngle tracks the plugin's direction in XZ as it orbits.
    // focusCamLocalAngle is user-controlled — dragging left/right changes it.
    const pluginWorldAngle = Math.atan2(focusPos.z, focusPos.x)
    const camWorldAngle    = pluginWorldAngle + focusCamLocalAngle
    const horizDist        = Math.cos(focusCamElevation) * focusCamDist

    desiredPos.set(
      focusPos.x + Math.cos(camWorldAngle) * horizDist,
      focusPos.y + Math.sin(focusCamElevation) * focusCamDist,
      focusPos.z + Math.sin(camWorldAngle) * horizDist,
    )

    const distTarget = cameraTarget.distanceTo(focusPos)
    const targetLerp = Math.min(0.07, 5.0 / Math.max(distTarget, 1))
    cameraTarget.lerp(focusPos, targetLerp)

    const distPos = camera.position.distanceTo(desiredPos)
    const posLerp = Math.min(0.07, 4.0 / Math.max(distPos, 1))
    camera.position.lerp(desiredPos, posLerp)

    camera.lookAt(cameraTarget)
  }



  // DoF focus distance
  if (bokehPass) {
    const targetFocusDist = props.focusedNode
      ? camera.position.distanceTo(focusPos)
      : cameraMode.value === 'god'
        ? godOrbitRadius * 0.6
        : camera.position.length() * 0.55
    const currentFocus = (bokehPass as any).uniforms['focus'].value as number
    ;(bokehPass as any).uniforms['focus'].value =
      currentFocus + (targetFocusDist - currentFocus) * 0.04
  }

  pluginNodes?.update(elapsed, camera, props.focusedNode?.id ?? null)

  if (dustPoints && camera) {
    ;(dustPoints.material as THREE.ShaderMaterial).uniforms.camPos!.value.copy(camera.position)
  }

  composer.render()
}

// ─── Input handlers ───────────────────────────────────────────────────────────

function handlePointerMove(event: PointerEvent) {
  if (!camera) return

  const dx = isFlyMode.value ? event.movementX : event.clientX - lastPtrX
  const dy = isFlyMode.value ? event.movementY : event.clientY - lastPtrY
  lastPtrX = event.clientX
  lastPtrY = event.clientY

  // Focused: drag to orbit around the plugin
  if (props.focusedNode && (isDragging || isFlyMode.value)) {
    focusCamLocalAngle -= dx * 0.007
    focusCamElevation   = THREE.MathUtils.clamp(focusCamElevation - dy * 0.005, -1.0, 1.2)
    return
  }

  // Fly Mode: free-look
  if (isFlyMode.value) {
    targetYaw   -= dx * 0.0035
    targetPitch  = THREE.MathUtils.clamp(targetPitch - dy * 0.0028, -1.18, 0.75)
    return
  }

  // God View + dragging: adjust orbit angle & height
  if (cameraMode.value === 'god' && isDragging) {
    godOrbitAngle  -= dx * 0.005
    godOrbitHeight -= dy * 0.3
    clampGodRadius()
    return
  }
}


function handleWheel(event: WheelEvent) {
  if (!camera) return
  if (props.focusedNode) {
    const scale = event.deltaY > 0 ? 1.12 : 0.88
    focusCamDist = THREE.MathUtils.clamp(focusCamDist * scale, 2.5, 35)
    return
  }
  if (cameraMode.value === 'god') {
    godOrbitRadius += event.deltaY * 0.08
    clampGodRadius()
    return
  }
  // fly mode: push forward
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

  // F: toggle Fly Mode on/off
  if (key === 'f') {
    if (cameraMode.value === 'fly') {
      // Exit fly mode — return to god view
      document.exitPointerLock()
      cameraMode.value = 'god'
    } else if (!props.focusedNode) {
      // Enter fly mode from god view
      if (!containerRef.value) return
      // Sync fly camera to current god view position before switching
      yaw   = godOrbitAngle + Math.PI
      pitch = -0.18
      targetYaw   = yaw
      targetPitch = pitch
      cameraMode.value = 'fly'
      containerRef.value.requestPointerLock()
    }
  }

  // Space: unfocus (any mode) or deselect
  if (key === ' ' || key === 'spacebar') {
    if (props.focusedNode) {
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
  scene.fog = new THREE.FogExp2('#000000', 0.006)  // pitch black fog, very dense

  const cubeTextureLoader = new THREE.CubeTextureLoader()
  scene.background = cubeTextureLoader.load([
    skyRight,
    skyLeft,
    skyUp,
    skyDown,
    skyFront,
    skyBack
  ])

  // ── Camera ───────────────────────────────────────────────────────────────
  camera = new THREE.PerspectiveCamera(72, w / h, 0.08, 600)
  // Start in God View position
  camera.position.set(
    Math.cos(godOrbitAngle) * godOrbitRadius,
    godOrbitHeight,
    Math.sin(godOrbitAngle) * godOrbitRadius,
  )
  camera.lookAt(0, 0, 0)

  // ── Renderer ─────────────────────────────────────────────────────────────
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 1)  // absolute black background
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
    0.5,  // very low — only the core glows, space stays dark
    0.3,
    0.35, // high threshold — only near-white pixels bloom
  )
  composer.addPass(bloomPass)

  // 3) Depth of Field — subtle bokeh blur on out-of-focus areas
  //    focus: distance to sharp plane; aperture: blur strength; maxblur: cap
  bokehPass = new BokehPass(scene, camera, {
    focus: camera.position.length() * 0.55,
    aperture: 0.000018, // very subtle — softer bokeh, scene stays sharp
    maxblur: 0.0015,
  })
  composer.addPass(bokehPass)

  // 4) Tone-mapping / output
  composer.addPass(new OutputPass())

  // ── Galaxy + nodes ────────────────────────────────────────────────────────
  galaxy = createGalaxySystem()
  galaxy.root.rotation.x = -0.12
  scene.add(galaxy.root)

  // ── Space Dust ────────────────────────────────────────────────────────────
  const DUST_COUNT = 1500
  const dustPositions = new Float32Array(DUST_COUNT * 3)
  for(let i=0; i<DUST_COUNT*3; i++) dustPositions[i] = (Math.random() - 0.5) * 80

  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))

  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      camPos: { value: new THREE.Vector3() }
    },
    vertexShader: `
      uniform vec3 camPos;
      void main() {
        vec3 pos = position;
        vec3 diff = pos - camPos;
        float range = 80.0;
        float halfRange = 40.0;
        
        diff.x = mod(diff.x + halfRange, range) - halfRange;
        diff.y = mod(diff.y + halfRange, range) - halfRange;
        diff.z = mod(diff.z + halfRange, range) - halfRange;
        
        vec4 mvPosition = viewMatrix * vec4(camPos + diff, 1.0);
        gl_PointSize = (1.5 / -mvPosition.z) * 12.0;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      void main() {
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float ll = length(xy);
        if(ll > 0.5) discard;
        gl_FragColor = vec4(1.0, 1.0, 1.0, (0.5 - ll) * 0.35);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  dustPoints = new THREE.Points(dustGeo, dustMat)
  scene.add(dustPoints)

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
  const locked = document.pointerLockElement === containerRef.value
  if (!locked && cameraMode.value === 'fly') {
    cameraMode.value = 'god'
  }
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
      // Remember current mode so we can return to it when unfocusing
      if (cameraMode.value !== 'focused') {
        preFocusMode = cameraMode.value
      }

      focusPos.set(node.position.x, node.position.y, node.position.z)

      // Initialize camera local angle from current camera position relative to plugin
      // so there's no jump when entering focus mode
      if (camera) {
        const pluginWorldAngle = Math.atan2(focusPos.z, focusPos.x)
        const toCam = camera.position.clone().sub(focusPos)
        const camWorldAngle = Math.atan2(toCam.z, toCam.x)
        focusCamLocalAngle = camWorldAngle - pluginWorldAngle
        focusCamElevation  = Math.atan2(toCam.y, Math.hypot(toCam.x, toCam.z))
        focusCamDist       = THREE.MathUtils.clamp(toCam.length(), 6, 20)
      } else {
        focusCamLocalAngle = 0
        focusCamElevation  = 0.35
        focusCamDist       = 10
      }

      cameraVelocity.set(0, 0, 0)
    } else {
      if (preFocusMode === 'fly') {
        // Return to fly mode — keep current camera position & orientation as-is.
        // Re-sync yaw/pitch from current camera quaternion so there's no snap.
        if (camera) {
          cameraEuler.setFromQuaternion(camera.quaternion, 'YXZ')
          yaw         = cameraEuler.y
          pitch       = cameraEuler.x
          targetYaw   = yaw
          targetPitch = pitch
        }
        cameraVelocity.set(0, 0, 0)
        cameraMode.value = 'fly'
        // Re-acquire pointer lock if it was lost during focus mode
        if (containerRef.value && document.pointerLockElement !== containerRef.value) {
          containerRef.value.requestPointerLock()
        }
      } else {
        // Return to god view — sync orbit state from current camera position
        if (camera) {
          godOrbitAngle  = Math.atan2(camera.position.z, camera.position.x)
          godOrbitRadius = THREE.MathUtils.clamp(Math.hypot(camera.position.x, camera.position.z), 40, 200)
          godOrbitHeight = THREE.MathUtils.clamp(camera.position.y, 8, 90)
        }
        cameraMode.value = 'god'
      }
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

  galaxy = pluginNodes = renderer = composer = bloomPass = bokehPass = scene = camera = dustPoints = null
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
