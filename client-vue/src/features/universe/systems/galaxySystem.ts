import * as THREE from 'three'

export interface GalaxySystem {
  root: THREE.Group
  particles: THREE.Points[]
  core: THREE.Group
  update: (elapsed: number) => void
  dispose: () => void
}

const CORE_DUST_COUNT = 10_000
const ARM_STAR_COUNT = 44_000
const BACKGROUND_STAR_COUNT = 16_000
const BRIGHT_STAR_COUNT = 2_200
const CORE_PARTICLE_COUNT = 5_000
const GALAXY_RADIUS = 96

interface ParticleLayerConfig {
  count: number
  radius: number
  branches: number
  spin: number
  verticalScale: number
  spread: number
  size: number
  opacity: number
  inside: string
  outside: string
  accent?: string
}

function randomSigned(power: number) {
  return Math.pow(Math.random(), power) * (Math.random() < 0.5 ? -1 : 1)
}

function createSpiralLayer(config: ParticleLayerConfig) {
  const positions = new Float32Array(config.count * 3)
  const colors = new Float32Array(config.count * 3)
  const colorInside = new THREE.Color(config.inside)
  const colorOutside = new THREE.Color(config.outside)
  const colorAccent = new THREE.Color(config.accent ?? config.outside)

  for (let index = 0; index < config.count; index += 1) {
    const i3 = index * 3
    const radius = Math.pow(Math.random(), 0.58) * config.radius
    const branchAngle = ((index % config.branches) / config.branches) * Math.PI * 2
    const spinAngle = radius * config.spin
    const drift = randomSigned(2.1) * config.spread * (0.35 + radius / config.radius)
    const angle = branchAngle + spinAngle + drift * 0.035
    const vertical = randomSigned(2.4) * config.verticalScale * (0.35 + radius / config.radius)

    positions[i3] = Math.cos(angle) * radius + drift
    positions[i3 + 1] = vertical
    positions[i3 + 2] = Math.sin(angle) * radius + drift * 0.55

    const mixedColor = colorInside.clone().lerp(index % 11 === 0 ? colorAccent : colorOutside, radius / config.radius)
    colors[i3] = mixedColor.r
    colors[i3 + 1] = mixedColor.g
    colors[i3 + 2] = mixedColor.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: config.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: config.opacity,
  })

  return new THREE.Points(geometry, material)
}

function createBackgroundStars() {
  const positions = new Float32Array(BACKGROUND_STAR_COUNT * 3)
  const colors = new Float32Array(BACKGROUND_STAR_COUNT * 3)
  const colorA = new THREE.Color('#8bd3ff')
  const colorB = new THREE.Color('#f7f8ff')

  for (let index = 0; index < BACKGROUND_STAR_COUNT; index += 1) {
    const i3 = index * 3
    const radius = 70 + Math.random() * 140
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2))
    positions[i3] = Math.sin(phi) * Math.cos(theta) * radius
    positions[i3 + 1] = Math.cos(phi) * radius * 0.58
    positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius

    const color = colorA.clone().lerp(colorB, Math.random())
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.055,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.52,
  })

  return new THREE.Points(geometry, material)
}

function createBrightParticles() {
  const positions = new Float32Array(BRIGHT_STAR_COUNT * 3)
  const colors = new Float32Array(BRIGHT_STAR_COUNT * 3)
  const colorA = new THREE.Color('#f9b643')
  const colorB = new THREE.Color('#67e8f9')

  for (let index = 0; index < BRIGHT_STAR_COUNT; index += 1) {
    const i3 = index * 3
    const radius = Math.pow(Math.random(), 0.72) * GALAXY_RADIUS
    const angle = Math.random() * Math.PI * 2
    positions[i3] = Math.cos(angle) * radius + randomSigned(1.5) * 8
    positions[i3 + 1] = randomSigned(1.8) * 12
    positions[i3 + 2] = Math.sin(angle) * radius + randomSigned(1.5) * 8

    const color = colorA.clone().lerp(colorB, Math.random())
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: 0.16,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  })

  return new THREE.Points(geometry, material)
}

