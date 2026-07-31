import type { AgentEngineRequestRepository } from "../engine-protocol/agent-engine-request-repository.ts";
import type { AgentEngineResponseRepository } from "../engine-protocol/agent-engine-response-repository.ts";
import type { AgentEngineToolRequest } from "../engine-protocol/agent-engine-request.ts";
import type { AgentEngineResponse } from "../engine-protocol/agent-engine-response.ts";
import type { WorkflowNode } from "../../../../shared/models/workflow-types.ts";
import { randomUUID } from "node:crypto";
import { AgentRuntimeError, AgentToolApprovalRequiredError } from "../agent-errors.ts";
import type { AgentMcpError } from "../contracts/agent-domain-contracts.ts";
import type { AgentToolSideEffect } from "../agent-types.ts";

export interface AgentWorkflowToolTarget {
  nodeId: string;
  toolName: string;
  pluginId?: string;
  methodId?: string;
  node?: WorkflowNode;
  requiresApproval?: boolean;
  sideEffect?: AgentToolSideEffect;
  inputSchema?: Record<string, any>;
}

export interface AgentWorkflowToolResolver {
  resolve(toolName: string): AgentWorkflowToolTarget;
}

export interface AgentWorkflowToolExecutor {
  execute(
    target: AgentWorkflowToolTarget,
    arguments_: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export interface AgentWorkflowExecutionGuard {
  execute(
    request: AgentEngineToolRequest,
    invoke: () => Promise<unknown>,
  ): Promise<unknown>;
}

export interface WorkflowToolSchedulerOptions {
  leaseMs?: number;
  retryBaseMs?: number;
  owner?: string;
  now?: () => Date;
  resolveArguments?: (
    request: AgentEngineToolRequest,
    arguments_: Record<string, unknown>,
    target: AgentWorkflowToolTarget,
  ) => Promise<Record<string, unknown>>;
  transformOutput?: (
    request: AgentEngineToolRequest,
    output: unknown,
  ) => Promise<unknown>;
  isApproved?: (request: AgentEngineToolRequest) => boolean;
}

export class WorkflowToolScheduler {
  constructor(
    private readonly requests: AgentEngineRequestRepository,
    private readonly responses: AgentEngineResponseRepository,
    private readonly resolver: AgentWorkflowToolResolver,
    private readonly executor: AgentWorkflowToolExecutor,
    private readonly guard?: AgentWorkflowExecutionGuard,
    private readonly options: WorkflowToolSchedulerOptions = {},
  ) {}

  enqueue(request: AgentEngineToolRequest): AgentEngineToolRequest {
    const persisted = this.requests.createOrGet(request);
    if (persisted.kind !== "tool") {
      throw new Error(`Unsupported agent engine request kind: ${(persisted as any).kind}`);
    }
    return persisted;
  }

  async dispatch(
    request: AgentEngineToolRequest,
    signal?: AbortSignal,
  ): Promise<AgentEngineResponse> {
    const queued = this.enqueue(request);
    const existingResponse = this.responses.getByRequestId(queued.id);
    if (existingResponse) return existingResponse;
    if (signal?.aborted) return this.cancel(queued, signal.reason);

    const owner = this.options.owner ?? `scheduler_${randomUUID()}`;
    const now = this.options.now?.() ?? new Date();
    const leased = queued.status === "queued" ||
        ((queued.status === "leased" || queued.status === "executing") &&
          Boolean(queued.leaseExpiresAt) && queued.leaseExpiresAt! <= now.toISOString())
      ? this.requests.claimLease({
          id: queued.id,
          owner,
          now,
          leaseMs: this.options.leaseMs ?? 30_000,
        })
      : queued;
    const executing = leased.status === "leased"
      ? this.requests.updateStatus(leased.id, "executing")
      : leased;
    if (executing.status !== "executing") {
      throw new Error(`Agent engine request is not executable: ${executing.status}`);
    }

    try {
      const target = this.resolver.resolve(executing.toolName);
      if (target.requiresApproval && !this.options.isApproved?.(executing)) {
        throw new AgentToolApprovalRequiredError({
          toolName: executing.toolName,
          sideEffect: target.sideEffect ?? "read",
          args: executing.arguments,
        });
      }
      const resolvedArguments = this.options.resolveArguments
        ? await this.options.resolveArguments(executing, executing.arguments, target)
        : executing.arguments;
      const invoke = () => this.executor.execute(target, resolvedArguments, signal);
      const rawOutput = this.guard ? await this.guard.execute(executing, invoke) : await invoke();
      const output = this.options.transformOutput
        ? await this.options.transformOutput(executing, rawOutput)
        : rawOutput;
      const response = this.responses.create({
        id: `response_${randomUUID()}`,
        requestId: executing.id,
        runId: executing.runId,
        toolCallId: executing.toolCallId,
        status: "succeeded",
        output,
        createdAt: new Date().toISOString(),
      });
      this.requests.updateStatus(executing.id, "completed");
      return response;
    } catch (cause) {
      if (signal?.aborted) return this.cancel(executing, signal.reason ?? cause);
      const error = toMcpError(cause);
      if (error.retryable) {
        const attempt = executing.attempt ?? 1;
        const delayMs = Math.min(
          (this.options.retryBaseMs ?? 250) * 2 ** Math.max(0, attempt - 1),
          5_000,
        );
        const retried = this.requests.scheduleRetry({
          id: executing.id,
          owner,
          nextRetryAt: new Date((this.options.now?.() ?? new Date()).getTime() + delayMs),
          error: error.message,
        });
        if (retried.status !== "dead-letter") {
          if (delayMs > 0) await delay(delayMs, signal);
          return this.dispatch(retried, signal);
        }
      }
      const response = this.responses.create({
        id: `response_${randomUUID()}`,
        requestId: executing.id,
        runId: executing.runId,
        toolCallId: executing.toolCallId,
        status: "failed",
        error,
        createdAt: new Date().toISOString(),
      });
      const current = this.requests.getById(executing.id)!;
      if (current.status !== "dead-letter") this.requests.updateStatus(executing.id, "failed");
      return response;
    }
  }

  private cancel(
    request: AgentEngineToolRequest,
    cause: unknown,
  ): AgentEngineResponse {
    const response = this.responses.create({
      id: `response_${randomUUID()}`,
      requestId: request.id,
      runId: request.runId,
      toolCallId: request.toolCallId,
      status: "cancelled",
      reason: cause instanceof Error ? cause.message : String(cause ?? "Cancelled"),
      createdAt: new Date().toISOString(),
    });
    this.requests.updateStatus(request.id, "cancelled");
    return response;
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    timeout.unref?.();
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(signal.reason ?? new Error("Cancelled"));
    }, { once: true });
  });
}

