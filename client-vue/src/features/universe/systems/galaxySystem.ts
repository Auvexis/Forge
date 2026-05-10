import * as THREE from 'three'

export interface GalaxySystem {
  root: THREE.Group
  particles: THREE.Points
  core: THREE.Group
  update: (elapsed: number) => void
  dispose: () => void
}

const GALAXY_PARTICLE_COUNT = 2600
const CORE_PARTICLE_COUNT = 1400

function createGalaxyGeometry() {
  const positions = new Float32Array(GALAXY_PARTICLE_COUNT * 3)
  const colors = new Float32Array(GALAXY_PARTICLE_COUNT * 3)
  const colorInside = new THREE.Color('#f9b643')
  const colorOutside = new THREE.Color('#67e8f9')
  const colorAccent = new THREE.Color('#a78bfa')

  for (let index = 0; index < GALAXY_PARTICLE_COUNT; index += 1) {
    const i3 = index * 3
    const radius = Math.pow(Math.random(), 0.72) * 15
    const branchAngle = ((index % 5) / 5) * Math.PI * 2
    const spinAngle = radius * 0.44
    const randomSpread = Math.pow(Math.random(), 2.8) * (Math.random() < 0.5 ? -1 : 1)
    const verticalSpread = Math.pow(Math.random(), 3.2) * (Math.random() < 0.5 ? -1 : 1)

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomSpread * 0.9
    positions[i3 + 1] = verticalSpread * 1.6
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomSpread * 0.9

    const mixedColor = colorInside.clone().lerp(index % 7 === 0 ? colorAccent : colorOutside, radius / 15)
    colors[i3] = mixedColor.r
    colors[i3 + 1] = mixedColor.g
    colors[i3 + 2] = mixedColor.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function createCoreGeometry() {
  const positions = new Float32Array(CORE_PARTICLE_COUNT * 3)
  const colors = new Float32Array(CORE_PARTICLE_COUNT * 3)
  const colorHot = new THREE.Color('#f9b643')
  const colorNebula = new THREE.Color('#a78bfa')
  const colorIon = new THREE.Color('#67e8f9')

  for (let index = 0; index < CORE_PARTICLE_COUNT; index += 1) {
    const i3 = index * 3
    const radius = Math.pow(Math.random(), 1.8) * 3.1
    const arm = ((index % 4) / 4) * Math.PI * 2
    const swirl = radius * 1.85
    const cloud = Math.pow(Math.random(), 2.2) * (Math.random() < 0.5 ? -1 : 1)
    const angle = arm + swirl + cloud * 0.38

    positions[i3] = Math.cos(angle) * radius + cloud * 0.45
    positions[i3 + 1] = Math.pow(Math.random(), 2.5) * (Math.random() < 0.5 ? -1 : 1) * 1.35
    positions[i3 + 2] = Math.sin(angle) * radius + cloud * 0.45

    const color = colorHot.clone().lerp(index % 5 === 0 ? colorIon : colorNebula, radius / 3.1)
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

  const particlesGeometry = createGalaxyGeometry()
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.035,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    transparent: true,
    opacity: 0.86,
  })
  const particles = new THREE.Points(particlesGeometry, particlesMaterial)
  root.add(particles)

  const core = new THREE.Group()
  root.add(core)

  const coreGeometry = createCoreGeometry()
  const coreUniforms = {
    uTime: { value: 0 },
    uSize: { value: 0.12 },
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
        float swirl = sin(length(position.xz) * 2.4 - uTime * 1.6);
        animated.y += swirl * 0.08;
        animated.xz *= 1.0 + sin(uTime * 0.7 + length(position.xz)) * 0.025;
        vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
        vDepth = clamp(1.0 - (length(animated) / 3.4), 0.0, 1.0);
        gl_PointSize = uSize * (360.0 / -mvPosition.z) * (0.65 + vDepth);
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
        gl_FragColor = vec4(vColor + core * 0.45, glow * (0.26 + vDepth * 0.74));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  })
  const coreParticles = new THREE.Points(coreGeometry, coreMaterial)
  core.add(coreParticles)

  const haloGeometry = new THREE.SphereGeometry(3.2, 44, 44)
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
        float rim = pow(1.0 - abs(vNormal.z), 2.2);
        float pulse = 0.55 + sin(uTime * 1.4) * 0.18;
        gl_FragColor = vec4(0.55, 0.36, 1.0, rim * pulse * 0.18);
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
      coreParticles.rotation.y = elapsed * 0.18
      coreParticles.rotation.z = elapsed * 0.08
      halo.rotation.y = -elapsed * 0.06
      coreUniforms.uTime.value = elapsed
      haloUniforms.uTime.value = elapsed
    },
    dispose: () => {
      particlesGeometry.dispose()
      particlesMaterial.dispose()
      coreGeometry.dispose()
      coreMaterial.dispose()
      haloGeometry.dispose()
      haloMaterial.dispose()
    },
  }
}