function createCoreGeometry() {
  const positions = new Float32Array(CORE_PARTICLE_COUNT * 3)
  const colors = new Float32Array(CORE_PARTICLE_COUNT * 3)
  const colorHot = new THREE.Color('#f9b643')
  const colorNebula = new THREE.Color('#a78bfa')
  const colorIon = new THREE.Color('#67e8f9')

  for (let index = 0; index < CORE_PARTICLE_COUNT; index += 1) {
    const i3 = index * 3
    const radius = Math.pow(Math.random(), 1.65) * 9.5
    const arm = ((index % 6) / 6) * Math.PI * 2
    const swirl = radius * 0.95
    const cloud = randomSigned(2.1)
    const angle = arm + swirl + cloud * 0.45

    positions[i3] = Math.cos(angle) * radius + cloud * 1.2
    positions[i3 + 1] = randomSigned(2.2) * 4.4
    positions[i3 + 2] = Math.sin(angle) * radius + cloud * 1.2

    const color = colorHot.clone().lerp(index % 5 === 0 ? colorIon : colorNebula, radius / 9.5)
    colors[i3] = color.r
    colors[i3 + 1] = color.g
    colors[i3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

export function createGalaxySystem(): GalaxySystem {
  const root = new THREE.Group()

  const coreDust = createSpiralLayer({
    count: CORE_DUST_COUNT,
    radius: 28,
    branches: 7,
    spin: 0.34,
    verticalScale: 4.8,
    spread: 2.8,
    size: 0.095,
    opacity: 0.76,
    inside: '#f9b643',
    outside: '#f472b6',
    accent: '#a78bfa',
  })
  const spiralArms = createSpiralLayer({
    count: ARM_STAR_COUNT,
    radius: GALAXY_RADIUS,
    branches: 6,
    spin: 0.145,
    verticalScale: 15,
    spread: 8.5,
    size: 0.068,
    opacity: 0.74,
    inside: '#f9b643',
    outside: '#67e8f9',
    accent: '#a78bfa',
  })
  const backgroundStars = createBackgroundStars()
  const brightParticles = createBrightParticles()
  const particles = [backgroundStars, spiralArms, coreDust, brightParticles]
  particles.forEach((layer) => root.add(layer))

  const core = new THREE.Group()
  root.add(core)

  const coreGeometry = createCoreGeometry()
  const coreUniforms = {
    uTime: { value: 0 },
    uSize: { value: 0.18 },
  }
  const coreMaterial = new THREE.ShaderMaterial({
    uniforms: coreUniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      varying vec3 vColor;
      varying float vDepth;

      void main() {
        vColor = color;
        vec3 animated = position;
        float swirl = sin(length(position.xz) * 0.72 - uTime * 1.45);
        animated.y += swirl * 0.22;
        animated.xz *= 1.0 + sin(uTime * 0.52 + length(position.xz) * 0.8) * 0.035;
        vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
        vDepth = clamp(1.0 - (length(animated) / 10.5), 0.0, 1.0);
        gl_PointSize = uSize * (420.0 / -mvPosition.z) * (0.65 + vDepth);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vDepth;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float glow = smoothstep(0.5, 0.0, dist);
        float core = smoothstep(0.18, 0.0, dist);
        gl_FragColor = vec4(vColor + core * 0.42, glow * (0.18 + vDepth * 0.68));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  })
  const coreParticles = new THREE.Points(coreGeometry, coreMaterial)
  core.add(coreParticles)

  const haloGeometry = new THREE.SphereGeometry(14, 48, 48)
  const haloUniforms = {
    uTime: { value: 0 },
  }
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: haloUniforms,
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      void main() {
        float rim = pow(1.0 - abs(vNormal.z), 2.7);
        float pulse = 0.45 + sin(uTime * 0.9) * 0.16;
        gl_FragColor = vec4(0.55, 0.36, 1.0, rim * pulse * 0.11);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  })
  const halo = new THREE.Mesh(haloGeometry, haloMaterial)
  core.add(halo)

  return {
    root,
    particles,
    core,
    update: (elapsed) => {
      spiralArms.rotation.y = elapsed * 0.008
      coreDust.rotation.y = elapsed * 0.026
      brightParticles.rotation.y = -elapsed * 0.004
      coreParticles.rotation.y = elapsed * 0.14
      coreParticles.rotation.z = elapsed * 0.055
      halo.rotation.y = -elapsed * 0.035
      coreUniforms.uTime.value = elapsed
      haloUniforms.uTime.value = elapsed
    },
    dispose: () => {
      for (const layer of particles) {
        layer.geometry.dispose()
        layer.material.dispose()
      }
      coreGeometry.dispose()
      coreMaterial.dispose()
      haloGeometry.dispose()
      haloMaterial.dispose()
    },
  }
}
