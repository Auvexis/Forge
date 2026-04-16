/**
 * Node Editor Registry
 *
 * Maps workflow node data types to their corresponding editor components.
 * To add support for a new node type:
 *   1. Create MyNewEditor.tsx in this directory
 *   2. Import and add an entry below
 *
 * The NodeEditorPanel shell auto-discovers editors via this registry.
 */
import type { ComponentType } from "react";
import type { NodeEditorProps } from "./types";

import { TriggerEditor } from "./TriggerEditor";
import { PluginEditor } from "./PluginEditor";
import { CodeEditor } from "./CodeEditor";
import { IfEditor } from "./IfEditor";
import { LoopEditor } from "./LoopEditor";
import { SubWorkflowEditor } from "./SubWorkflowEditor";
import { HttpEditor } from "./HttpEditor";
import { EmitEventEditor } from "./EmitEventEditor";

// ──────────── Registry ────────────
// Key: ReactFlow node `type` value or `data.type` discriminator.
// "plugin" is the default for action nodes with a pluginId.

export const NODE_EDITOR_REGISTRY: Record<
  string,
  ComponentType<NodeEditorProps>
> = {
  trigger: TriggerEditor,
  plugin: PluginEditor,
  code: CodeEditor,
  if: IfEditor,
  loop: LoopEditor,
  subworkflow: SubWorkflowEditor,
  http: HttpEditor,
  event: EmitEventEditor,
};

export type { NodeEditorProps };
