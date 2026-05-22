import type { PluginBlueprint } from "./plugin-blueprint-types.ts";
import { buildPluginMethodPlans } from "./plugin-method-plan.ts";
import { writeMethodSource } from "./plugin-method-code-writer.ts";

export function generatePluginMethodsSource(
  blueprint: PluginBlueprint,
): string {
  const plans = new Map(
    buildPluginMethodPlans(blueprint).map((plan) => [plan.methodId, plan]),
  );
  const methodEntries = blueprint.methods
    .map((method) =>
      writeMethodSource({
        blueprint,
        method,
        plan: plans.get(method.id)!,
      }),
    )
    .join(",\n");

  return `import type { PluginContext } from "@auvexis/sailor-sdk";
import { renderPluginRequestTemplate } from "./plugin-request-template.js";
import { mapPluginCreatorResponse } from "./plugin-response-mapper.js";
import { mapPluginCreatorError } from "./plugin-error-mapper.js";
import { SailorPluginError, assertHttpOk } from "./plugin-generated-http-helpers.js";

const emptyContext: PluginContext = { credentials: {} };

export const methods = {
${methodEntries}
};

function buildUrl(url: string, query: Record<string, string>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }
  return text;
}

function getPluginCreatorErrorCode(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.length > 0
  ) {
    return error.code;
  }
  return undefined;
}
`;
}
