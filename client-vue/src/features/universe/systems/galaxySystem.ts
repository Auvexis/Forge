import * as THREE from 'three'

export interface GalaxySystem {
  root: THREE.Group
  particles: THREE.Points[]
  core: THREE.Group
  update: (elapsed: number) => void
  dispose: () => void
}

// ─── Scale ────────────────────────────────────────────────────────────────────
const GALAXY_RADIUS = 120
const CORE_RADIUS   = 12

// ─── Reference palette ────────────────────────────────────────────────────────
const C_INSIDE  = new THREE.Color(0xff6030)  // warm orange-red
const C_OUTSIDE = new THREE.Color(0x1b3984)  // deep navy blue
const C_HOT     = new THREE.Color(0xfff0e0)  // near-white hot core

// ─── Particle counts ──────────────────────────────────────────────────────────
const NUM_ARMS        = 4
const ARM_COUNT       = 80_000
const OMNI_COUNT      = 60_000   // fills all space, not just arms
const INNER_COUNT     = 20_000
const CORE_COUNT      = 14_000
const HALO_COUNT      = 18_000

// ─── Circular soft-star texture ───────────────────────────────────────────────
// Creates a radial gradient canvas so PointsMaterial renders round glowing dots
// instead of the default WebGL square point sprites.

function createStarTexture(resolution = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = resolution
  const ctx = canvas.getContext('2d')!
  const half = resolution / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0.0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.8)')
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.25)')
  gradient.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, resolution, resolution)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// Shared star texture for all PointsMaterial layers
let _starTex: THREE.CanvasTexture | null = null
function getStarTexture(): THREE.CanvasTexture {
  if (!_starTex) _starTex = createStarTexture()
  return _starTex
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function biased(power: number): number {
  return Math.pow(Math.random(), power) * (Math.random() < 0.5 ? -1 : 1)
}

function lerp3(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1))
}

function makeMat(size: number, opacity: number): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity,
    map: getStarTexture(),
    alphaMap: getStarTexture(),
    alphaTest: 0.001,
  })
}

// ─── Omnidirectional dense field ──────────────────────────────────────────────
// Key layer: real galaxies are dense EVERYWHERE.
// Random disk fill — not concentrated in arms.

