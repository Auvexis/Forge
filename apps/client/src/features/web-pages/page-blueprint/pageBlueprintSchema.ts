export type PageBlueprintNodeKind = 'element' | 'utility' | 'component'

export type PageBlueprintUtilityNodeType =
  | 'run-workflow'
  | 'transform-data'
  | 'if-else'
  | 'switch'
  | 'set-css'
  | 'javascript'

export type PageBlueprintFieldType =
  | 'event'
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'css'
  | 'unknown'

export type PageBlueprintFieldDirection = 'input' | 'output' | 'both'
export type PageBlueprintFieldMode = 'single' | 'multiple'

export interface PageBlueprintFieldSchema {
  id: string
  label: string
  type?: PageBlueprintFieldType
  mode?: PageBlueprintFieldMode
  fields?: PageBlueprintFieldSchema[]
}

export interface PageBlueprintField {
  id: string
  label: string
  type?: PageBlueprintFieldType
  direction: PageBlueprintFieldDirection
  value?: string
  expression?: string
  inputConnected?: boolean
  outputConnected?: boolean
  mode?: PageBlueprintFieldMode
  schema?: PageBlueprintFieldSchema[]
  configurable?: boolean
  data?: Record<string, unknown>
}

export interface PageBlueprintNode {
  id: string
  kind: PageBlueprintNodeKind
  type: string
  label: string
  icon?: string
  accent?: string
  fields: PageBlueprintField[]
  data?: Record<string, unknown>
}

export interface PageBlueprintElementNode extends PageBlueprintNode {
  kind: 'element'
  type: 'page-element'
  elementId: string
}

export interface PageBlueprintUtilityNode extends PageBlueprintNode {
  kind: 'utility'
  type: PageBlueprintUtilityNodeType
}

export interface PageBlueprintComponentNode extends PageBlueprintNode {
  kind: 'component'
  type: 'page-component'
  componentId: string
}

export interface PageBlueprintConnectionEndpoint {
  nodeId: string
  fieldId: string
}

export interface PageBlueprintConnection {
  id: string
  from: PageBlueprintConnectionEndpoint
  to: PageBlueprintConnectionEndpoint
  expression: string
}

export interface PageBlueprintRepeatBinding {
  id: string
  source: PageBlueprintConnectionEndpoint
  targetNodeId: string
  targetElementId: string
  collectionPath: string
  itemAlias: string
  createdAt: string
}

export interface PageBlueprintComponentPort {
  id: string
  label: string
  type?: PageBlueprintFieldType
  mode?: PageBlueprintFieldMode
  target: PageBlueprintConnectionEndpoint
}

export interface PageBlueprintComponent {
  id: string
  name: string
  rootNodeId: string
  rootElementId?: string
  nodeIds: string[]
  props: PageBlueprintComponentPort[]
  events: PageBlueprintComponentPort[]
  createdAt: string
  updatedAt: string
}
