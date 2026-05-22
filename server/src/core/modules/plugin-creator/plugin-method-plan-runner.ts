import vm from "node:vm";

import type {
  PluginBlueprint,
  PluginBlueprintMethod,
  PluginCreatorLastRun,
  PluginCreatorRenderedRequest,
} from "./plugin-blueprint-types.ts";
import type { PluginBlueprintRepository } from "./plugin-blueprint-repository.ts";
import { assertSafePluginCreatorCodeBlock } from "./plugin-code-block-safety.ts";
import { mapPluginCreatorError } from "./plugin-error-mapper.ts";
import {
  evaluatePluginCreatorExpression,
  type PluginCreatorExpressionContext,
} from "./plugin-method-expression-evaluator.ts";
import type { PluginMethodPlan, PluginMethodPlanStep } from "./plugin-method-plan-types.ts";
import type { PluginMethodTraceEvent } from "./plugin-method-trace-types.ts";
import { renderPluginRequestTemplate } from "./plugin-request-template.ts";
import { mapPluginCreatorResponse } from "./plugin-response-mapper.ts";

export interface PluginMethodPlanRunnerDependencies {
  now?: () => string;
  repository?: Pick<PluginBlueprintRepository, "saveLastRun">;
}

export interface PluginMethodPlanRunnerInput {
  blueprint: PluginBlueprint;
  method: PluginBlueprintMethod;
  plan: PluginMethodPlan;
  params: Record<string, unknown>;
  credentials: Record<string, unknown>;
  timeoutMs?: number;
}

export type PluginMethodPlanRunResult = PluginCreatorLastRun & {
  trace: PluginMethodTraceEvent[];
};

interface RunnerState {
  startedAt: number;
  renderedRequest: PluginCreatorRenderedRequest | null;
  latestResponse: ResponseLike | null;
  latestValue: unknown;
  returned: boolean;
  trace: PluginMethodTraceEvent[];
  steps: Record<string, { status: "success" | "failed"; output?: unknown; error?: string }>;
}

interface ResponseLike {
  status: number | null;
  headers: Record<string, string>;
  body: unknown;
}

const defaultTimeoutMs = 30_000;
const codeBlockTimeoutMs = 1_000;

export class PluginMethodPlanRunner {
  private readonly now: () => string;
  private readonly repository?: Pick<PluginBlueprintRepository, "saveLastRun">;

  constructor(dependencies: PluginMethodPlanRunnerDependencies = {}) {
    this.now = dependencies.now ?? (() => new Date().toISOString());
    this.repository = dependencies.repository;
  }

  async run(input: PluginMethodPlanRunnerInput): Promise<PluginMethodPlanRunResult> {
    const state: RunnerState = {
      startedAt: Date.now(),
      renderedRequest: null,
      latestResponse: null,
      latestValue: undefined,
      returned: false,
      trace: [],
      steps: {},
    };

    try {
      await this.runSteps(input, state, input.plan.steps);
      const result = this.createResult(input, state, null);
      state.trace.push({ type: "method:success", timestamp: this.now(), output: result.body });
      result.trace = state.trace;
      this.repository?.saveLastRun(input.blueprint.id, result);
      return result;
    } catch (error) {
      const result = this.createResult(input, state, normalizeErrorMessage(error));
      state.trace.push({
        type: "method:failed",
        timestamp: this.now(),
        error: result.error ?? "Method failed",
      });
      result.trace = state.trace;
      this.repository?.saveLastRun(input.blueprint.id, result);
      return result;
    }
  }

  private async runSteps(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
    steps: PluginMethodPlanStep[],
  ): Promise<void> {
    for (const step of steps) {
      if (state.returned) break;
      await this.runStep(input, state, step);
    }
  }

  private async runStep(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
    step: PluginMethodPlanStep,
  ): Promise<void> {
    state.trace.push({ type: "node:running", timestamp: this.now(), nodeId: step.nodeId });

    try {
      const output = await this.executeStep(input, state, step);
      state.steps[step.nodeId] = { status: "success", output };
      state.trace.push({
        type: "node:success",
        timestamp: this.now(),
        nodeId: step.nodeId,
        output,
        status: state.latestResponse?.status,
        request: step.kind === "httpRequest" ? state.renderedRequest ?? undefined : undefined,
      });
    } catch (error) {
      const message = normalizeErrorMessage(error);
      state.steps[step.nodeId] = { status: "failed", error: message };
      state.trace.push({
        type: "node:failed",
        timestamp: this.now(),
        nodeId: step.nodeId,
        error: message,
        status: state.latestResponse?.status,
      });
      throw error;
    }
  }

