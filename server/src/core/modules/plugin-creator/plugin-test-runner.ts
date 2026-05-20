import type { PluginBlueprintRequest, PluginCreatorLastRun } from "./plugin-blueprint-types.ts";
import type { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import { renderPluginRequestTemplate } from "./plugin-request-template.ts";

export interface PluginTestRunnerDependencies {
  now?: () => string;
  repository?: Pick<PluginBlueprintRepository, "saveLastRun">;
}

export interface PluginTestRunnerInput {
  blueprintId: string;
  methodId: string;
  request: PluginBlueprintRequest;
  params: Record<string, unknown>;
  credentials: Record<string, unknown>;
  timeoutMs?: number;
}

const defaultTimeoutMs = 30_000;

export class PluginTestRunner {
  private readonly now: () => string;
  private readonly repository?: Pick<PluginBlueprintRepository, "saveLastRun">;

  constructor(dependencies: PluginTestRunnerDependencies = {}) {
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.repository = dependencies.repository;
  }

  async run(input: PluginTestRunnerInput): Promise<PluginCreatorLastRun> {
    const startedAt = Date.now();
    const rendered = renderPluginRequestTemplate({
      request: input.request,
      params: input.params,
      credentials: input.credentials,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? defaultTimeoutMs);

    try {
      const response = await fetch(buildUrl(rendered.request.url, rendered.request.query), {
        method: rendered.request.method,
        headers: rendered.request.headers,
        body: createFetchBody(rendered.request.body),
        signal: controller.signal,
      });
      const result: PluginCreatorLastRun = {
        methodId: input.methodId,
        request: rendered.preview,
        status: response.status,
        headers: headersToRecord(response.headers),
        body: await parseResponseBody(response),
        durationMs: Date.now() - startedAt,
        error: null,
        timestamp: this.now(),
      };

      this.repository?.saveLastRun(input.blueprintId, result);
      return result;
    } catch (error) {
      const result: PluginCreatorLastRun = {
        methodId: input.methodId,
        request: rendered.preview,
        status: null,
        headers: {},
        body: null,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? normalizeErrorMessage(error) : "Request failed",
        timestamp: this.now(),
      };

      this.repository?.saveLastRun(input.blueprintId, result);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildUrl(url: string, query: Record<string, string>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

function createFetchBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
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

function normalizeErrorMessage(error: Error): string {
  if (error.name === "AbortError") {
    return "Request timeout";
  }
  return error.message;
}
