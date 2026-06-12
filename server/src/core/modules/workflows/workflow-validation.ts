import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";
import { getUtilityNodeCatalogItem } from "../../utility-nodes/utility-node-catalog.ts";
import { isConfigurationEdge } from "./graph.ts";

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
  "text-dataset",
  "file-dataset",
  "database-dataset",
  "embeddings",
  "vector-store",
  "retriever",
  "basic-llm-chain",
  "structured-json-parser",
  "vector-store-retriever",
  "question-answer-chain",
  "vector-store-tool",
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

  const dependencyError = validateConfigurationDependencies(workflow);
  if (dependencyError) return dependencyError;

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

function validateConfigurationDependencies(workflow: WorkflowItem): string | null {
  for (const [nodeId, node] of Object.entries(workflow.nodes)) {
    const definition = getUtilityNodeCatalogItem(node.type as any);
    if (!definition) continue;
    const activeFlowNode = workflow.edges.some((edge) =>
      (edge.target === nodeId && !isConfigurationEdge(workflow, edge)) ||
      (edge.source === nodeId && !isConfigurationEdge(workflow, edge))
    );
    for (const handle of definition.handles.filter((candidate) => candidate.type === "target" && candidate.accepts?.length)) {
      const edges = workflow.edges.filter((edge) => edge.target === nodeId && edge.targetHandle === handle.id);
      if (activeFlowNode && handle.required && edges.length === 0) {
        return `Node "${nodeId}" handle "${handle.id}" requires capability "${handle.accepts?.[0]?.capability}"`;
      }
      if ((handle.cardinality ?? "one") === "one" && edges.length > 1) {
        return `Node "${nodeId}" handle "${handle.id}" accepts one connection but received ${edges.length}`;
      }
      for (const edge of edges) {
        const source = workflow.nodes[edge.source];
        const sourceDefinition = source && getUtilityNodeCatalogItem(source.type as any);
        const compatible = handle.accepts?.some((selector) => sourceDefinition?.capabilities.includes(selector.capability));
        if (!compatible) {
          return `Node "${nodeId}" handle "${handle.id}" requires capability "${handle.accepts?.[0]?.capability}" but node "${edge.source}" provides [${sourceDefinition?.capabilities.join(", ") ?? ""}]`;
        }
      }
    }
  }
  return findConfigurationCycle(workflow);
}