function toMcpError(cause: unknown): AgentMcpError {
  if (cause instanceof AgentToolApprovalRequiredError) {
    return {
      code: cause.code,
      category: "policy",
      message: cause.publicMessage,
      retryable: false,
      userActionRequired: true,
      details: { approvalRequest: cause.approvalRequest },
    };
  }
  if (cause instanceof AgentRuntimeError) {
    const category = errorCategory(cause.code, cause.statusCode);
    return {
      code: cause.code,
      category,
      message: cause.publicMessage,
      retryable: cause.statusCode >= 500,
      userActionRequired: category === "authentication" ||
        category === "permission" ||
        category === "ambiguous" ||
        category === "policy",
    };
  }
  return {
    code: "AGENT_TOOL_EXECUTION_FAILED",
    category: "internal",
    message: cause instanceof Error ? cause.message : String(cause),
    retryable: false,
    userActionRequired: false,
  };
}

function errorCategory(
  code: string,
  statusCode: number,
): AgentMcpError["category"] {
  if (/AUTH|CREDENTIAL|OAUTH/.test(code)) return "authentication";
  if (/PERMISSION|FORBIDDEN/.test(code)) return "permission";
  if (/AMBIGUOUS|MULTIPLE_MATCH/.test(code)) return "ambiguous";
  if (/POLICY|OUTCOME_UNKNOWN/.test(code)) return "policy";
  if (/NOT_FOUND/.test(code)) return "not-found";
  return statusCode >= 500 ? "temporary" : "validation";
}
