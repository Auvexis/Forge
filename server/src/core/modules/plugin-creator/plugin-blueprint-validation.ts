import { z } from "zod";

import {
  PLUGIN_BLUEPRINT_AUTH_TYPES,
  PLUGIN_BLUEPRINT_HTTP_METHODS,
  PLUGIN_BLUEPRINT_INPUT_TYPES,
  type PluginBlueprint,
} from "./plugin-blueprint-types.ts";

export interface PluginBlueprintValidationResult {
  success: boolean;
  data?: PluginBlueprint;
  error?: string;
}

const pluginCreatorIdPattern = /^[a-zA-Z0-9_-]+$/;
const pluginHandlePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const methodHandlePattern = /^[a-z][a-zA-Z0-9]*$/;
const fieldNamePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const errorCodePattern = /^[A-Z][A-Z0-9_]*$/;
const variableNamePattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

const keyValueSchema = z.object({
  name: z.string().min(1),
  value: z.unknown(),
});

const inputOptionSchema = z.object({
  label: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const inputSchema = z.object({
  name: z.string().regex(fieldNamePattern, "Invalid input name"),
  type: z.enum(PLUGIN_BLUEPRINT_INPUT_TYPES),
  required: z.boolean(),
  default: z.unknown().optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  options: z.array(inputOptionSchema).optional(),
});

const credentialFieldSchema = z.object({
  name: z.string().regex(fieldNamePattern, "Invalid credential field name"),
  label: z.string().min(1),
  target: z.enum(["header", "query", "body"]),
  headerName: z.string().min(1).optional(),
  queryName: z.string().min(1).optional(),
  bodyPath: z.string().min(1).optional(),
  prefix: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

const authSchema = z.object({
  type: z.enum(PLUGIN_BLUEPRINT_AUTH_TYPES),
  fields: z.array(credentialFieldSchema),
});

const requestBodySchema = z.object({
  type: z.enum(["none", "json", "text", "form"]),
  value: z.unknown().optional(),
});

const requestSchema = z.object({
  method: z.enum(PLUGIN_BLUEPRINT_HTTP_METHODS),
  url: z.string().min(1),
  headers: z.array(keyValueSchema),
  query: z.array(keyValueSchema),
  body: requestBodySchema,
});

const responseMappingSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid response mapping id"),
  outputName: z.string().regex(fieldNamePattern, "Invalid output name"),
  path: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "object", "array", "select"]),
  required: z.boolean().optional(),
});

const errorConditionSchema = z.object({
  source: z.enum(["status", "body"]),
  operator: z.enum([
    "equals",
    "notEquals",
    "greaterThan",
    "greaterThanOrEquals",
    "lessThan",
    "lessThanOrEquals",
    "exists",
    "notExists",
  ]),
  value: z.unknown().optional(),
  path: z.string().min(1).optional(),
});

const errorMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("static"), value: z.string().min(1) }),
  z.object({ type: z.literal("bodyPath"), path: z.string().min(1), fallback: z.string().optional() }),
]);

const errorMappingSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid error mapping id"),
  code: z.string().regex(errorCodePattern, "Invalid error code"),
  condition: errorConditionSchema,
  message: errorMessageSchema,
});

const codeBlockSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid code block id"),
  name: z.string().min(1),
  source: z.string(),
  outputName: z.string().regex(fieldNamePattern, "Invalid output name").optional(),
});

const methodSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid method id"),
  handle: z.string().regex(methodHandlePattern, "Invalid method handle"),
  name: z.string().min(1),
  description: z.string(),
  category: z.string().optional(),
  inputs: z.array(inputSchema),
  request: requestSchema,
  responseMapping: z.array(responseMappingSchema),
  errorMapping: z.array(errorMappingSchema),
  codeBlocks: z.array(codeBlockSchema).optional(),
});

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const baseNodeSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid node id"),
  position: positionSchema,
});

const legacyNodeDataSchema = z.record(z.string(), z.unknown());