function findConfigurationCycle(workflow: WorkflowItem): string | null {
  const edges = workflow.edges.filter((edge) => isConfigurationEdge(workflow, edge));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string, path: string[]): string | null => {
    if (visiting.has(nodeId)) return `Configuration dependency cycle: ${[...path, nodeId].join(" -> ")}`;
    if (visited.has(nodeId)) return null;
    visiting.add(nodeId);
    for (const edge of edges.filter((candidate) => candidate.source === nodeId)) {
      const error = visit(edge.target, [...path, nodeId]);
      if (error) return error;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return null;
  };
  for (const nodeId of Object.keys(workflow.nodes)) {
    const error = visit(nodeId, []);
    if (error) return error;
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

function validateChunkingConfig(
  chunking: unknown,
  label: string,
): string | null {
  if (!chunking || typeof chunking !== "object") {
    return `${label} must have chunking config`;
  }

  const config = chunking as Record<string, unknown>;
  if (typeof config.enabled !== "boolean") {
    return `${label} chunking.enabled must be boolean`;
  }
  if (typeof config.chunkSize !== "number" || config.chunkSize < 1) {
    return `${label} chunking.chunkSize must be >= 1`;
  }
  if (typeof config.chunkOverlap !== "number" || config.chunkOverlap < 0) {
    return `${label} chunking.chunkOverlap must be >= 0`;
  }
  if (config.chunkOverlap >= config.chunkSize) {
    return `${label} chunking.chunkOverlap must be smaller than chunkSize`;
  }
  if (typeof config.contextualOverlapEnabled !== "boolean") {
    return `${label} chunking.contextualOverlapEnabled must be boolean`;
  }
  if (
    config.maxPreviousContextChars !== undefined &&
    (typeof config.maxPreviousContextChars !== "number" || config.maxPreviousContextChars < 0)
  ) {
    return `${label} chunking.maxPreviousContextChars must be >= 0`;
  }

  return null;
}

function isValidVectorMetric(value: unknown): boolean {
  return value === "cosine" || value === "dot" || value === "euclidean";
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
      if (node.inputMessage !== undefined && typeof node.inputMessage !== "string") {
        return `AI Agent node "${nodeId}" inputMessage must be a string`;
      }
      if (typeof node.maxIterations !== "number" || node.maxIterations < 1) {
        return `AI Agent node "${nodeId}" must have maxIterations >= 1`;
      }
      if (typeof node.maxToolCalls !== "number" || node.maxToolCalls < 0) {
        return `AI Agent node "${nodeId}" must have maxToolCalls >= 0`;
      }
      return node.maxRetriesPerTool !== undefined &&
        (typeof node.maxRetriesPerTool !== "number" || node.maxRetriesPerTool < 0 || node.maxRetriesPerTool > 100)
        ? `AI Agent node "${nodeId}" must have maxRetriesPerTool between 0 and 100`
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
        if (
          modelNode.adapter !== "openai-compatible" &&
          modelNode.adapter !== "generic" &&
          modelNode.adapter !== "ollama"
        ) {
          return `AI Model node "${nodeId}" must have a supported adapter: openai-compatible, generic, or ollama`;
        }
        return !modelNode.model || typeof modelNode.model !== "string"
          ? `AI Model node "${nodeId}" must have a model string`
          : null;
      }
    case "ai-memory":
      if (!["none", "session", "workflow", "profile", "user"].includes(node.scope)) {
        return `AI Memory node "${nodeId}" must have a valid scope`;
      }
      if (typeof node.maxRetrievedMemories !== "number" || node.maxRetrievedMemories < 0) {
        return `AI Memory node "${nodeId}" must have maxRetrievedMemories >= 0`;
      }
      {
        const memoryNode = node as unknown as Record<string, unknown>;
        if (memoryNode.adapter === "plugin-memory-store") {
          return !memoryNode.pluginId || !memoryNode.searchMethodId || !memoryNode.putMethodId
            ? `AI Memory node "${nodeId}" plugin-memory-store must have pluginId, searchMethodId, and putMethodId`
            : null;
        }
        return memoryNode.adapter && memoryNode.adapter !== "sailor-internal"
          ? `AI Memory node "${nodeId}" must have a supported adapter: sailor-internal or plugin-memory-store`
          : null;
      }
    case "ai-tool":
      if (!node.pluginId || !node.methodId) {
        return `AI Tool node "${nodeId}" must have pluginId and methodId`;
      }
      return !["read", "write", "delete", "external-message", "external-payment", "filesystem"].includes(
        node.sideEffect,
      )
        ? `AI Tool node "${nodeId}" must have a valid sideEffect`
        : null;
    case "text-dataset":
      if (!node.text || typeof node.text !== "string") {
        return `Text Dataset node "${nodeId}" must have text`;
      }
      if (node.format !== "plain-text" && node.format !== "json-array") {
        return `Text Dataset node "${nodeId}" must have format plain-text or json-array`;
      }
      return validateChunkingConfig(node.chunking, `Text Dataset node "${nodeId}"`);
    case "file-dataset":
      if ((!Array.isArray(node.files) || node.files.length === 0) && !node.filePath && !node.fileUrl) {
        return `File Dataset node "${nodeId}" must have files, filePath, or fileUrl`;
      }
      if (!["txt", "markdown", "json", "csv", "auto"].includes(node.format)) {
        return `File Dataset node "${nodeId}" must have a supported format`;
      }
      return validateChunkingConfig(node.chunking, `File Dataset node "${nodeId}"`);
    case "database-dataset":
      if (!node.pluginId || !node.methodId) {
        return `Database Dataset node "${nodeId}" must have pluginId and methodId`;
      }
      if (!node.query || typeof node.query !== "string") {
        return `Database Dataset node "${nodeId}" must have query`;
      }
      if (!Array.isArray(node.textColumns) || node.textColumns.length === 0) {
        return `Database Dataset node "${nodeId}" must have textColumns`;
      }
      return validateChunkingConfig(node.chunking, `Database Dataset node "${nodeId}"`);
    case "embeddings":
      if (!node.pluginId || !node.methodId) {
        return `Embeddings node "${nodeId}" must have pluginId and methodId`;
      }
      if (!node.model || typeof node.model !== "string") {
        return `Embeddings node "${nodeId}" must have model`;
      }
      return typeof node.input !== "string"
        ? `Embeddings node "${nodeId}" must have input`
        : null;
    case "vector-store":
      if (!node.pluginId || !node.ensureCollectionMethodId || !node.upsertMethodId || !node.queryMethodId) {
        return `Vector Store node "${nodeId}" must have pluginId and vector store method ids`;
      }
      if (!node.collectionName || typeof node.collectionName !== "string") {
        return `Vector Store node "${nodeId}" must have collectionName`;
      }
      if (typeof node.dimension !== "number" || node.dimension < 1) {
        return `Vector Store node "${nodeId}" must have dimension >= 1`;
      }
      if (!isValidVectorMetric(node.metric)) {
        return `Vector Store node "${nodeId}" must have metric cosine, dot, or euclidean`;
      }
      if (node.retrievalMode && !["index", "query", "index-and-query"].includes(node.retrievalMode)) {
        return `Vector Store node "${nodeId}" must have a valid retrievalMode`;
      }
      if (node.topK !== undefined && (typeof node.topK !== "number" || node.topK < 1)) {
        return `Vector Store node "${nodeId}" must have topK >= 1`;
      }
      if (node.outputMode !== undefined && node.outputMode !== "items" && node.outputMode !== "context") {
        return `Vector Store node "${nodeId}" must have outputMode items or context`;
      }
      if (node.maxContextChars !== undefined && (typeof node.maxContextChars !== "number" || node.maxContextChars < 1)) {
        return `Vector Store node "${nodeId}" must have maxContextChars >= 1`;
      }
      if (node.filter !== undefined && (!node.filter || typeof node.filter !== "object" || Array.isArray(node.filter))) {
        return `Vector Store node "${nodeId}" must have filter object`;
      }
      return !node.config || typeof node.config !== "object" || Array.isArray(node.config)
        ? `Vector Store node "${nodeId}" must have config object`
        : null;
    case "retriever":
      if (!node.query || typeof node.query !== "string") {
        return `Retriever node "${nodeId}" must have query`;
      }
      if (typeof node.topK !== "number" || node.topK < 1) {
        return `Retriever node "${nodeId}" must have topK >= 1`;
      }
      return node.outputMode !== "items" && node.outputMode !== "context"
        ? `Retriever node "${nodeId}" must have outputMode items or context`
        : null;
    case "basic-llm-chain":
      if (!node.prompt || typeof node.prompt !== "string") {
        return `Basic LLM Chain node "${nodeId}" must have a prompt string`;
      }
      return !node.input || typeof node.input !== "string"
        ? `Basic LLM Chain node "${nodeId}" must have an input string`
        : null;
    case "structured-json-parser":
      if (!node.schema || typeof node.schema !== "object" || Array.isArray(node.schema)) {
        return `Structured JSON Parser node "${nodeId}" must have a schema object`;
      }
      if (typeof node.strict !== "boolean") {
        return `Structured JSON Parser node "${nodeId}" strict must be boolean`;
      }
      return node.failurePolicy !== "error"
        ? `Structured JSON Parser node "${nodeId}" failurePolicy must be error`
        : null;
    case "vector-store-retriever":
      if (typeof node.topK !== "number" || node.topK < 1) {
        return `Vector Store Retriever node "${nodeId}" must have topK >= 1`;
      }
      if (typeof node.maxContextChars !== "number" || node.maxContextChars < 1) {
        return `Vector Store Retriever node "${nodeId}" must have maxContextChars >= 1`;
      }
      return node.filter !== undefined && (!node.filter || typeof node.filter !== "object" || Array.isArray(node.filter))
        ? `Vector Store Retriever node "${nodeId}" must have filter object`
        : null;
    case "question-answer-chain":
      return !node.question || typeof node.question !== "string"
        ? `Question and Answer Chain node "${nodeId}" must have a question string`
        : null;
    case "vector-store-tool":
      if (!node.toolName || typeof node.toolName !== "string") {
        return `Vector Store Tool node "${nodeId}" must have a toolName string`;
      }
      if (!node.description || typeof node.description !== "string") {
        return `Vector Store Tool node "${nodeId}" must have a description string`;
      }
      return typeof node.topK !== "number" || node.topK < 1
        ? `Vector Store Tool node "${nodeId}" must have topK >= 1`
        : null;
    case "trigger":
      return validateTriggerConfig(node.trigger ?? { type: "manual" }, `Trigger node "${nodeId}"`);
  }

  return `Node "${nodeId}" has unsupported type`;
}
