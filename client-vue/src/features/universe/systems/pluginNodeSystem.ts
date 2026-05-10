import * as THREE from 'three'
import type { UniversePluginNode } from '../types/universe.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CUBE_SIZE       = 0.45    // world-space size of each cube face
const VISIBLE_DIST    = 24      // distance at which the cube fades in
const NEAR_DIST       = 4       // full opacity inside this distance

const NUM_ARMS    = 4
const GALAXY_RADIUS = 120

// ─── Types ────────────────────────────────────────────────────────────────────

interface PluginNodeObject {
  node: UniversePluginNode
  root: THREE.Group
  cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial[]>
  glow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  dot:  THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  spinVelocity: THREE.Vector3
  worldPos: THREE.Vector3
  fadeAlpha: number
}

export interface PluginNodeSystem {
  root:   THREE.Group
  update: (elapsed: number, camera: THREE.Camera, focusedNodeId: string | null) => void
  pick:   (raycaster: THREE.Raycaster) => UniversePluginNode | null
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

// ─── Spiral position ──────────────────────────────────────────────────────────
// Y is clamped tightly so nodes stay inside the visible galaxy disk.
// The disk in galaxySystem uses biased(2.2) * 12 max ≈ ±12 for the omni field,
// but most particles cluster within ±4. We keep plugins in that same band.

function getSpiralPosition(node: UniversePluginNode): THREE.Vector3 {
  const rng = seededRandom(hash(node.id))

  const armIndex  = hash(node.id) % NUM_ARMS
  const baseAngle = (armIndex / NUM_ARMS) * Math.PI * 2
  const radius    = 28 + Math.pow(rng(), 0.65) * (GALAXY_RADIUS * 0.72)

  // spinAngle = radius * 1.2 — same formula as galaxy arm particles
  const angle = baseAngle + radius * 1.2 + (rng() - 0.5) * 0.08 * radius

  // Keep Y tightly within the galaxy midplane (±2.5 units max)
  const y = (rng() * 2 - 1) * 2.5

  return new THREE.Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius,
  )
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

  // Dark background with subtle vignette
  ctx.fillStyle = '#060810'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Inner glow
  const glow = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
  glow.addColorStop(0.0, colorToRgba(node.color, 0.55))
  glow.addColorStop(0.5, colorToRgba(node.color, 0.18))
  glow.addColorStop(1.0, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Thin colored border
  ctx.strokeStyle = colorToRgba(node.color, 0.9)
  ctx.lineWidth = 6
  ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12)

  // Corner accents
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

  // Async logo overlay
  if (node.icon.kind === 'image') {
    const src = node.icon.value
    const canLoad =
      src.startsWith('/') ||
      src.startsWith('data:') ||
      src.includes('upload.wikimedia.org')

    if (canLoad) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        // Redraw base
        ctx.fillStyle = '#060810'
        ctx.fillRect(0, 0, SIZE, SIZE)
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, SIZE, SIZE)

        // Logo centered, with slight padding
        const PAD = 56
        ctx.globalAlpha = 0.92
        ctx.drawImage(img, PAD, PAD, SIZE - PAD * 2, SIZE - PAD * 2)
        ctx.globalAlpha = 1

