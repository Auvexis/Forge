import * as THREE from 'three'
import type { UniversePluginNode } from '../types/universe.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CUBE_SIZE    = 0.45
const VISIBLE_DIST = 28
const NEAR_DIST    = 5

// Orbit ring — all plugins orbit at this base radius in the XZ plane
const ORBIT_RADIUS   = 72
const ORBIT_Y_SPREAD = 4

// Trail: comet-like tail behind each moving plugin
const TRAIL_LEN  = 40   // number of line segments
const TRAIL_STEP = 10   // frames of orbit per trail point (longer arc)

// Stagger reveal
const STAGGER_INTERVAL_MS = 1400

// ─── Types ────────────────────────────────────────────────────────────────────

interface PluginNodeObject {
  node:          UniversePluginNode
  root:          THREE.Group
  cube:          THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial[]>
  glow:          THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  dot:           THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  hitbox:        THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>  // invisible large click target
  trail:         THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
  trailPosArr:   Float32Array
  trailColArr:   Float32Array
  spinVelocity:  THREE.Vector3
  worldPos:      THREE.Vector3
  orbitAngle:    number
  orbitRadius:   number
  orbitSpeed:    number
  orbitY:        number
  fadeAlpha:     number
  revealed:      boolean
}

export interface PluginNodeSystem {
  root:    THREE.Group
  update:  (elapsed: number, camera: THREE.Camera, focusedNodeId: string | null) => void
  pick:    (raycaster: THREE.Raycaster) => UniversePluginNode | null
  dispose: () => void
}

// ─── Deterministic hash / seeded RNG ─────────────────────────────────────────

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// ─── Flat Ring Distribution ───────────────────────────────────────────────────

function buildRingPositions(count: number): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const angle  = goldenAngle * i
    const radius = ORBIT_RADIUS + Math.sin(i * 7.3) * 8
    const y      = Math.sin(i * 3.7) * ORBIT_Y_SPREAD

    positions.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius,
    ))
  }

  return positions
}

// ─── Logo texture ─────────────────────────────────────────────────────────────

function colorToRgba(hex: string, alpha: number): string {
  const c = new THREE.Color(hex)
  return `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${alpha})`
}

function buildFaceTexture(node: UniversePluginNode): THREE.CanvasTexture {
  const SIZE = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#060810'
  ctx.fillRect(0, 0, SIZE, SIZE)

  const glow = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
  glow.addColorStop(0.0, colorToRgba(node.color, 0.55))
  glow.addColorStop(0.5, colorToRgba(node.color, 0.18))
  glow.addColorStop(1.0, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SIZE, SIZE)

  ctx.strokeStyle = colorToRgba(node.color, 0.9)
  ctx.lineWidth = 6
  ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12)

  const CORNER = 18
  ctx.lineWidth = 3
  ;[
    [6, 6],
    [SIZE - 6, 6],
    [6, SIZE - 6],
    [SIZE - 6, SIZE - 6],
  ].forEach(([cx, cy]) => {
    ctx.beginPath()
    ctx.arc(cx!, cy!, CORNER, 0, Math.PI * 2)
    ctx.strokeStyle = colorToRgba(node.color, 1)
    ctx.stroke()
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8

  if (node.icon.kind === 'image') {
    const src = node.icon.value
    const canLoad = src.startsWith('/') || src.startsWith('data:') || src.includes('upload.wikimedia.org')
    if (canLoad) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.fillStyle = '#060810'
        ctx.fillRect(0, 0, SIZE, SIZE)
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, SIZE, SIZE)
        const PAD = 56
        ctx.globalAlpha = 0.92
        ctx.drawImage(img, PAD, PAD, SIZE - PAD * 2, SIZE - PAD * 2)
        ctx.globalAlpha = 1
        ctx.strokeStyle = colorToRgba(node.color, 0.88)
        ctx.lineWidth = 6
        ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12)
        texture.needsUpdate = true
      }
      img.src = src
    }
  }

  return texture
}

function buildGlowTexture(node: UniversePluginNode): THREE.CanvasTexture {
  const SIZE = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const half = SIZE / 2
  const g = ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0.0, colorToRgba(node.color, 0.9))
  g.addColorStop(0.3, colorToRgba(node.color, 0.5))
  g.addColorStop(0.7, colorToRgba(node.color, 0.1))
  g.addColorStop(1.0, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, SIZE, SIZE)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ─── Per-node factory ─────────────────────────────────────────────────────────

