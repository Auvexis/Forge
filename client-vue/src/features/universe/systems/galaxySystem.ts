import * as THREE from 'three'

export interface GalaxySystem {
  root: THREE.Group
  particles: THREE.Points
  core: THREE.Mesh
  dispose: () => void
}

const GALAXY_PARTICLE_COUNT = 2600

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

  const coreGeometry = new THREE.SphereGeometry(1.18, 40, 40)
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: '#f9b643',
    transparent: true,
    opacity: 0.78,
  })
  const core = new THREE.Mesh(coreGeometry, coreMaterial)
  root.add(core)

  const haloGeometry = new THREE.SphereGeometry(2.4, 40, 40)
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: '#a78bfa',
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
  })
  const halo = new THREE.Mesh(haloGeometry, haloMaterial)
  root.add(halo)

  return {
    root,
    particles,
    core,
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
