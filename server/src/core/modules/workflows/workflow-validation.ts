import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

export const VALID_NODE_TYPES = new Set([
  "plugin",
  "code",
  "if",
  "loop",
  "subworkflow",
  "trigger",
  "http",
  "event",
  "event-listener",
  "set",
  "switch",
  "merge",
  "split-in-batches",
  "respond-webhook",
  "wait-form",
  "ai-agent",
  "ai-model",
  "ai-memory",
  "ai-tool",
]);

const VALID_FORM_FIELD_TYPES = new Set([
  "text",
  "email",
  "number",
  "textarea",
  "date",
  "password",
  "file",
  "select",
  "multiselect",
  "checkbox",
  "checkbox-group",
  "radio",
  "quiz",
  "tel",
  "url",
]);
const FORM_FIELD_NAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;
const FORM_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateWorkflowDefinition(workflow: WorkflowItem): string | null {
  if (!workflow.metadata?.id || !workflow.metadata?.name) {
    return "Workflow must have metadata with id and name";
  }

  if (!workflow.trigger?.type) {
    return "Workflow must have a trigger with type";
  }

  if (workflow.trigger.type === "form") {
    const formError = validateTriggerConfig(workflow.trigger, "Form trigger");
    if (formError) return formError;
  }

  if (!workflow.nodes || typeof workflow.nodes !== "object") {
    return "Workflow must have a nodes map";
  }

  if (!Array.isArray(workflow.edges)) {
    return "Workflow must have an edges array";
  }

  for (const [nodeId, node] of Object.entries(workflow.nodes)) {
    if (!node.type || !VALID_NODE_TYPES.has(node.type)) {
      return `Node "${nodeId}" has invalid type: "${(node as any).type}". Valid types: ${[...VALID_NODE_TYPES].join(", ")}`;
    }

    const nodeError = validateNode(nodeId, node);
    if (nodeError) return nodeError;
  }

  const validNodeIds = new Set(["trigger", ...Object.keys(workflow.nodes)]);
  for (const edge of workflow.edges) {
    if (!validNodeIds.has(edge.source)) {
      return `Edge "${edge.id}" references unknown source node "${edge.source}"`;
    }
    if (!validNodeIds.has(edge.target)) {
      return `Edge "${edge.id}" references unknown target node "${edge.target}"`;
    }
  }

  return null;
}

function validateTriggerConfig(
  trigger: NonNullable<WorkflowItem["nodes"][string] & { type: "trigger" }>["trigger"] | WorkflowItem["trigger"],
  label: string,
): string | null {
  if (!trigger?.type) return `${label} must have type`;

  if (trigger.type === "form") {
    if (trigger.formSlug && !FORM_SLUG_REGEX.test(trigger.formSlug)) {
      return `Form ID must be kebab-case (e.g. 'contact-us'). Got: '${trigger.formSlug}'`;
    }
    if (!Array.isArray(trigger.formFields)) {
      return `${label} must have a formFields array`;
    }

    return validateFormFields(trigger.formFields, label);
  }

  if (trigger.type === "webhook" || trigger.type === "plugin") {
    if (trigger.webhookSlug && !FORM_SLUG_REGEX.test(trigger.webhookSlug)) {
      return `Webhook slug must be kebab-case (e.g. 'new-sale'). Got: '${trigger.webhookSlug}'`;
    }
  }

  if (trigger.type === "cron" && !trigger.cronExpression) {
    return `${label} must have cronExpression`;
  }

  if (trigger.type === "plugin" && (!trigger.pluginId || !trigger.triggerName)) {
    return `${label} must have pluginId and triggerName`;
  }

  if (trigger.type === "chat") {
    if (!trigger.chatSlug || !FORM_SLUG_REGEX.test(trigger.chatSlug)) {
      return `${label} must have chatSlug in kebab-case`;
    }
  }

  return null;
}

function validateFormFields(
  fields: Array<{ name: string; label: string; type: string; options?: Array<{ label: string; value: string }> }>,
  label: string,
): string | null {
  const seenNames = new Set<string>();
  for (const [index, field] of fields.entries()) {
    if (!field || typeof field !== "object") {
      return `${label} field at index ${index} must be an object`;
    }
    if (
      !field.name ||
      typeof field.name !== "string" ||
      !FORM_FIELD_NAME_REGEX.test(field.name)
    ) {
      return `${label} field at index ${index} has invalid name "${field.name}". Use letters, numbers, underscore or dash.`;
    }
    if (seenNames.has(field.name)) {
      return `${label} field name "${field.name}" is duplicated`;
    }
    seenNames.add(field.name);
    if (!VALID_FORM_FIELD_TYPES.has(field.type)) {
      return `${label} field "${field.name}" has invalid type "${field.type}". Valid: ${[...VALID_FORM_FIELD_TYPES].join(", ")}`;
    }
    if (
      ["select", "multiselect", "checkbox-group", "radio", "quiz"].includes(field.type) &&
      (!Array.isArray(field.options) || field.options.length === 0)
    ) {
      return `${label} field "${field.name}" of type "${field.type}" must define at least one option`;
    }
    if (Array.isArray(field.options)) {
      for (const [optionIndex, option] of field.options.entries()) {
        if (!option?.value || !option?.label) {
          return `${label} field "${field.name}" option at index ${optionIndex} must have label and value`;
        }
      }
    }
  }

  return null;
}

function isValidWaitFormExpiration(value: unknown): boolean {
  if (typeof value === "number") return value >= 1;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.includes("{{") && trimmed.includes("}}")) return true;

  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) && numericValue >= 1;
}

