import type { PluginBlueprint } from "./plugin-blueprint-types.ts";

export function generatePluginMethodsSource(blueprint: PluginBlueprint): string {
  const methodEntries = blueprint.methods
    .map((method) => {
      const request = JSON.stringify(method.request, null, 2);
      const responseMapping = JSON.stringify(method.responseMapping, null, 2);
      const errorMapping = JSON.stringify(method.errorMapping, null, 2);

      return `  ${method.handle}: async (params: Record<string, unknown>, context: PluginContext = emptyContext) => {
    const rendered = renderPluginRequestTemplate({
      request: ${indent(request, 6)},
      params,
      credentials: context.credentials ?? {},
    }).request;
    const url = buildUrl(rendered.url, rendered.query);
    const response = await fetch(url, {
      method: ${JSON.stringify(method.request.method)},
      headers: rendered.headers,
      body: rendered.body === undefined ? undefined : JSON.stringify(rendered.body),
    });
    const body = await parseResponseBody(response);
    const responseLike = {
      status: response.status,
      headers: headersToRecord(response.headers),
      body,
    };
    const mappedError = mapPluginCreatorError(responseLike, ${indent(errorMapping, 6)});
    if (mappedError) {
      throw new SailorPluginError(mappedError.message, {
        code: mappedError.code,
        status: mappedError.status ?? undefined,
        details: mappedError.details,
      });
    }
    assertHttpOk({ status: response.status, body });
    return mapPluginCreatorResponse(responseLike, ${indent(responseMapping, 6)});
  }`;
    })
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
`;
}

function indent(value: string, spaces: number): string {
  const padding = " ".repeat(spaces);
  return value.replace(/\n/g, `\n${padding}`);
}