const nodeDataWithMethodSchema = z.object({
  methodId: z.string().regex(pluginCreatorIdPattern, "Invalid method id").optional(),
});

const switchCaseSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid switch case id"),
  label: z.string().min(1),
  value: z.unknown(),
  handle: z.string().regex(pluginCreatorIdPattern, "Invalid switch case handle").optional(),
});

const nodeSchema = z.discriminatedUnion("type", [
  baseNodeSchema.extend({
    type: z.enum([
      "method",
      "input",
      "credential",
      "request",
      "header",
      "query",
      "body",
      "responseMapper",
      "errorMapper",
      "output",
      "codeBlock",
      "note",
      "group",
    ]),
    data: legacyNodeDataSchema,
  }),
  baseNodeSchema.extend({
    type: z.literal("if"),
    data: nodeDataWithMethodSchema.extend({
      condition: z.string().min(1),
    }),
  }),
  baseNodeSchema.extend({
    type: z.literal("switch"),
    data: nodeDataWithMethodSchema.extend({
      expression: z.string().min(1),
      cases: z.array(switchCaseSchema).optional(),
    }),
  }),
  baseNodeSchema.extend({
    type: z.literal("tryCatch"),
    data: nodeDataWithMethodSchema.extend({
      errorVariable: z.string().regex(variableNamePattern, "Invalid error variable").optional(),
    }),
  }),
  baseNodeSchema.extend({
    type: z.literal("jsonTransform"),
    data: nodeDataWithMethodSchema.extend({
      expression: z.string().min(1),
      outputName: z.string().regex(fieldNamePattern, "Invalid output name").optional(),
    }),
  }),
  baseNodeSchema.extend({
    type: z.literal("return"),
    data: nodeDataWithMethodSchema.extend({
      valueExpression: z.string().min(1),
    }),
  }),
  baseNodeSchema.extend({
    type: z.literal("for"),
    data: nodeDataWithMethodSchema.extend({
      itemVariable: z.string().regex(variableNamePattern, "Invalid item variable"),
      fromExpression: z.string().min(1).optional(),
      toExpression: z.string().min(1).optional(),
      iterableExpression: z.string().min(1).optional(),
    }),
  }),
  baseNodeSchema.extend({
    type: z.literal("forEach"),
    data: nodeDataWithMethodSchema.extend({
      arrayExpression: z.string().min(1),
      itemVariable: z.string().regex(variableNamePattern, "Invalid item variable"),
    }),
  }),
]);

const edgeSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid edge id"),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const pluginBlueprintSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid plugin creator id"),
  metadata: z.object({
    handle: z.string().regex(pluginHandlePattern, "Invalid plugin handle"),
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string(),
    category: z.string().optional(),
    author: z.string().optional(),
    repository: z.string().optional(),
    homepage: z.string().optional(),
    docsUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
  icons: z.object({
    icon: z.string().optional(),
    iconDark: z.string().optional(),
    iconLight: z.string().optional(),
  }),
  auth: authSchema,
  methods: z.array(methodSchema),
  canvas: z.object({
    nodes: z.record(z.string(), nodeSchema),
    edges: z.array(edgeSchema),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}) satisfies z.ZodType<PluginBlueprint>;

export function validatePluginCreatorId(id: string): string {
  if (!pluginCreatorIdPattern.test(id)) {
    throw new Error("Invalid plugin creator id");
  }
  return id;
}

export function validatePluginHandle(handle: string): string {
  if (!pluginHandlePattern.test(handle)) {
    throw new Error("Invalid plugin handle");
  }
  return handle;
}

export function validateMethodHandle(handle: string): string {
  if (!methodHandlePattern.test(handle)) {
    throw new Error("Invalid method handle");
  }
  return handle;
}

export function parsePluginBlueprint(input: unknown): PluginBlueprint {
  return pluginBlueprintSchema.parse(input);
}

export function validatePluginBlueprint(input: unknown): PluginBlueprintValidationResult {
  const result = pluginBlueprintSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; "),
  };
}
