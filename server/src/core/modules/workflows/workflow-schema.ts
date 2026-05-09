import { VALID_NODE_TYPES } from "./workflow-validation.ts";
import type { Nod8Plugin } from "../../../shared/models/plugin-types.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

export interface WorkflowSchemaDependencies {
  getPlugin?: (pluginId: string) => Nod8Plugin;
}

export function buildWorkflowSchema(
  workflow: WorkflowItem,
  dependencies: WorkflowSchemaDependencies = {},
) {
  const nodeSchemas: Record<string, any> = {};

  for (const [nodeId, node] of Object.entries(workflow.nodes)) {
    const baseSchema: any = {
      type: node.type,
      name: node.name,
    };

    switch (node.type) {
      case "plugin":
        try {
          const plugin = dependencies.getPlugin?.(node.pluginId);
          const methodManifest = plugin?.manifest.methods[node.action];
          baseSchema.pluginId = node.pluginId;
          baseSchema.action = node.action;
          baseSchema.pluginName = plugin?.manifest.metadata.name;
          baseSchema.pluginIcon = plugin?.manifest.metadata.icon;
          baseSchema.parameters = methodManifest?.parameters ?? {};
          baseSchema.responseSchema = methodManifest?.responseSchema ?? null;
        } catch {
          baseSchema.pluginId = node.pluginId;
          baseSchema.action = node.action;
          baseSchema.parameters = {};
        }
        break;
      case "code":
        baseSchema.language = node.language;
        break;
      case "if":
        baseSchema.condition = node.condition;
        baseSchema.handles = ["then", "else"];
        break;
      case "loop":
        baseSchema.collection = node.collection;
        baseSchema.maxIterations = node.maxIterations;
        baseSchema.handles = ["loop-body", "loop-done"];
        break;
      case "subworkflow":
        baseSchema.workflowId = node.workflowId;
        baseSchema.inputMapping = node.inputMapping;
        break;
      case "http":
        baseSchema.method = node.method;
        baseSchema.url = node.url;
        break;
      case "event":
        baseSchema.eventName = node.eventName;
        baseSchema.payloadMapping = node.payloadMapping;
        break;
      case "switch":
        baseSchema.inputExpression = node.inputExpression;
        baseSchema.handles = node.cases.map((switchCase) => switchCase.handleId);
        if (node.fallbackHandleId) baseSchema.handles.push(node.fallbackHandleId);
        break;
      case "split-in-batches":
        baseSchema.collection = node.collection;
        baseSchema.batchSize = node.batchSize;
        baseSchema.handles = ["batch-body", "batch-done"];
        break;
      case "respond-webhook":
        baseSchema.statusCode = node.statusCode;
        break;
      case "wait-form":
        baseSchema.title = node.title;
        baseSchema.description = node.description;
        baseSchema.fields = node.fields;
        baseSchema.expiresInSeconds = node.expiresInSeconds;
        break;
    }

    nodeSchemas[nodeId] = baseSchema;
  }

  return {
    workflowId: workflow.metadata.id,
    name: workflow.metadata.name,
    version: workflow.metadata.version,
    isDraft: workflow.metadata.isDraft,
    trigger: workflow.trigger,
    nodes: nodeSchemas,
    edges: workflow.edges,
    variables: workflow.variables || [],
    availableNodeTypes: [...VALID_NODE_TYPES],
  };
}
