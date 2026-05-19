import type { PluginSummary } from '@/core/types/plugin.types'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'
import type { UniversePluginMap, UniversePluginNode } from '../types/universe.types'

// ─── Palette ─────────────────────────────────────────────────────────────────

const NODE_COLORS = [
  '#67e8f9',
  '#a78bfa',
  '#f9b643',
  '#34d399',
  '#f87171',
  '#60a5fa',
  '#f472b6',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashString(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

/** Deterministic seeded pseudo-random (same as pluginNodeSystem). */
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function isImageIcon(icon: string): boolean {
  const normalized = icon.toLowerCase()
  return (
    normalized.startsWith('http') ||
    normalized.startsWith('/') ||
    normalized.startsWith('data:image/') ||
    /\.(png|jpg|jpeg|svg|webp|gif|avif)$/.test(normalized)
  )
}

function getNodeColor(plugin: PluginSummary, fallbackIndex: number): string {
  return plugin.manifest.metadata.style?.iconColor ?? NODE_COLORS[fallbackIndex % NODE_COLORS.length]!
}

/**
 * Computes the deterministic world-space position used both here (for
 * the focus camera target in UniverseScene) and inside pluginNodeSystem.
 * Must stay in sync with getSpiralPosition() in pluginNodeSystem.ts.
 */
function computeSpiralPosition(nodeId: string): { x: number; y: number; z: number } {
  const NUM_ARMS = 4
  const GALAXY_RADIUS = 120

  const seed = hashString(nodeId)
  const rng = seededRandom(seed)

  const armIndex = seed % NUM_ARMS
  const baseAngle = (armIndex / NUM_ARMS) * Math.PI * 2

  const radius = 28 + Math.pow(rng(), 0.65) * (GALAXY_RADIUS * 0.72)
  // spinAngle = radius * 1.2 — same formula as galaxy arm particles
  const angle = baseAngle + radius * 1.2 + (rng() - 0.5) * 0.08 * radius

  // Y: tightly within galaxy midplane (±2.5 units) — matches pluginNodeSystem
  const y = (rng() * 2 - 1) * 2.5

  return {
    x: Math.cos(angle) * radius,
    y,
    z: Math.sin(angle) * radius,
  }
}

// ─── Public mapper ────────────────────────────────────────────────────────────

export function mapPluginsToUniverse(plugins: PluginSummary[]): UniversePluginMap {
  const sorted = [...plugins].sort((a, b) =>
    a.manifest.metadata.name.localeCompare(b.manifest.metadata.name),
  )

  const nodes: UniversePluginNode[] = sorted.map((plugin, index) => {
    const metadata = plugin.manifest.metadata
    const iconValue = resolvePluginIcon(metadata, { isDark: true, fallback: 'blocks' })
    const color = getNodeColor(plugin, index)

    return {
      id: plugin.id,
      plugin,
      label: metadata.name,
      description: metadata.description,
      category: metadata.category || 'Integrations',
      status: plugin.status.status,
      icon: {
        kind: isImageIcon(iconValue) ? 'image' : 'lucide',
        value: iconValue,
      },
      color,
      // These three are legacy fields kept for type compat.
      // The actual 3D position is computed deterministically in pluginNodeSystem.
      orbitRadius: 0,
      orbitSpeed: 0,
      orbitOffset: 0,
      orbitLane: 0,
      // position IS used by UniverseScene for focus-camera targeting.
      position: computeSpiralPosition(plugin.id),
      lod: {
        nearDistance: 18,
        farDistance: 80,
        mode: 'artifact',
      },
    }
  })

  const categories = Array.from(new Set(nodes.map((n) => n.category))).sort((a, b) =>
    a.localeCompare(b),
  )

  return {
    nodes,
    categories,
    totalPlugins: nodes.length,
    connectedPlugins: nodes.filter((n) => n.status === 'connected').length,
  }
}
