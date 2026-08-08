import type { AllowedNodes } from '../nodePresentation.types'
import type { PluginSummary } from '@/core/types/plugin.types'
import { buildEmbeddingProviderItems, isVectorStoreProvider } from './addNodePickerModel.ts'

interface PresetCandidate {
  id: string
  nodeType: string
  capabilities?: readonly string[]
}

interface PluginCandidate {
  id: string
  capabilities: readonly string[]
}

export function allowedNodeSelectorsPermitPreset(
  allowed: AllowedNodes,
  preset: PresetCandidate,
): boolean {
  if (allowed === '*') return true
  return allowed.includes(`node:${preset.nodeType}`) ||
    allowed.includes(`preset:${preset.id}`) ||
    Boolean(preset.capabilities?.some((capability) => allowed.includes(`capability:${capability}`)))
}

export function allowedNodeSelectorsPermitPlugin(
  allowed: AllowedNodes,
  plugin: PluginCandidate,
): boolean {
  if (allowed === '*') return true
  return allowed.includes(`plugin:${plugin.id}`) || plugin.capabilities.some((capability) =>
    allowed.includes(`capability:${capability}`),
  )
}

export function pluginAllowedNodeCapabilities(plugin: PluginSummary): string[] {
  const capabilities: string[] = []
  const agent = plugin.manifest.metadata.agentCapabilities

  if (agent?.chatModel?.enabled) capabilities.push('chat-model')
  if (agent?.memoryStore?.enabled) capabilities.push('memory-store')
  if (Object.values(plugin.manifest.methods).some((method) => method.agentTool?.enabled)) {
    capabilities.push('agent-tool')
  }
  if (buildEmbeddingProviderItems({ plugins: [plugin] }).length > 0) {
    capabilities.push('embedding-model')
  }
  if (plugin.manifest.metadata.nodePresentation?.template === 'vector-store' || isVectorStoreProvider(plugin)) {
    capabilities.push('vector-store-provider')
  }

  return capabilities
}
