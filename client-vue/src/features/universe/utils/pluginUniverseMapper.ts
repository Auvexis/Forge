import type { PluginSummary } from '@/core/types/plugin.types'
import type { UniversePluginMap, UniversePluginNode, UniverseVector3 } from '../types/universe.types'

const NODE_COLORS = [
  '#67e8f9',
  '#a78bfa',
  '#f9b643',
  '#34d399',
  '#f87171',
  '#60a5fa',
  '#f472b6',
]

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
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

function getInitialPosition(radius: number, offset: number, lane: number): UniverseVector3 {
  return {
    x: Math.cos(offset) * radius,
    y: (lane - 1) * 1.2,
    z: Math.sin(offset) * radius,
  }
}

export function mapPluginsToUniverse(plugins: PluginSummary[]): UniversePluginMap {
  const sortedPlugins = [...plugins].sort((a, b) =>
    a.manifest.metadata.name.localeCompare(b.manifest.metadata.name),
  )

  const nodes: UniversePluginNode[] = sortedPlugins.map((plugin, index) => {
    const metadata = plugin.manifest.metadata
    const seed = hashString(plugin.id)
    const lane = seed % 3
    const orbitRadius = 7 + (index % 6) * 1.55 + lane * 0.6
    const orbitOffset = ((seed % 360) / 180) * Math.PI
    const color = getNodeColor(plugin, index)
    const iconValue = metadata.style?.icon ?? metadata.icon ?? 'blocks'

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
      orbitRadius,
      orbitSpeed: 0.018 + (seed % 7) * 0.002,
      orbitOffset,
      position: getInitialPosition(orbitRadius, orbitOffset, lane),
      lod: {
        nearDistance: 14,
        farDistance: 28,
        mode: 'card',
      },
    }
  })

  const categories = Array.from(new Set(nodes.map((node) => node.category))).sort((a, b) =>
    a.localeCompare(b),
  )

  return {
    nodes,
    categories,
    totalPlugins: nodes.length,
    connectedPlugins: nodes.filter((node) => node.status === 'connected').length,
  }
}
