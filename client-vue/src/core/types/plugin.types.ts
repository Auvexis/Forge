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
  oauth_ui?: {
    oauthCallbackInstructions?: string
    buttonText?: string
    buttonIcon?: string
  }
  oauth_redirect_uri?: string
  oauth_public_url_required?: boolean
  oauth_public_url_warning?: string
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
  utility?: boolean
  style?: {
    icon?: string
    iconColor?: string
    bgColor?: string
    borderColor?: string
  }
}

// ── JSON Schema Types ─────────────────────────────────────────

/**
 * Instructs the Frontend to populate a select/multiselect field by calling
 * a specific method on the plugin itself. Keeps the frontend 100% generic.
 */
export interface DynamicOptionsConfig {
  method: string
  labelPath: string
  valuePath: string
  dependsOn?: string[]
}

/**
 * Conditionally shows or hides a field based on the value of a sibling field.
 */
export interface VisibleIfConfig {
  field: string
  operator: 'equals' | 'not_equals' | 'in' | 'contains'
  value: unknown
}

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
  // ── Sailor UI extensions ──────────────────────────────────────
  'x-input-type'?:
    | 'text'
    | 'password'
    | 'number'
    | 'url'
    | 'email'
    | 'file'
    | 'files'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'toggle'
    | 'datetime'
    | 'code'
    | 'json'
  'x-label'?: string
  'x-sailor-display'?: 'file' | 'folder' | 'media' | 'text' | 'generic'
  'x-sailor-icon'?: string
  'x-dynamic-options'?: DynamicOptionsConfig
  'x-visible-if'?: VisibleIfConfig
}

export interface JSONSchemaObject {
  type: 'object'
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface JSONSchemaResponse {
  type: 'object' | 'array'
  'x-sailor-display'?: 'file' | 'folder' | 'media' | 'text' | 'generic'
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

// ── Plugin Trigger Manifest ────────────────────────────────

export interface PluginTriggerManifest {
  metadata: {
    label: string
    description: string
  }
  parameters?: JSONSchemaObject
}

export interface PluginManifest {
  metadata: PluginMetadata
  methods: Record<string, PluginMethodManifest>
  /** Optional trigger declarations keyed by trigger name (e.g. "onMessage"). */
  triggers?: Record<string, PluginTriggerManifest>
}

// ── Plugin Summary (from GET /plugins) ───────────────────────

export interface PluginSummary {
  id: string
  manifest: PluginManifest
  status: PluginStatusResponse
  auth_type: PluginAuthType
}

export type ExternalPluginInstallScope = 'current_profile' | 'selected_profile' | 'all_profiles'
export type ExternalPluginPreviewStatus = 'ready' | 'invalid' | 'expired'

export interface ExternalPluginPreviewMethod {
  name: string
  label: string
  description: string
}

export interface ExternalPluginPreview {
  previewId: string
  status: ExternalPluginPreviewStatus
  manifest: PluginManifest | null
  methodNames: string[]
  triggerNames: string[]
  authType: string | null
  warnings: string[]
  errors: string[]
  source: {
    type: 'repository_url' | 'extracted_folder'
    originalValue: string
    cachedAt: string
  }
  createdAt: string
  expiresAt: string
}

export interface ExternalPluginInstallResult {
  installId: string
  pluginId: string
  version: string
  installPath: string
  scope: ExternalPluginInstallScope
  profileId?: string
  reloadStatus: 'loaded' | 'restart_required' | 'failed'
  error?: string
}
