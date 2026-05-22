export type PluginBlueprintInputType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'select'
  | 'file'

export type PluginBlueprintHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
export type PluginBlueprintAuthType = 'none' | 'apiKey' | 'bearer' | 'basic'
export type PluginCredentialTarget = 'header' | 'query' | 'body'

export interface PluginBlueprintMetadata {
  handle: string
  name: string
  version: string
  description: string
  category?: string
  author?: string
  repository?: string
  homepage?: string
  docsUrl?: string
  tags?: string[]
}

export interface PluginBlueprintIcons {
  icon?: string
  iconDark?: string
  iconLight?: string
}

export interface PluginBlueprintCredentialField {
  name: string
  label: string
  target: PluginCredentialTarget
  headerName?: string
  queryName?: string
  bodyPath?: string
  prefix?: string
  description?: string
  required?: boolean
}

export interface PluginBlueprintAuth {
  type: PluginBlueprintAuthType
  fields: PluginBlueprintCredentialField[]
}

export interface PluginBlueprintInputOption {
  label: string
  value: string | number | boolean
}

export interface PluginBlueprintInput {
  name: string
  type: PluginBlueprintInputType
  required: boolean
  default?: unknown
  placeholder?: string
  description?: string
  options?: PluginBlueprintInputOption[]
}

export interface PluginBlueprintKeyValue {
  name: string
  value: unknown
}

export interface PluginBlueprintRequestBody {
  type: 'none' | 'json' | 'text' | 'form'
  value?: unknown
}

export interface PluginBlueprintRequest {
  method: PluginBlueprintHttpMethod
  url: string
  headers: PluginBlueprintKeyValue[]
  query: PluginBlueprintKeyValue[]
  body: PluginBlueprintRequestBody
}

export type PluginBlueprintOutputType = Exclude<PluginBlueprintInputType, 'file'>

export interface PluginBlueprintResponseMapping {
  id: string
  outputName: string
  path: string
  type: PluginBlueprintOutputType
  required?: boolean
}

export interface PluginBlueprintErrorCondition {
  source: 'status' | 'body'
  operator:
    | 'equals'
    | 'notEquals'
    | 'greaterThan'
    | 'greaterThanOrEquals'
    | 'lessThan'
    | 'lessThanOrEquals'
    | 'exists'
    | 'notExists'
  value?: unknown
  path?: string
}

export type PluginBlueprintErrorMessage =
  | { type: 'static'; value: string }
  | { type: 'bodyPath'; path: string; fallback?: string }

export interface PluginBlueprintErrorMapping {
  id: string
  code: string
  condition: PluginBlueprintErrorCondition
  message: PluginBlueprintErrorMessage
}

export interface PluginBlueprintCodeBlock {
  id: string
  name: string
  source: string
  outputName?: string
}

export interface PluginBlueprintSwitchCase {
  id: string
  label: string
  value: unknown
  handle?: string
}

export interface PluginBlueprintMethod {
  id: string
  handle: string
  name: string
  description: string
  category?: string
  inputs: PluginBlueprintInput[]
  request: PluginBlueprintRequest
  responseMapping: PluginBlueprintResponseMapping[]
  errorMapping: PluginBlueprintErrorMapping[]
  codeBlocks?: PluginBlueprintCodeBlock[]
}

export type PluginBlueprintNodeType =
  | 'method'
  | 'request'
  | 'responseMapper'
  | 'errorMapper'
  | 'output'
  | 'codeBlock'
  | 'if'
  | 'switch'
  | 'tryCatch'
  | 'jsonTransform'
  | 'return'
  | 'for'
  | 'forEach'
  | 'input'
  | 'credential'
  | 'header'
  | 'query'
  | 'body'
  | 'note'
  | 'group'

export interface PluginBlueprintPosition {
  x: number
  y: number
}

export interface PluginBlueprintBaseNodeData {
  methodId?: string
}

export interface PluginBlueprintIfNodeData extends PluginBlueprintBaseNodeData {
  condition: string
}

export interface PluginBlueprintSwitchNodeData extends PluginBlueprintBaseNodeData {
  expression: string
  cases?: PluginBlueprintSwitchCase[]
}

export interface PluginBlueprintTryCatchNodeData extends PluginBlueprintBaseNodeData {
  errorVariable?: string
}

export interface PluginBlueprintJsonTransformNodeData extends PluginBlueprintBaseNodeData {
  expression: string
  outputName?: string
}

export interface PluginBlueprintReturnNodeData extends PluginBlueprintBaseNodeData {
  valueExpression: string
}

export interface PluginBlueprintForNodeData extends PluginBlueprintBaseNodeData {
  itemVariable: string
  fromExpression?: string
  toExpression?: string
  iterableExpression?: string
}

export interface PluginBlueprintForEachNodeData extends PluginBlueprintBaseNodeData {
  arrayExpression: string
  itemVariable: string
}

export type PluginBlueprintNodeData =
  | PluginBlueprintIfNodeData
  | PluginBlueprintSwitchNodeData
  | PluginBlueprintTryCatchNodeData
  | PluginBlueprintJsonTransformNodeData
  | PluginBlueprintReturnNodeData
  | PluginBlueprintForNodeData
  | PluginBlueprintForEachNodeData
  | Record<string, unknown>

export interface PluginBlueprintNode {
  id: string
  type: PluginBlueprintNodeType
  position: PluginBlueprintPosition
  data: PluginBlueprintNodeData
}

export interface PluginBlueprintEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface PluginBlueprintCanvas {
  nodes: Record<string, PluginBlueprintNode>
  edges: PluginBlueprintEdge[]
}

export interface PluginBlueprint {
  id: string
  metadata: PluginBlueprintMetadata
  icons: PluginBlueprintIcons
  auth: PluginBlueprintAuth
  methods: PluginBlueprintMethod[]
  canvas: PluginBlueprintCanvas
  createdAt: string
  updatedAt: string
}

export interface CreatePluginBlueprintPayload {
  handle: string
  name: string
  description: string
  icon?: string
  iconDark?: string
  iconLight?: string
  includeDefaultMethod?: boolean
}

export interface PluginCreatorRenderedRequest {
  method: PluginBlueprintHttpMethod
  url: string
  headers: Record<string, string>
  query: Record<string, string>
  body?: unknown
}

export interface PluginCreatorTestResult {
  methodId: string
  request: PluginCreatorRenderedRequest
  status: number | null
  headers: Record<string, string>
  body: unknown
  durationMs: number
  error: string | null
  timestamp: string
}

export interface PluginCreatorTestMethodPayload {
  methodId: string
  params: Record<string, unknown>
  credentials: Record<string, unknown>
  timeoutMs?: number
}

export interface PluginCreatorGeneratedFilePreview {
  relativePath: string
  content: string
}

export interface PluginCreatorGeneratePreviewResult {
  files: PluginCreatorGeneratedFilePreview[]
}

export type PluginCreatorSnapshotReason =
  | 'manual-save'
  | 'pre-publish'
  | 'rollback-point'
  | 'autosave'

export interface PluginCreatorSnapshot {
  id: string
  blueprintId: string
  createdAt: string
  reason: PluginCreatorSnapshotReason
  version: string
  blueprint: PluginBlueprint
}

export interface PluginCreatorRelease {
  id: string
  blueprintId: string
  version: string
  createdAt: string
  releaseDir: string
  snapshotId: string
}

export interface PluginCreatorVersionsResult {
  snapshots: PluginCreatorSnapshot[]
  releases: PluginCreatorRelease[]
}

export interface RollbackPluginBlueprintPayload {
  snapshotId: string
}