function buildOmniField(): THREE.Points {
  const positions = new Float32Array(OMNI_COUNT * 3)
  const colors    = new Float32Array(OMNI_COUNT * 3)

  for (let i = 0; i < OMNI_COUNT; i++) {
    const i3 = i * 3
    const radius = Math.pow(Math.random(), 0.55) * GALAXY_RADIUS
    const theta  = Math.random() * Math.PI * 2
    const diskH  = 2.0 + (radius / GALAXY_RADIUS) * 12

    positions[i3]     = Math.cos(theta) * radius
    positions[i3 + 1] = biased(2.2) * diskH
    positions[i3 + 2] = Math.sin(theta) * radius

    const t   = radius / GALAXY_RADIUS
    const col = lerp3(C_INSIDE, C_OUTSIDE, t)
    if (i % 23 === 0) col.lerp(C_HOT, 0.55)
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
  return new THREE.Points(geo, makeMat(0.28, 0.52))
}

// ─── Spiral arms ──────────────────────────────────────────────────────────────
// 4 branches, spinAngle = radius * 1.2 (same formula as reference)

function buildSpiralArms(): THREE.Points {
  const positions = new Float32Array(ARM_COUNT * 3)
  const colors    = new Float32Array(ARM_COUNT * 3)

  for (let i = 0; i < ARM_COUNT; i++) {
    const i3 = i * 3
    const radius      = Math.pow(Math.random(), 0.55) * GALAXY_RADIUS
    const branchAngle = ((i % NUM_ARMS) / NUM_ARMS) * Math.PI * 2
    const spinAngle   = radius * 1.2   // identical to reference
    const scatter     = biased(2.5) * Math.pow(radius / GALAXY_RADIUS, 0.8) * 16
    const angle       = branchAngle + spinAngle

    positions[i3]     = Math.cos(angle) * radius + Math.cos(angle + Math.PI * 0.5) * scatter * 0.32
    positions[i3 + 1] = biased(3.0) * (1.8 + (radius / GALAXY_RADIUS) * 9)
    positions[i3 + 2] = Math.sin(angle) * radius + Math.sin(angle + Math.PI * 0.5) * scatter * 0.32

    const t   = radius / GALAXY_RADIUS
    const col = lerp3(C_INSIDE, C_OUTSIDE, t)
    if (i % 15 === 0) col.lerp(C_HOT, 0.4)
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
  return new THREE.Points(geo, makeMat(0.38, 0.80))
}

// ─── Dense inner disk ─────────────────────────────────────────────────────────

function buildInnerDisk(): THREE.Points {
  const positions = new Float32Array(INNER_COUNT * 3)
  const colors    = new Float32Array(INNER_COUNT * 3)

  for (let i = 0; i < INNER_COUNT; i++) {
    const i3 = i * 3
    const radius = Math.pow(Math.random(), 1.4) * GALAXY_RADIUS * 0.35
    const arm    = (i % NUM_ARMS) / NUM_ARMS * Math.PI * 2
    const angle  = arm + radius * 1.2
    const scatter = biased(2.0) * radius * 0.06

    positions[i3]     = Math.cos(angle) * radius + scatter
    positions[i3 + 1] = biased(3.0) * (1.4 + radius * 0.045)
    positions[i3 + 2] = Math.sin(angle) * radius + scatter * 0.7

    const col = lerp3(C_HOT, C_INSIDE, radius / (GALAXY_RADIUS * 0.35))
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
  return new THREE.Points(geo, makeMat(0.45, 0.88))
}

// ─── Outer halo ───────────────────────────────────────────────────────────────

function buildHalo(): THREE.Points {
  const positions = new Float32Array(HALO_COUNT * 3)
  const colors    = new Float32Array(HALO_COUNT * 3)

  const haloB = new THREE.Color(0x2a4ab0)

  for (let i = 0; i < HALO_COUNT; i++) {
    const i3 = i * 3
    const radius = GALAXY_RADIUS * 0.6 + Math.random() * GALAXY_RADIUS * 1.4
    const theta  = Math.random() * Math.PI * 2
    const phi    = Math.acos(THREE.MathUtils.randFloatSpread(2))

    positions[i3]     = Math.sin(phi) * Math.cos(theta) * radius
    positions[i3 + 1] = Math.cos(phi) * radius * 0.28
    positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius

    const col = C_OUTSIDE.clone().lerp(haloB, Math.random())
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
  return new THREE.Points(geo, makeMat(0.14, 0.36))
}

// ─── Core: shader particles, no sphere ───────────────────────────────────────

function buildCoreParticles(): {
  points: THREE.Points
  uniforms: Record<string, { value: number }>
} {
  const positions = new Float32Array(CORE_COUNT * 3)
  const colors    = new Float32Array(CORE_COUNT * 3)

  for (let i = 0; i < CORE_COUNT; i++) {
    const i3  = i * 3
    const radius = Math.pow(Math.random(), 2.8) * CORE_RADIUS
    const arm    = (i % NUM_ARMS) / NUM_ARMS * Math.PI * 2
    const angle  = arm + radius * 1.6 + biased(1.6) * 0.5

    positions[i3]     = Math.cos(angle) * radius + biased(2.0) * radius * 0.12
    positions[i3 + 1] = biased(2.5) * (1.0 + radius * 0.12)
    positions[i3 + 2] = Math.sin(angle) * radius + biased(2.0) * radius * 0.12

    const col = lerp3(C_HOT, C_INSIDE, radius / CORE_RADIUS)
    colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

  const uniforms = { uTime: { value: 0 }, uSize: { value: 340.0 } }

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uSize;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vDist;

      void main() {
        vColor = color;
        vec3 pos = position;
        float r = length(pos.xz);
        float s = sin(r * 0.38 - uTime * 0.9) * 0.12;
        float cs = cos(s); float ss = sin(s);
        float nx = pos.x * cs - pos.z * ss;
        float nz = pos.x * ss + pos.z * cs;
        pos.x = nx; pos.z = nz;
        pos.y += sin(r * 0.6 - uTime * 0.7) * 0.16;
        vDist = clamp(1.0 - r / 12.0, 0.0, 1.0);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = clamp(uSize * (0.8 + vDist * 1.6) / -mvPos.z, 1.0, 48.0);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vDist;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float softGlow = smoothstep(0.5, 0.0, d);
        float coreGlow = smoothstep(0.16, 0.0, d) * 1.8;
        vec3 col = vColor + coreGlow * vDist * vec3(1.0, 0.85, 0.55);
        gl_FragColor = vec4(col, (softGlow + coreGlow) * (0.2 + vDist * 0.75));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  })

  return { points: new THREE.Points(geo, mat), uniforms }
}

// ─── Nuclear bulge (no sphere) ────────────────────────────────────────────────

function buildNuclearBulge(): THREE.Points[] {
  const radii  = [1.5, 4,   7,   10  ]
  const counts = [1500, 3000, 2500, 2000]
  const sizes  = [0.55, 0.40, 0.30, 0.20]
  const opacs  = [1.0,  0.9,  0.78, 0.6 ]

  return radii.map((R, layer) => {
    const N = counts[layer]!
    const positions = new Float32Array(N * 3)
    const colors    = new Float32Array(N * 3)

    for (let i = 0; i < N; i++) {
      const i3 = i * 3
      const r  = Math.pow(Math.random(), 3.2) * R
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(THREE.MathUtils.randFloatSpread(2))

      positions[i3]     = Math.sin(ph) * Math.cos(th) * r
      positions[i3 + 1] = Math.cos(ph) * r * 0.52
      positions[i3 + 2] = Math.sin(ph) * Math.sin(th) * r

      const col = lerp3(C_HOT, C_INSIDE, r / R)
      colors[i3] = col.r; colors[i3 + 1] = col.g; colors[i3 + 2] = col.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
    return new THREE.Points(geo, makeMat(sizes[layer]!, opacs[layer]!))
  })
}

// ─── Public factory ───────────────────────────────────────────────────────────

export function createGalaxySystem(): GalaxySystem {
  const root = new THREE.Group()

  const omniField  = buildOmniField()
  const spiralArms = buildSpiralArms()
  const innerDisk  = buildInnerDisk()
  const halo       = buildHalo()

  const { points: corePoints, uniforms: coreUniforms } = buildCoreParticles()
  const bulge = buildNuclearBulge()

  const core = new THREE.Group()
  core.add(corePoints)
  bulge.forEach((b) => core.add(b))

  const particles: THREE.Points[] = [halo, omniField, spiralArms, innerDisk]
  particles.forEach((p) => root.add(p))
  root.add(core)

  return {
    root,
    particles,
    core,

    update: (elapsed) => {
      // Differential rotation — outer rings lag behind inner disk
      omniField.rotation.y  = elapsed * 0.003
      spiralArms.rotation.y = elapsed * 0.004
      innerDisk.rotation.y  = elapsed * 0.014
      halo.rotation.y       = -elapsed * 0.0006

      corePoints.rotation.y = elapsed * 0.08
      corePoints.rotation.z = elapsed * 0.025
      bulge.forEach((b, bi) => {
        b.rotation.y = elapsed * (0.10 + bi * 0.015)
        b.rotation.x = elapsed * (0.03 - bi * 0.006)
      })

      coreUniforms.uTime.value = elapsed
    },

    dispose: () => {
      _starTex?.dispose()
      _starTex = null
      for (const p of particles) {
        p.geometry.dispose()
        ;(p.material as THREE.Material).dispose()
      }
      corePoints.geometry.dispose()
      ;(corePoints.material as THREE.Material).dispose()
      bulge.forEach((b) => {
        b.geometry.dispose()
        ;(b.material as THREE.Material).dispose()
      })
    },
  }
}
