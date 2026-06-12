import type { AllowedNodes } from '../nodePresentation.types'

interface PresetCandidate {
  id: string
  nodeType: string
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
  return allowed.includes(`node:${preset.nodeType}`) || allowed.includes(`preset:${preset.id}`)
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
