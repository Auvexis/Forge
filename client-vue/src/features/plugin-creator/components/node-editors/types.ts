import type {
  PluginBlueprint,
  PluginBlueprintCredentialField,
  PluginBlueprintInput,
  PluginBlueprintMethod,
  PluginBlueprintNode,
  PluginBlueprintRequest,
  PluginCreatorTestResult,
} from '@/core/types/plugin-creator.types'

export type PluginCreatorNodeEditorKind =
  | 'method'
  | 'input'
  | 'credential'
  | 'request'
  | 'header'
  | 'query'
  | 'body'
  | 'responseMapper'
  | 'errorMapper'
  | 'codeBlock'
  | 'if'
  | 'switch'
  | 'tryCatch'
  | 'jsonTransform'
  | 'return'
  | 'for'
  | 'forEach'
  | 'output'

export interface PluginCreatorNodeEditorProps {
  blueprint?: PluginBlueprint | null
  nodeId?: string | null
  lastTestResult?: PluginCreatorTestResult | null
}

export type PluginCreatorNodeEditorEmits = {
  updateNode: [nodeId: string, payload: Partial<PluginBlueprintNode>]
  updateMethod: [methodId: string, payload: Partial<PluginBlueprintMethod>]
  updateInput: [methodId: string, inputName: string, payload: Partial<PluginBlueprintInput>]
  updateCredential: [fieldName: string, payload: Partial<PluginBlueprintCredentialField>]
  updateRequest: [methodId: string, payload: Partial<PluginBlueprintRequest>]
  addCredential: []
}

export type PluginCreatorNodeEditorEmitFn = <K extends keyof PluginCreatorNodeEditorEmits>(
  event: K,
  ...args: PluginCreatorNodeEditorEmits[K]
) => void