function validateNode(nodeId: string, node: WorkflowItem["nodes"][string]): string | null {
  switch (node.type) {
    case "plugin":
      return !node.pluginId || !node.action
        ? `Plugin node "${nodeId}" must have pluginId and action`
        : null;
    case "code":
      return !node.script || typeof node.script !== "string"
        ? `Code node "${nodeId}" must have a script string`
        : null;
    case "if":
      return !node.condition || typeof node.condition !== "string"
        ? `If node "${nodeId}" must have a condition string`
        : null;
    case "loop":
      return !node.collection || typeof node.collection !== "string"
        ? `Loop node "${nodeId}" must have a collection expression`
        : null;
    case "subworkflow":
      return !node.workflowId
        ? `SubWorkflow node "${nodeId}" must have a workflowId`
        : null;
    case "http":
      if (!node.url || typeof node.url !== "string") {
        return `HTTP node "${nodeId}" must have a url string`;
      }
      return !node.method
        ? `HTTP node "${nodeId}" must have a method (GET, POST, etc.)`
        : null;
    case "event":
    case "event-listener":
      return !node.eventName || typeof node.eventName !== "string"
        ? `${node.type === "event" ? "Event" : "Event Listener"} node "${nodeId}" must have an eventName string`
        : null;
    case "set":
      return !Array.isArray(node.assignments) || node.assignments.length === 0
        ? `Set node "${nodeId}" must have a non-empty assignments array`
        : null;
    case "switch":
      if (!node.inputExpression || typeof node.inputExpression !== "string") {
        return `Switch node "${nodeId}" must have an inputExpression string`;
      }
      return !Array.isArray(node.cases) || node.cases.length === 0
        ? `Switch node "${nodeId}" must have a non-empty cases array`
        : null;
    case "merge":
      return !(node.mode === "wait-any" || node.mode === "wait-all")
        ? `Merge node "${nodeId}" must have mode "wait-any" or "wait-all"`
        : null;
    case "split-in-batches":
      if (!node.collection || typeof node.collection !== "string") {
        return `Split In Batches node "${nodeId}" must have a collection expression string`;
      }
      return typeof node.batchSize !== "number" || node.batchSize < 1
        ? `Split In Batches node "${nodeId}" must have batchSize >= 1`
        : null;
    case "respond-webhook":
      if (typeof node.statusCode !== "number") {
        return `Respond To Webhook node "${nodeId}" must have a numeric statusCode`;
      }
      return typeof node.body !== "string"
        ? `Respond To Webhook node "${nodeId}" must have a body string`
        : null;
    case "wait-form":
      if (!node.title || typeof node.title !== "string") {
        return `Wait Form node "${nodeId}" must have a title string`;
      }
      if (!Array.isArray(node.fields) || node.fields.length === 0) {
        return `Wait Form node "${nodeId}" must have at least one field`;
      }
      if (
        node.publicSlug &&
        typeof node.publicSlug !== "string"
      ) {
        return `Wait Form node "${nodeId}" publicSlug must be a string`;
      }
      {
        const fieldError = validateFormFields(node.fields, `Wait Form node "${nodeId}"`);
        if (fieldError) return fieldError;
      }
      if (
        node.expiresInSeconds !== undefined &&
        !isValidWaitFormExpiration(node.expiresInSeconds)
      ) {
        return `Wait Form node "${nodeId}" must have expiresInSeconds >= 1`;
      }
      return null;
    case "ai-agent":
      if (!node.prompt || typeof node.prompt !== "string") {
        return `AI Agent node "${nodeId}" must have a prompt string`;
      }
      if (typeof node.maxIterations !== "number" || node.maxIterations < 1) {
        return `AI Agent node "${nodeId}" must have maxIterations >= 1`;
      }
      return typeof node.maxToolCalls !== "number" || node.maxToolCalls < 0
        ? `AI Agent node "${nodeId}" must have maxToolCalls >= 0`
        : null;
    case "ai-model":
      {
        const modelNode = node as unknown as Record<string, unknown>;
        if ("provider" in modelNode) {
          if (modelNode.provider === "openai" || modelNode.provider === "openrouter") {
            return !modelNode.model || typeof modelNode.model !== "string"
              ? `AI Model node "${nodeId}" must have a model string`
              : null;
          }
          return `AI Model node "${nodeId}" legacy provider must be openai/openrouter or use pluginId + adapter`;
        }
        if (!modelNode.pluginId || typeof modelNode.pluginId !== "string") {
          return `AI Model node "${nodeId}" must have pluginId`;
        }
        if (modelNode.adapter !== "openai-compatible") {
          return `AI Model node "${nodeId}" must have a supported adapter: openai-compatible`;
        }
        return !modelNode.model || typeof modelNode.model !== "string"
          ? `AI Model node "${nodeId}" must have a model string`
          : null;
      }
    case "ai-memory":
      if (!["none", "session", "workflow", "profile", "user"].includes(node.scope)) {
        return `AI Memory node "${nodeId}" must have a valid scope`;
      }
      return typeof node.maxRetrievedMemories !== "number" || node.maxRetrievedMemories < 0
        ? `AI Memory node "${nodeId}" must have maxRetrievedMemories >= 0`
        : null;
    case "ai-tool":
      if (!node.pluginId || !node.methodId) {
        return `AI Tool node "${nodeId}" must have pluginId and methodId`;
      }
      return !["read", "write", "delete", "external-message", "external-payment", "filesystem"].includes(
        node.sideEffect,
      )
        ? `AI Tool node "${nodeId}" must have a valid sideEffect`
        : null;
    case "trigger":
      return validateTriggerConfig(node.trigger ?? { type: "manual" }, `Trigger node "${nodeId}"`);
  }
}