function createPluginObject(node: UniversePluginNode, worldPos: THREE.Vector3): PluginNodeObject {
  const rng = seededRandom(hash(node.id) ^ 0xdeadbeef)

  // ── Orbit properties derived from Fibonacci position ────────────────────────
  const orbitAngle  = Math.atan2(worldPos.z, worldPos.x)
  const orbitRadius = Math.hypot(worldPos.x, worldPos.z)
  const orbitY      = worldPos.y
  // Each plugin orbits at a different seeded speed
  const orbitSpeed  = 0.0006 + rng() * 0.0010  // 0.0006–0.0016 rad/frame

  // Sync node.position so camera focus knows where to fly to
  node.position.x = worldPos.x
  node.position.y = worldPos.y
  node.position.z = worldPos.z

  // ── Scene group ─────────────────────────────────────────────────────────────
  const root = new THREE.Group()
  root.userData.nodeId = node.id
  root.position.copy(worldPos)
  root.rotation.x = rng() * Math.PI * 2
  root.rotation.y = rng() * Math.PI * 2
  root.rotation.z = rng() * Math.PI * 2

  // ── Cube ────────────────────────────────────────────────────────────────────
  const faceTex = buildFaceTexture(node)
  const faceMap = new THREE.MeshBasicMaterial({
    map: faceTex, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
  })
  const sideMat = new THREE.MeshBasicMaterial({
    color: node.color, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
  const cube = new THREE.Mesh(cubeGeo, [
    sideMat.clone(), sideMat.clone(), sideMat.clone(),
    sideMat.clone(), faceMap, faceMap.clone(),
  ])
  cube.userData.nodeId = node.id
  root.add(cube)

  // ── Glow halo ───────────────────────────────────────────────────────────────
  const glowTex = buildGlowTexture(node)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(CUBE_SIZE * 4.2, CUBE_SIZE * 4.2),
    new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }),
  )
  root.add(glow)

  // ── LOD dot ─────────────────────────────────────────────────────────────────
  const dotGeo = new THREE.BufferGeometry()
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
  const dot = new THREE.Points(dotGeo, new THREE.PointsMaterial({
    color: node.color, size: 0.14, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  }))
  root.add(dot)

  // ── Invisible hitbox sphere — large so it's easy to click from far away ────
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 6, 4),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  hitbox.userData.nodeId = node.id
  root.add(hitbox)

  // ── Trail ───────────────────────────────────────────────────────────────────
  // Analytical trail: traces the circular orbit behind the plugin.
  // No ring buffer needed — we compute positions from orbitAngle each frame.
  const trailPosArr = new Float32Array(TRAIL_LEN * 3)
  const trailColArr = new Float32Array(TRAIL_LEN * 3)
  const trailColor  = new THREE.Color(node.color)

  // Pre-fill with current position
  for (let t = 0; t < TRAIL_LEN; t++) {
    trailPosArr[t * 3]     = worldPos.x
    trailPosArr[t * 3 + 1] = worldPos.y
    trailPosArr[t * 3 + 2] = worldPos.z
    const fade = Math.max(0, 1 - t / TRAIL_LEN)
    trailColArr[t * 3]     = trailColor.r * fade
    trailColArr[t * 3 + 1] = trailColor.g * fade
    trailColArr[t * 3 + 2] = trailColor.b * fade
  }

  const trailGeo = new THREE.BufferGeometry()
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPosArr, 3))
  trailGeo.setAttribute('color',    new THREE.BufferAttribute(trailColArr, 3))

  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  // The trail geometry is recomputed analytically every frame so Three.js
  // never updates its bounding sphere. Without this flag the renderer would
  // incorrectly cull the trail when the camera reaches certain angles.
  trail.frustumCulled = false

  const spinVelocity = new THREE.Vector3(
    (rng() - 0.5) * 0.30,
    (rng() - 0.5) * 0.22,
    (rng() - 0.5) * 0.14,
  )

  return {
    node, root, cube, glow, dot, hitbox,
    trail, trailPosArr, trailColArr,
    spinVelocity, worldPos,
    orbitAngle, orbitRadius, orbitSpeed, orbitY,
    fadeAlpha: 0, revealed: false,
  }
}

// ─── Public factory ───────────────────────────────────────────────────────────