        // Border on top
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

function createPluginObject(node: UniversePluginNode): PluginNodeObject {
  const rng = seededRandom(hash(node.id) ^ 0xdeadbeef)

  const root = new THREE.Group()
  root.userData.nodeId = node.id

  const worldPos = getSpiralPosition(node)
  root.position.copy(worldPos)

  // Random initial orientation — NOT facing camera
  root.rotation.x = rng() * Math.PI * 2
  root.rotation.y = rng() * Math.PI * 2
  root.rotation.z = rng() * Math.PI * 2

  // ── Cube ──────────────────────────────────────────────────────────────────
  const faceTex  = buildFaceTexture(node)
  const faceMap  = new THREE.MeshBasicMaterial({
    map: faceTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  })
  const sideMat = new THREE.MeshBasicMaterial({
    color: node.color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
  // +x, -x, +y, -y, +z (front), -z (back) — logo on front and back
  const cube = new THREE.Mesh(cubeGeo, [
    sideMat.clone(), // +x
    sideMat.clone(), // -x
    sideMat.clone(), // +y
    sideMat.clone(), // -y
    faceMap,         // +z (front face — logo)
    faceMap.clone(), // -z (back face — logo)
  ])
  cube.userData.nodeId = node.id
  root.add(cube)

  // ── Glow halo plane (camera-facing via lookAt in update) ──────────────────
  const glowTex  = buildGlowTexture(node)
  const glowSize = CUBE_SIZE * 4.2
  const glowGeo = new THREE.PlaneGeometry(glowSize, glowSize)
  const glowMat  = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  root.add(glow)

  // ── LOD dot (visible from far away) ──────────────────────────────────────
  const dotGeo = new THREE.BufferGeometry()
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
  const dotMat = new THREE.PointsMaterial({
    color:         node.color,
    size:          0.14,
    sizeAttenuation: true,
    transparent:   true,
    opacity:       0.78,
    depthWrite:    false,
    blending:      THREE.AdditiveBlending,
  })
  const dot = new THREE.Points(dotGeo, dotMat)
  root.add(dot)

  const spinVelocity = new THREE.Vector3(
    (rng() - 0.5) * 0.30,
    (rng() - 0.5) * 0.22,
    (rng() - 0.5) * 0.14,
  )

  return { node, root, cube, glow, dot, spinVelocity, worldPos, fadeAlpha: 0 }
}

// ─── Public factory ───────────────────────────────────────────────────────────

export function createPluginNodeSystem(nodes: UniversePluginNode[]): PluginNodeSystem {
  const root    = new THREE.Group()
  const objects = nodes.map(createPluginObject)
  const selectableCubes = objects.map((o) => o.cube)

  objects.forEach((o) => root.add(o.root))

  return {
    root,

    update: (elapsed, camera, focusedNodeId) => {
      const camPos = camera.position

      const frustum = new THREE.Frustum()
      const projScreenMatrix = new THREE.Matrix4()
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(projScreenMatrix)

      let visibleCount = 0
      for (const obj of objects) {
        if (obj.fadeAlpha > 0.05 || focusedNodeId === obj.node.id) {
          visibleCount++
        }
      }

      const now = performance.now()

      for (const obj of objects) {
        const isFocused = focusedNodeId === obj.node.id
        const dist      = camPos.distanceTo(obj.worldPos)
        
        const inView = isFocused || frustum.containsPoint(obj.worldPos)

        if (!inView && dist > 120 && !isFocused && obj.fadeAlpha < 0.02) {
          if (visibleCount < 2 && (now - (window as any).__lastPluginSpawnTime > 2500 || !(window as any).__lastPluginSpawnTime)) {
            const fwd = new THREE.Vector3()
            camera.getWorldDirection(fwd)

            const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
            const up = new THREE.Vector3().crossVectors(right, fwd).normalize()

            const spawnDist = 45 + Math.random() * 25
            const offsetRight = (Math.random() - 0.5) * 40
            const offsetUp = (Math.random() - 0.5) * 20

            const candidatePos = camPos.clone()
              .add(fwd.multiplyScalar(spawnDist))
              .add(right.multiplyScalar(offsetRight))
              .add(up.multiplyScalar(offsetUp))

            // Keep within reasonable galaxy thickness
            candidatePos.y = THREE.MathUtils.clamp(candidatePos.y, -14, 14)

            // Only teleport if the candidate position is inside the galaxy
            // This prevents plugins getting stuck on the edge if the user looks outward
            const currentRadius = Math.hypot(candidatePos.x, candidatePos.z)
            if (currentRadius <= 110) {
              obj.worldPos.copy(candidatePos)
              obj.root.position.copy(obj.worldPos)

              obj.node.position.x = obj.worldPos.x
              obj.node.position.y = obj.worldPos.y
              obj.node.position.z = obj.worldPos.z

              ;(window as any).__lastPluginSpawnTime = now
              visibleCount++
            }
          }
        }

        const targetFade = (isFocused || frustum.containsPoint(obj.worldPos)) ? 1.0 : 0.0
        obj.fadeAlpha += (targetFade - obj.fadeAlpha) * 0.08

        // Natural 3D cube rotation — NOT billboarding
        obj.root.rotation.x += obj.spinVelocity.x * 0.007
        obj.root.rotation.y += obj.spinVelocity.y * 0.007
        obj.root.rotation.z += obj.spinVelocity.z * 0.007

        // Scale: enlarge when focused
        const targetScale = isFocused ? 1.6 : 1.0
        const cur = obj.root.scale.x
        obj.root.scale.setScalar(cur + (targetScale - cur) * 0.07)

        // Cube opacity fades in when close
        const cubeAlpha = isFocused
          ? 0.95
          : dist < VISIBLE_DIST
            ? THREE.MathUtils.clamp(
                (VISIBLE_DIST - dist) / (VISIBLE_DIST - NEAR_DIST),
                0,
                0.85,
              )
            : 0

        for (const mat of obj.cube.material) {
          mat.opacity = cubeAlpha * obj.fadeAlpha
        }

        // Glow: always slightly visible, strongest when close / focused
        const glowAlpha = isFocused
          ? 0.88
          : THREE.MathUtils.clamp(1.0 - dist / 80, 0.04, 0.6)
        obj.glow.material.opacity = glowAlpha * obj.fadeAlpha

        // Glow always faces camera (billboard — only the glow, not the cube)
        obj.glow.lookAt(camPos)

        // Dot: far-LOD proxy, fades out when cube is visible
        const dotAlpha = isFocused
          ? 0
          : THREE.MathUtils.clamp(dist / VISIBLE_DIST, 0.10, 0.72)
        obj.dot.material.opacity = dotAlpha * obj.fadeAlpha

        // Focused bob
        if (isFocused) {
          obj.root.position.y = obj.worldPos.y + Math.sin(elapsed * 1.6) * 0.3
        } else {
          obj.root.position.y = obj.worldPos.y
        }
      }
    },

    pick: (raycaster) => {
      // Only pick cubes that are visibly faded in
      const visibleCubes = objects.filter(o => o.fadeAlpha > 0.05).map(o => o.cube)
      const hits = raycaster.intersectObjects(visibleCubes, false)
      const hit  = hits[0]?.object
      if (!hit?.userData.nodeId) return null
      return objects.find((o) => o.node.id === hit.userData.nodeId)?.node ?? null
    },

    dispose: () => {
      for (const obj of objects) {
        obj.cube.geometry.dispose()
        for (const m of obj.cube.material) {
          m.map?.dispose()
          m.dispose()
        }
        obj.glow.geometry.dispose()
        obj.glow.material.map?.dispose()
        obj.glow.material.dispose()
        obj.dot.geometry.dispose()
        obj.dot.material.dispose()
      }
    },
  }
}
