import type {
  PluginBlueprintKeyValue,
  PluginBlueprintRequest,
  PluginCreatorRenderedRequest,
} from "./plugin-blueprint-types.ts";

export interface RenderPluginRequestTemplateInput {
  request: PluginBlueprintRequest;
  params: Record<string, unknown>;
  credentials: Record<string, unknown>;
}

export interface RenderPluginRequestTemplateResult {
  request: PluginCreatorRenderedRequest;
  preview: PluginCreatorRenderedRequest;
}

const templatePattern = /\{\{\s*([^}]+?)\s*\}\}/g;
const safeSegmentPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const forbiddenSegments = new Set(["__proto__", "constructor", "prototype"]);
const maskedSecret = "********";

export function renderPluginRequestTemplate(
  input: RenderPluginRequestTemplateInput,
): RenderPluginRequestTemplateResult {
  const context = {
    params: input.params,
    credentials: input.credentials,
  };
  const previewContext = {
    params: input.params,
    credentials: maskRecord(input.credentials),
  };

  return {
    request: renderRequest(input.request, context),
    preview: renderRequest(input.request, previewContext),
  };
}

function renderRequest(
  request: PluginBlueprintRequest,
  context: Record<"params" | "credentials", Record<string, unknown>>,
): PluginCreatorRenderedRequest {
  return {
    method: request.method,
    url: renderString(request.url, context),
    headers: renderKeyValues(request.headers, context),
    query: renderKeyValues(request.query, context),
    body: request.body.type === "none" ? undefined : renderUnknown(request.body.value, context),
  };
}

function renderKeyValues(
  pairs: PluginBlueprintKeyValue[],
  context: Record<"params" | "credentials", Record<string, unknown>>,
): Record<string, string> {
  const rendered: Record<string, string> = {};
  for (const pair of pairs) {
    rendered[pair.name] = stringifyRenderedValue(renderUnknown(pair.value, context));
  }
  return rendered;
}

function renderUnknown(
  value: unknown,
  context: Record<"params" | "credentials", Record<string, unknown>>,
): unknown {
  if (typeof value === "string") {
    return renderStringOrValue(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderUnknown(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, renderUnknown(item, context)]),
    );
  }

  return value;
}

function renderStringOrValue(
  value: string,
  context: Record<"params" | "credentials", Record<string, unknown>>,
): unknown {
  const exact = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (exact) {
    return resolveTemplatePath(exact[1]!.trim(), context);
  }

  return renderString(value, context);
}

function renderString(
  value: string,
  context: Record<"params" | "credentials", Record<string, unknown>>,
): string {
  return value.replace(templatePattern, (_match, expression: string) => {
    return stringifyRenderedValue(resolveTemplatePath(expression.trim(), context));
  });
}

function resolveTemplatePath(
  expression: string,
  context: Record<"params" | "credentials", Record<string, unknown>>,
): unknown {
  const [root, ...segments] = expression.split(".");
  if (root !== "params" && root !== "credentials") {
    throw new Error(`Unsupported template root: ${root}`);
  }

  if (
    segments.length === 0 ||
    segments.some((segment) => !safeSegmentPattern.test(segment) || forbiddenSegments.has(segment))
  ) {
    throw new Error(`Unsafe template path: ${expression}`);
  }

  let current: unknown = context[root];
  for (const segment of segments) {
    if (!isPlainRecord(current) || !(segment in current)) {
      throw new Error(`Missing template value: ${expression}`);
    }
    current = current[segment];
  }

  return current;
}

function stringifyRenderedValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function maskRecord(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(value).map((key) => [key, maskedSecret]),
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
