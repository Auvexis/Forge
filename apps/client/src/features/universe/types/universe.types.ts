import type { PluginSummary, PluginStatus } from '@/core/types/plugin.types'

export type UniverseIconKind = 'image' | 'lucide'
export type UniverseNodeLod = 'artifact' | 'particle'

export interface UniverseVector3 {
  x: number
  y: number
  z: number
}

export interface UniversePluginNode {
  id: string
  plugin: PluginSummary
  label: string
  description: string
  category: string
  status: PluginStatus
  icon: {
    kind: UniverseIconKind
    value: string
  }
  color: string
  orbitRadius: number
  orbitSpeed: number
  orbitOffset: number
  orbitLane: number
  position: UniverseVector3
  lod: {
    nearDistance: number
    farDistance: number
    mode: UniverseNodeLod
  }
}

export interface UniversePluginMap {
  nodes: UniversePluginNode[]
  categories: string[]
  totalPlugins: number
  connectedPlugins: number
}
