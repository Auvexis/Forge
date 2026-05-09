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
    const formError = validateFormTrigger(workflow);
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

function validateFormTrigger(workflow: WorkflowItem): string | null {
  if (workflow.trigger.formSlug && !FORM_SLUG_REGEX.test(workflow.trigger.formSlug)) {
    return `Form ID must be kebab-case (e.g. 'contact-us'). Got: '${workflow.trigger.formSlug}'`;
  }
  if (!Array.isArray(workflow.trigger.formFields)) {
    return "Form trigger must have a formFields array";
  }

  return validateFormFields(workflow.trigger.formFields, "Form");
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
        node.slugPrefix &&
        (typeof node.slugPrefix !== "string" || !FORM_SLUG_REGEX.test(node.slugPrefix))
      ) {
        return `Wait Form node "${nodeId}" slugPrefix must be kebab-case`;
      }
      {
        const fieldError = validateFormFields(node.fields, `Wait Form node "${nodeId}"`);
        if (fieldError) return fieldError;
      }
      if (
        node.expiresInSeconds !== undefined &&
        (typeof node.expiresInSeconds !== "number" || node.expiresInSeconds < 1)
      ) {
        return `Wait Form node "${nodeId}" must have expiresInSeconds >= 1`;
      }
      return null;
    case "trigger":
      return null;
  }
}