export function createPluginNodeSystem(nodes: UniversePluginNode[]): PluginNodeSystem {
  const root = new THREE.Group()

  const ringPositions = buildRingPositions(nodes.length)
  const objects = nodes.map((node, i) => createPluginObject(node, ringPositions[i]!))

  // Add both the plugin cube group AND the trail to the system root
  objects.forEach((o) => {
    root.add(o.root)
    root.add(o.trail)  // trail is world-space so it's NOT a child of root group
  })

  const mountTime = performance.now()
  const trailColor = new THREE.Color()

  return {
    root,

    update: (elapsed, camera, focusedNodeId) => {
      const camPos = camera.position
      const now    = performance.now()

      // Progressive reveal
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i]!
        if (!obj.revealed && now - mountTime >= i * STAGGER_INTERVAL_MS) {
          obj.revealed = true
        }
      }

      for (const obj of objects) {
        const isFocused = focusedNodeId === obj.node.id

        // ── Orbit — always active, even when focused ──────────────────────────────
        // Negate: cos/sin with +angle is CW from above, but rotation.y + is CCW.
        // Subtracting keeps plugins spinning in the same direction as the galaxy.
        obj.orbitAngle -= obj.orbitSpeed
        const cx = Math.cos(obj.orbitAngle) * obj.orbitRadius
        const cz = Math.sin(obj.orbitAngle) * obj.orbitRadius
        obj.worldPos.set(cx, obj.orbitY, cz)
        obj.root.position.set(cx, obj.orbitY, cz)
        obj.node.position.x = cx
        obj.node.position.y = obj.orbitY
        obj.node.position.z = cz

        // ── Trail (analytical) ─────────────────────────────────────────────────
        // Compute trail points by stepping backwards along the orbit arc
        trailColor.set(obj.node.color)
        const posAttr = obj.trail.geometry.attributes.position as THREE.BufferAttribute
        const colAttr = obj.trail.geometry.attributes.color    as THREE.BufferAttribute

        for (let t = 0; t < TRAIL_LEN; t++) {
          // Trail steps forward in angle (opposite of orbit direction) to paint the tail
          const ta      = obj.orbitAngle + t * obj.orbitSpeed * TRAIL_STEP
          const fade    = Math.max(0, 1 - t / TRAIL_LEN)
          // Head is hot white, middle is plugin color, tail fades to transparent
          const hotness = Math.max(0, 1 - (t / TRAIL_LEN) * 3.5)  // hot for first ~28%
          const r = Math.min(1, trailColor.r * (1 - hotness) + hotness)
          const g = Math.min(1, trailColor.g * (1 - hotness) + hotness)
          const b = Math.min(1, trailColor.b * (1 - hotness) + hotness)

          obj.trailPosArr[t * 3]     = Math.cos(ta) * obj.orbitRadius
          obj.trailPosArr[t * 3 + 1] = obj.orbitY
          obj.trailPosArr[t * 3 + 2] = Math.sin(ta) * obj.orbitRadius

          obj.trailColArr[t * 3]     = r * fade
          obj.trailColArr[t * 3 + 1] = g * fade
          obj.trailColArr[t * 3 + 2] = b * fade
        }

        posAttr.needsUpdate = true
        colAttr.needsUpdate = true

        // Trail always visible (even when focused)
        obj.trail.material.opacity = obj.fadeAlpha * 0.9

        // ── Fade ───────────────────────────────────────────────────────────────
        const targetFade = (obj.revealed || isFocused) ? 1.0 : 0.0
        const fadeSpeed  = targetFade > obj.fadeAlpha ? 0.008 : 0.06
        obj.fadeAlpha   += (targetFade - obj.fadeAlpha) * fadeSpeed

        // ── Cube spin ──────────────────────────────────────────────────────────
        obj.root.rotation.x += obj.spinVelocity.x * 0.007
        obj.root.rotation.y += obj.spinVelocity.y * 0.007
        obj.root.rotation.z += obj.spinVelocity.z * 0.007

        // ── Scale ──────────────────────────────────────────────────────────────
        const targetScale = isFocused ? 1.6 : 1.0
        const cur = obj.root.scale.x
        obj.root.scale.setScalar(cur + (targetScale - cur) * 0.07)

        // ── Cube face opacity ──────────────────────────────────────────────────
        const dist      = camPos.distanceTo(obj.worldPos)
        const cubeAlpha = isFocused
          ? 0.95
          : dist < VISIBLE_DIST
            ? THREE.MathUtils.clamp((VISIBLE_DIST - dist) / (VISIBLE_DIST - NEAR_DIST), 0, 0.85)
            : 0

        for (const mat of obj.cube.material) {
          mat.opacity = cubeAlpha * obj.fadeAlpha
        }

        // ── Glow ───────────────────────────────────────────────────────────────
        const glowAlpha = isFocused
          ? 0.88
          : THREE.MathUtils.clamp(1.0 - dist / 80, 0.04, 0.55)
        obj.glow.material.opacity = glowAlpha * obj.fadeAlpha
        obj.glow.lookAt(camPos)

        // ── LOD dot ────────────────────────────────────────────────────────────
        const dotAlpha = isFocused
          ? 0
          : THREE.MathUtils.clamp(dist / VISIBLE_DIST, 0.10, 0.72)
        obj.dot.material.opacity = dotAlpha * obj.fadeAlpha

        // ── Focused bob removed — plugin keeps orbiting at its Y ───────────────
      }
    },

    pick: (raycaster) => {
      // Use hitbox spheres — large invisible targets, easy to click from far
      const visibleHitboxes = objects.filter(o => o.fadeAlpha > 0.05).map(o => o.hitbox)
      const hits = raycaster.intersectObjects(visibleHitboxes, false)
      const hit  = hits[0]?.object
      if (!hit?.userData.nodeId) return null
      return objects.find((o) => o.node.id === hit.userData.nodeId)?.node ?? null
    },

    dispose: () => {
      for (const obj of objects) {
        obj.cube.geometry.dispose()
        for (const m of obj.cube.material) { m.map?.dispose(); m.dispose() }
        obj.glow.geometry.dispose()
        obj.glow.material.map?.dispose()
        obj.glow.material.dispose()
        obj.dot.geometry.dispose()
        obj.dot.material.dispose()
        obj.hitbox.geometry.dispose()
        obj.hitbox.material.dispose()
        obj.trail.geometry.dispose()
        obj.trail.material.dispose()
      }
    },
  }
}
