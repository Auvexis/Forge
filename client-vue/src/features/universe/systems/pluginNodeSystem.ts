import * as THREE from 'three'
import type { UniversePluginNode } from '../types/universe.types'
import { getUniverseOrbitPosition } from '../utils/orbit'

interface PluginNodeObject {
  node: UniversePluginNode
  root: THREE.Group
  artifact: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial[]>
  particle: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  texture: THREE.CanvasTexture
  spin: THREE.Vector3
}

export interface PluginNodeSystem {
  root: THREE.Group
  update: (elapsed: number, camera: THREE.Camera, focusedNodeId: string | null) => void
  pick: (raycaster: THREE.Raycaster) => UniversePluginNode | null
  dispose: () => void
}

const ARTIFACT_SIZE = 0.92
const FAR_DISTANCE = 72

function colorWithAlpha(colorValue: string, alpha: number): string {
  try {
    const color = new THREE.Color(colorValue)
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`
  } catch {
    return `rgba(99, 102, 241, ${alpha})`
  }
}

function drawArtifactTexture(
  node: UniversePluginNode,
  canvas: HTMLCanvasElement,
  texture: THREE.CanvasTexture,
  image?: HTMLImageElement,
) {
  const ctx = canvas.getContext('2d')!
  const color = node.color

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const gradient = ctx.createRadialGradient(128, 110, 12, 128, 128, 150)
  gradient.addColorStop(0, colorWithAlpha(color, 0.93))
  gradient.addColorStop(0.5, colorWithAlpha(color, 0.26))
  gradient.addColorStop(1, 'rgba(3, 5, 11, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (image) {
    const size = 132
    ctx.globalAlpha = 0.95
    ctx.drawImage(image, 128 - size / 2, 128 - size / 2, size, size)
    ctx.globalAlpha = 1
  } else {
    ctx.fillStyle = colorWithAlpha(color, 0.96)
    ctx.beginPath()
    ctx.moveTo(128, 54)
    ctx.lineTo(194, 128)
    ctx.lineTo(128, 202)
    ctx.lineTo(62, 128)
    ctx.closePath()
    ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(128, 128, 38, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = colorWithAlpha(color, 0.9)
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(128, 128, 48, 0, Math.PI * 2)
    ctx.stroke()
  }

  texture.needsUpdate = true
}

function createArtifactTexture(node: UniversePluginNode): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  drawArtifactTexture(node, canvas, texture)

  if (node.icon.kind === 'image' && canUseImageInCanvas(node.icon.value)) {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => drawArtifactTexture(node, canvas, texture, image)
    image.onerror = () => drawArtifactTexture(node, canvas, texture)
    image.src = node.icon.value
  }

  return texture
}

function canUseImageInCanvas(src: string): boolean {
  if (src.startsWith('/') || src.startsWith('data:image/')) return true

  try {
    const url = new URL(src)
    return url.hostname === 'upload.wikimedia.org'
  } catch {
    return false
  }
}

function createPluginObject(node: UniversePluginNode): PluginNodeObject {
  const root = new THREE.Group()
  root.userData.nodeId = node.id

  const texture = createArtifactTexture(node)
  const artifactGeometry = new THREE.BoxGeometry(ARTIFACT_SIZE, ARTIFACT_SIZE, 0.12)
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.94,
    depthWrite: true,
  })
  const sideMaterial = new THREE.MeshBasicMaterial({
    color: node.color,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
  })
  const artifact = new THREE.Mesh(artifactGeometry, [
    sideMaterial,
    sideMaterial,
    sideMaterial,
    sideMaterial,
    faceMaterial,
    sideMaterial,
  ])
  artifact.userData.nodeId = node.id
  root.add(artifact)

  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))
  const particleMaterial = new THREE.PointsMaterial({
    color: node.color,
    size: 0.18,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const particle = new THREE.Points(particleGeometry, particleMaterial)
  particle.visible = false
  root.add(particle)

  return {
    node,
    root,
    artifact,
    particle,
    texture,
    spin: new THREE.Vector3(
      0.12 + (node.id.length % 5) * 0.018,
      0.08 + (node.label.length % 7) * 0.014,
      0.04 + (node.category.length % 3) * 0.015,
    ),
  }
}

export function createPluginNodeSystem(nodes: UniversePluginNode[]): PluginNodeSystem {
  const root = new THREE.Group()
  const objects = nodes.map(createPluginObject)
  const selectableArtifacts = objects.map((object) => object.artifact)

  objects.forEach((object) => root.add(object.root))

  return {
    root,
    update: (elapsed, camera, focusedNodeId) => {
      for (const object of objects) {
        const angle = object.node.orbitOffset + elapsed * object.node.orbitSpeed
        const position = getUniverseOrbitPosition(object.node.orbitRadius, angle, object.node.orbitLane)
        object.root.position.set(position.x, position.y, position.z)
        object.node.position = position
        object.artifact.rotation.x += object.spin.x * 0.01
        object.artifact.rotation.y += object.spin.y * 0.01
        object.artifact.rotation.z += object.spin.z * 0.01

        const distance = camera.position.distanceTo(object.root.position)
        const isFocused = focusedNodeId === object.node.id
        const showArtifact = isFocused || distance < FAR_DISTANCE
        object.artifact.visible = showArtifact
        object.particle.visible = !showArtifact
        const faceMaterial = object.artifact.material[4]
        if (faceMaterial) {
          faceMaterial.opacity = isFocused
            ? 1
            : THREE.MathUtils.clamp(1 - (distance - 22) / 60, 0.38, 0.92)
        }
        object.root.scale.setScalar(isFocused ? 1.35 : 1)
      }
    },
    pick: (raycaster) => {
      const intersections = raycaster.intersectObjects(selectableArtifacts, false)
      const hit = intersections[0]?.object
      if (!hit?.userData.nodeId) return null
      return objects.find((object) => object.node.id === hit.userData.nodeId)?.node ?? null
    },
    dispose: () => {
      for (const object of objects) {
        object.artifact.geometry.dispose()
        for (const material of object.artifact.material) {
          material.dispose()
        }
        object.particle.geometry.dispose()
        object.particle.material.dispose()
        object.texture.dispose()
      }
    },
  }
}
