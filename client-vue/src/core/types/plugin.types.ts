// ─────────────────────────────────────────────────────────────
//  Plugin Types — mirrors server/src/shared/models/plugin-types.ts
// ─────────────────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────

export type PluginAuthType = 'oauth2' | 'api_key' | 'none'

export interface CredentialField {
  type: 'string' | 'number' | 'boolean'
  inputType: 'text' | 'password' | 'number' | 'textarea' | 'url' | 'email'
  label: string
  description?: string
  required: boolean
  placeholder?: string
}

export type CredentialSchema = Record<string, CredentialField>

// ── Plugin Status ────────────────────────────────────────────

export type PluginStatus = 'not_configured' | 'configured' | 'connected' | 'error'

export interface PluginStatusResponse {
  status: PluginStatus
  auth_type: PluginAuthType
  credential_schema: CredentialSchema | null
  credentials: Record<string, string> | null
  locked_fields?: string[]
  error?: string
}

// ── Plugin Metadata ──────────────────────────────────────────

export interface PluginMetadata {
  id: string
  name: string
  description: string
  icon: string
  category: string
  author: string
  version: string
  repository: string
}

// ── JSON Schema Types ─────────────────────────────────────────

export interface JSONSchemaProperty {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'
  description?: string
  default?: unknown
  enum?: unknown[]
  format?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean | JSONSchemaProperty
  items?: JSONSchemaProperty
  minItems?: number
  maxItems?: number
  // Nod8-specific extensions
  'x-input-type'?: 'text' | 'password' | 'number' | 'url' | 'email' | 'file' | 'textarea'
  'x-label'?: string
  'x-nod8-display'?: 'file' | 'folder' | 'media' | 'text' | 'generic'
  'x-nod8-icon'?: string
}

export interface JSONSchemaObject {
  type: 'object'
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface JSONSchemaResponse {
  type: 'object' | 'array'
  'x-nod8-display'?: 'file' | 'folder' | 'media' | 'text' | 'generic'
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  items?: JSONSchemaProperty & {
    type?: string
    properties?: Record<string, JSONSchemaProperty>
  }
}

// ── Method Manifest ───────────────────────────────────────────

export interface PluginMethodUI {
  component: 'table' | 'card' | 'text' | 'generic'
  download?: {
    field: string
    fileName: string
    mimeType: string
  }
  actions?: Array<{
    label: string
    action: string
    parameters: Record<string, string>
    visibleIf?: { field: string; equals: unknown }
  }>
}

export interface PluginMethodManifest {
  metadata: {
    label: string
    description: string
  }
  parameters: JSONSchemaObject
  responseSchema: JSONSchemaResponse
  ui: PluginMethodUI
}

export interface PluginManifest {
  metadata: PluginMetadata
  methods: Record<string, PluginMethodManifest>
}

// ── Plugin Summary (from GET /plugins) ───────────────────────

export interface PluginSummary {
  id: string
  manifest: PluginManifest
  status: PluginStatusResponse
  auth_type: PluginAuthType
}
