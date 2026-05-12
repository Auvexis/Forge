import { AppRepository } from "../app/app-repository.ts";
import type { WorkflowExecutionContext } from "../../nodes/types.ts";
import type { WorkflowItem, WorkflowVariable } from "../../../shared/models/workflow-types.ts";

export function sanitizeContextForLogging(context: any): any {
  if (context === null || context === undefined) return context;

  if (Buffer.isBuffer(context)) {
    return `<Buffer size: ${context.length}>`;
  }

  if (
    typeof context === "object" &&
    typeof context.pipe === "function" &&
    typeof context.on === "function"
  ) {
    return "<ReadableStream>";
  }

  if (Array.isArray(context)) {
    return context.map(sanitizeContextForLogging);
  }

  if (typeof context === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(context)) {
      if (key.startsWith("_") && typeof value === "object") continue;
      sanitized[key] = sanitizeContextForLogging(value);
    }
    return sanitized;
  }

  return context;
}

export function createExecutionContext(
  workflow: WorkflowItem,
  triggerPayload: any,
  executionId: string,
): WorkflowExecutionContext {
  return {
    _workflowId: workflow.metadata.id,
    _executionId: executionId,
    trigger: triggerPayload,
    steps: {},
    variables: initializeVariables(workflow.variables),
    env: AppRepository.getAllGlobalVariablesAsMap(),
    _event_payloads: {},
  };
}

function initializeVariables(
  definitions: WorkflowVariable[] | undefined,
): Record<string, any> {
  const variables: Record<string, any> = {};
  if (!definitions) return variables;

  for (const definition of definitions) {
    if (definition.defaultValue !== undefined) {
      variables[definition.name] = definition.defaultValue;
      continue;
    }

    switch (definition.type) {
      case "string":
      case "secret":
        variables[definition.name] = "";
        break;
      case "number":
        variables[definition.name] = 0;
        break;
      case "boolean":
        variables[definition.name] = false;
        break;
      case "object":
        variables[definition.name] = {};
        break;
      case "array":
        variables[definition.name] = [];
        break;
    }
  }

  return variables;
}