  private async executeStep(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
    step: PluginMethodPlanStep,
  ): Promise<unknown> {
    switch (step.kind) {
      case "httpRequest":
        return await this.executeHttpRequest(input, state);
      case "responseMapper": {
        const mapped = input.method.responseMapping.length > 0
          ? mapPluginCreatorResponse(state.latestResponse ?? emptyResponse(), input.method.responseMapping)
          : state.latestResponse?.body ?? {};
        state.latestValue = mapped;
        return mapped;
      }
      case "errorMapper": {
        const mapped = mapPluginCreatorError(state.latestResponse ?? emptyResponse(), input.method.errorMapping);
        if (mapped) {
          throw new Error(mapped.message);
        }
        return null;
      }
      case "codeBlock": {
        const output = await this.executeCodeBlock(input, state, step.codeBlockId);
        state.latestValue = output;
        return output;
      }
      case "if": {
        const selected = this.evaluateExpression(input, state, step.condition)
          ? step.thenSteps
          : step.elseSteps;
        await this.runSteps(input, state, selected);
        return state.latestValue;
      }
      case "switch": {
        const value = this.evaluateExpression(input, state, step.expression);
        const selectedCase = step.cases.find((candidate) => candidate.value === value);
        await this.runSteps(input, state, selectedCase?.steps ?? step.defaultSteps);
        return state.latestValue;
      }
      case "tryCatch":
        try {
          await this.runSteps(input, state, step.trySteps);
        } catch (error) {
          state.latestValue = { [step.errorVariable]: normalizeErrorMessage(error) };
          await this.runSteps(input, state, step.catchSteps);
        }
        return state.latestValue;
      case "jsonTransform": {
        const output = this.evaluateExpression(input, state, step.expression);
        state.latestValue = output;
        return output;
      }
      case "return": {
        const output = this.evaluateExpression(input, state, step.valueExpression);
        state.latestValue = output;
        state.returned = true;
        return output;
      }
      case "for": {
        const outputs: unknown[] = [];
        if (step.iterableExpression) {
          for (const item of toArray(this.evaluateExpression(input, state, step.iterableExpression))) {
            state.latestValue = item;
            await this.runSteps(input, state, step.bodySteps);
            outputs.push(state.latestValue);
          }
        } else {
          const from = Number(this.evaluateExpression(input, state, step.fromExpression ?? "0"));
          const to = Number(this.evaluateExpression(input, state, step.toExpression ?? "0"));
          for (let index = from; index <= to; index += 1) {
            state.latestValue = index;
            await this.runSteps(input, state, step.bodySteps);
            outputs.push(state.latestValue);
          }
        }
        state.latestValue = outputs;
        return outputs;
      }
      case "forEach": {
        const outputs: unknown[] = [];
        for (const item of toArray(this.evaluateExpression(input, state, step.arrayExpression))) {
          state.latestValue = item;
          await this.runSteps(input, state, step.bodySteps);
          outputs.push(state.latestValue);
        }
        state.latestValue = outputs;
        return outputs;
      }
    }
  }

  private async executeHttpRequest(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
  ): Promise<ResponseLike> {
    const rendered = renderPluginRequestTemplate({
      request: input.method.request,
      params: input.params,
      credentials: input.credentials,
    });
    state.renderedRequest = rendered.preview;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? defaultTimeoutMs);

    try {
      const response = await fetch(buildUrl(rendered.request.url, rendered.request.query), {
        method: rendered.request.method,
        headers: rendered.request.headers,
        body: createFetchBody(rendered.request.body),
        signal: controller.signal,
      });
      const responseLike = {
        status: response.status,
        headers: headersToRecord(response.headers),
        body: await parseResponseBody(response),
      };
      state.latestResponse = responseLike;
      state.latestValue = responseLike;
      return responseLike;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async executeCodeBlock(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
    codeBlockId: string,
  ): Promise<unknown> {
    const codeBlock = input.method.codeBlocks?.find((candidate) => candidate.id === codeBlockId) ?? {
      id: codeBlockId,
      name: codeBlockId,
      source: "return previous;",
    };
    assertSafePluginCreatorCodeBlock(codeBlock.source);
    const context = this.createExpressionContext(input, state);
    const sandbox = vm.createContext(context);
    const script = new vm.Script(`"use strict";\n(async () => {\n${codeBlock.source}\n})()`);
    return normalizeVmValue(await script.runInContext(sandbox, { timeout: codeBlockTimeoutMs }));
  }

  private evaluateExpression(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
    source: string,
  ): unknown {
    return evaluatePluginCreatorExpression(source, this.createExpressionContext(input, state));
  }

  private createExpressionContext(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
  ): PluginCreatorExpressionContext {
    return {
      params: input.params,
      credentials: input.credentials,
      previous: state.latestValue,
      steps: state.steps,
      response: state.latestResponse,
      body: state.latestResponse?.body ?? null,
      headers: state.latestResponse?.headers ?? {},
      status: state.latestResponse?.status ?? null,
    };
  }

  private createResult(
    input: PluginMethodPlanRunnerInput,
    state: RunnerState,
    error: string | null,
  ): PluginMethodPlanRunResult {
    return {
      methodId: input.method.id,
      request: state.renderedRequest ?? {
        method: input.method.request.method,
        url: input.method.request.url,
        headers: {},
        query: {},
        body: undefined,
      },
      status: state.latestResponse?.status ?? null,
      headers: state.latestResponse?.headers ?? {},
      body: error ? state.latestResponse?.body ?? null : state.latestValue,
      durationMs: Date.now() - state.startedAt,
      error,
      timestamp: this.now(),
      trace: state.trace,
    };
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

function emptyResponse(): ResponseLike {
  return { status: null, headers: {}, body: null };
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") return "Request timeout";
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Method failed";
}

function normalizeVmValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  return structuredClone(value);
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
