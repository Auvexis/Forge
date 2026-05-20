export const PLUGIN_BLUEPRINT_INPUT_TYPES = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "select",
  "file",
] as const;

export const PLUGIN_BLUEPRINT_HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
] as const;

export const PLUGIN_BLUEPRINT_AUTH_TYPES = [
  "none",
  "apiKey",
  "bearer",
  "basic",
] as const;

export type PluginBlueprintInputType = (typeof PLUGIN_BLUEPRINT_INPUT_TYPES)[number];
export type PluginBlueprintHttpMethod = (typeof PLUGIN_BLUEPRINT_HTTP_METHODS)[number];
export type PluginBlueprintAuthType = (typeof PLUGIN_BLUEPRINT_AUTH_TYPES)[number];

export interface PluginBlueprintMetadata {
  handle: string;
  name: string;
  version: string;
  description: string;
}

export interface PluginBlueprintIcons {
  icon?: string;
  iconDark?: string;
  iconLight?: string;
}

export type PluginCredentialTarget = "header" | "query" | "body";

export interface PluginBlueprintCredentialField {
  name: string;
  label: string;
  target: PluginCredentialTarget;
  headerName?: string;
  queryName?: string;
  bodyPath?: string;
  prefix?: string;
  description?: string;
  required?: boolean;
}

export interface PluginBlueprintAuth {
  type: PluginBlueprintAuthType;
  fields: PluginBlueprintCredentialField[];
}

export interface PluginBlueprintInputOption {
  label: string;
  value: string | number | boolean;
}

export interface PluginBlueprintInput {
  name: string;
  type: PluginBlueprintInputType;
  required: boolean;
  default?: unknown;
  placeholder?: string;
  description?: string;
  options?: PluginBlueprintInputOption[];
}

export interface PluginBlueprintKeyValue {
  name: string;
  value: unknown;
}

export interface PluginBlueprintRequestBody {
  type: "none" | "json" | "text" | "form";
  value?: unknown;
}

export interface PluginBlueprintRequest {
  method: PluginBlueprintHttpMethod;
  url: string;
  headers: PluginBlueprintKeyValue[];
  query: PluginBlueprintKeyValue[];
  body: PluginBlueprintRequestBody;
}

export type PluginBlueprintOutputType = Exclude<PluginBlueprintInputType, "file">;

export interface PluginBlueprintResponseMapping {
  id: string;
  outputName: string;
  path: string;
  type: PluginBlueprintOutputType;
  required?: boolean;
}

export type PluginBlueprintErrorConditionSource = "status" | "body";
export type PluginBlueprintErrorConditionOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEquals"
  | "lessThan"
  | "lessThanOrEquals"
  | "exists"
  | "notExists";

export interface PluginBlueprintErrorCondition {
  source: PluginBlueprintErrorConditionSource;
  operator: PluginBlueprintErrorConditionOperator;
  value?: unknown;
  path?: string;
}

export type PluginBlueprintErrorMessage =
  | { type: "static"; value: string }
  | { type: "bodyPath"; path: string; fallback?: string };

export interface PluginBlueprintErrorMapping {
  id: string;
  code: string;
  condition: PluginBlueprintErrorCondition;
  message: PluginBlueprintErrorMessage;
}

export interface PluginBlueprintMethod {
  id: string;
  handle: string;
  name: string;
  description: string;
  category?: string;
  inputs: PluginBlueprintInput[];
  request: PluginBlueprintRequest;
  responseMapping: PluginBlueprintResponseMapping[];
  errorMapping: PluginBlueprintErrorMapping[];
}

export type PluginBlueprintNodeType =
  | "method"
  | "input"
  | "credential"
  | "request"
  | "header"
  | "query"
  | "body"
  | "responseMapper"
  | "errorMapper"
  | "output"
  | "note"
  | "group";

export interface PluginBlueprintPosition {
  x: number;
  y: number;
}

export interface PluginBlueprintNode {
  id: string;
  type: PluginBlueprintNodeType;
  position: PluginBlueprintPosition;
  data: Record<string, unknown>;
}

export interface PluginBlueprintEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface PluginBlueprintCanvas {
  nodes: Record<string, PluginBlueprintNode>;
  edges: PluginBlueprintEdge[];
}

export interface PluginBlueprint {
  id: string;
  metadata: PluginBlueprintMetadata;
  icons: PluginBlueprintIcons;
  auth: PluginBlueprintAuth;
  methods: PluginBlueprintMethod[];
  canvas: PluginBlueprintCanvas;
  createdAt: string;
  updatedAt: string;
}

export type PluginCreatorSnapshotReason =
  | "manual-save"
  | "pre-publish"
  | "rollback-point"
  | "autosave";

export interface PluginCreatorSnapshot {
  id: string;
  blueprintId: string;
  createdAt: string;
  reason: PluginCreatorSnapshotReason;
  version: string;
  blueprint: PluginBlueprint;
}

export interface PluginCreatorRelease {
  id: string;
  blueprintId: string;
  version: string;
  createdAt: string;
  releaseDir: string;
  snapshotId: string;
}

export interface PluginCreatorRenderedRequest {
  method: PluginBlueprintHttpMethod;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
}

export interface PluginCreatorTestResult {
  methodId: string;
  request: PluginCreatorRenderedRequest;
  status: number | null;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
  error: string | null;
  timestamp: string;
}

export type PluginCreatorLastRun = PluginCreatorTestResult;
