import type { PluginCreatorRenderedRequest } from "./plugin-blueprint-types.ts";

export type PluginMethodTraceEventType =
  | "node:running"
  | "node:success"
  | "node:failed"
  | "method:success"
  | "method:failed";

export interface PluginMethodTraceEvent {
  type: PluginMethodTraceEventType;
  timestamp: string;
  nodeId?: string;
  output?: unknown;
  error?: string;
  request?: PluginCreatorRenderedRequest;
  status?: number | null;
}
