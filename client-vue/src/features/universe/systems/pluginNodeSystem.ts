import * as THREE from 'three'
import type { UniversePluginNode } from '../types/universe.types'
import { getUniverseOrbitPosition } from '../utils/orbit'

interface PluginNodeObject {
  node: UniversePluginNode
  root: THREE.Group
  card: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  particle: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  texture: THREE.CanvasTexture
}

export interface PluginNodeSystem {
  root: THREE.Group
  update: (elapsed: number, camera: THREE.Camera, focusedNodeId: string | null) => void
  pick: (raycaster: THREE.Raycaster) => UniversePluginNode | null
  dispose: () => void
}

const CARD_WIDTH = 2.15
const CARD_HEIGHT = 2.55
const FAR_DISTANCE = 26

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.closePath()
}

function drawCardTexture(
  node: UniversePluginNode,
  canvas: HTMLCanvasElement,
  texture: THREE.CanvasTexture,
  image?: HTMLImageElement,
) {
  const ctx = canvas.getContext('2d')!
  const color = node.color

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, 'rgba(255,255,255,0.08)')
  gradient.addColorStop(1, 'rgba(255,255,255,0.015)')
  ctx.fillStyle = 'rgba(3, 5, 11, 0.74)'
  drawRoundedRect(ctx, 28, 28, 456, 584, 34)
  ctx.fill()
  ctx.fillStyle = gradient
  ctx.fill()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.72
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.fillStyle = color
  drawRoundedRect(ctx, 146, 88, 220, 220, 38)
  ctx.globalAlpha = 0.16
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.stroke()

  if (image) {
    const size = 132
    ctx.drawImage(image, 256 - size / 2, 198 - size / 2, size, size)
  } else {
    const initials = node.label
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    ctx.fillStyle = color
    ctx.font = '700 84px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials || 'ND', 256, 198)
  }

  ctx.fillStyle = '#f7f8ff'
  ctx.font = '600 42px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  const clippedName = node.label.length > 18 ? `${node.label.slice(0, 16)}...` : node.label
  ctx.fillText(clippedName, 256, 420)

  ctx.fillStyle = 'rgba(247, 248, 255, 0.54)'
  ctx.font = '500 28px Inter, system-ui, sans-serif'
  const clippedCategory = node.category.length > 22 ? `${node.category.slice(0, 20)}...` : node.category
  ctx.fillText(clippedCategory, 256, 468)

  texture.needsUpdate = true
}

function createCardTexture(node: UniversePluginNode): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 640
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  drawCardTexture(node, canvas, texture)

  if (node.icon.kind === 'image' && canUseImageInCanvas(node.icon.value)) {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => drawCardTexture(node, canvas, texture, image)
    image.onerror = () => drawCardTexture(node, canvas, texture)
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

  const texture = createCardTexture(node)
  const cardGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT)
  const cardMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })
  const card = new THREE.Mesh(cardGeometry, cardMaterial)
  card.userData.nodeId = node.id
  root.add(card)

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
    card,
    particle,
    texture,
  }
}

export function createPluginNodeSystem(nodes: UniversePluginNode[]): PluginNodeSystem {
  const root = new THREE.Group()
  const objects = nodes.map(createPluginObject)
  const selectableCards = objects.map((object) => object.card)

  objects.forEach((object) => root.add(object.root))

  return {
    root,
    update: (elapsed, camera, focusedNodeId) => {
      for (const object of objects) {
        const angle = object.node.orbitOffset + elapsed * object.node.orbitSpeed
        const position = getUniverseOrbitPosition(object.node.orbitRadius, angle, object.node.orbitLane)
        object.root.position.set(position.x, position.y, position.z)
        object.node.position = position
        object.card.lookAt(camera.position)

        const distance = camera.position.distanceTo(object.root.position)
        const isFocused = focusedNodeId === object.node.id
        const showCard = isFocused || distance < FAR_DISTANCE
        object.card.visible = showCard
        object.particle.visible = !showCard
        object.card.material.opacity = isFocused ? 1 : THREE.MathUtils.clamp(1 - (distance - 12) / 22, 0.34, 0.9)
        object.root.scale.setScalar(isFocused ? 1.18 : 1)
      }
    },
    pick: (raycaster) => {
      const intersections = raycaster.intersectObjects(selectableCards, false)
      const hit = intersections[0]?.object
      if (!hit?.userData.nodeId) return null
      return objects.find((object) => object.node.id === hit.userData.nodeId)?.node ?? null
    },
    dispose: () => {
      for (const object of objects) {
        object.card.geometry.dispose()
        object.card.material.dispose()
        object.particle.geometry.dispose()
        object.particle.material.dispose()
        object.texture.dispose()
      }
    },
  }
}
