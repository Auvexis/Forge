export type TemplateMissingPathMode = "preserve" | "empty" | "throw";
export type TemplateEscapeMode = "text" | "sql" | "json" | "prompt";

export interface TemplateEngineOptions {
  missingPath?: TemplateMissingPathMode;
  escape?: TemplateEscapeMode;
}

const TEMPLATE_PATTERN = /{{\s*([a-zA-Z0-9_.\[\]]+)\s*}}/g;
const EXACT_TEMPLATE_PATTERN = /^{{\s*([a-zA-Z0-9_.\[\]]+)\s*}}$/;

export class TemplateMissingPathError extends Error {
  constructor(public readonly path: string) {
    super(`Template path "${path}" could not be resolved`);
    this.name = "TemplateMissingPathError";
  }
}

export function resolvePath(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export function escapeTemplateValue(value: unknown, mode: TemplateEscapeMode = "text"): string {
  if (mode === "json") return JSON.stringify(value);

  const text = value === undefined || value === null ? "" : String(value);
  if (mode === "sql") return text.replace(/'/g, "''");
  if (mode === "prompt") return text.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  return text;
}

export const TemplateEngine = {
  evalParams(
    params: Record<string, any>,
    context: any,
    options: TemplateEngineOptions = {},
  ): Record<string, any> {
    const cooked: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      cooked[key] = evaluateValue(value, context, options);
    }

    return cooked;
  },

  evaluate(value: unknown, context: any, options: TemplateEngineOptions = {}): unknown {
    return evaluateValue(value, context, options);
  },
};

function evaluateValue(value: unknown, context: any, options: TemplateEngineOptions): unknown {
  if (typeof value === "string") {
    return evaluateString(value, context, options);
  }

  if (Array.isArray(value)) {
    return value.map((item) => evaluateValue(item, context, options));
  }

  if (typeof value === "object" && value !== null) {
    if (Buffer.isBuffer(value)) return value;

    const cooked: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      cooked[key] = evaluateValue(nested, context, options);
    }
    return cooked;
  }

  return value;
}

function evaluateString(
  value: string,
  context: any,
  options: TemplateEngineOptions,
): unknown {
  const exactMatch = EXACT_TEMPLATE_PATTERN.exec(value.trim());
  if (exactMatch) {
    return resolveTemplatePath(exactMatch[1], context, value, options);
  }

  return value.replace(TEMPLATE_PATTERN, (match, path) => {
    const resolved = resolveTemplatePath(path, context, match, options);
    if (resolved === undefined && (options.missingPath ?? "preserve") === "preserve") {
      return match;
    }
    return escapeTemplateValue(resolved, options.escape ?? "text");
  });
}

function resolveTemplatePath(
  path: string,
  context: any,
  original: string,
  options: TemplateEngineOptions,
): unknown {
  const resolved = resolvePath(context, path);
  if (resolved !== undefined && resolved !== null) return resolved;

  switch (options.missingPath ?? "preserve") {
    case "throw":
      throw new TemplateMissingPathError(path);
    case "empty":
      return "";
    case "preserve":
    default:
      return original;
  }
}
