export interface ExternalIORetryPolicy {
  maxRetries?: number;
  intervalMs?: number;
  backoffStrategy?: "fixed" | "linear" | "exponential";
}

export interface ExternalIOOperationContext {
  signal: AbortSignal;
  attempt: number;
}

export interface ExternalIOOptions<T> {
  label: string;
  timeoutMs?: number;
  retryPolicy?: ExternalIORetryPolicy;
  signal?: AbortSignal;
  operation: (context: ExternalIOOperationContext) => Promise<T>;
}

export type ExternalIOErrorCode =
  | "EXTERNAL_IO_FAILED"
  | "EXTERNAL_IO_TIMEOUT"
  | "EXTERNAL_IO_ABORTED";

export class ExternalIOError extends Error {
  public readonly code: ExternalIOErrorCode;
  public readonly attempts: number;
  public readonly cause?: unknown;

  constructor(
    message: string,
    code: ExternalIOErrorCode,
    attempts: number,
    cause?: unknown,
  ) {
    super(message);
    this.name = "ExternalIOError";
    this.code = code;
    this.attempts = attempts;
    this.cause = cause;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runExternalIO<T>(options: ExternalIOOptions<T>): Promise<T> {
  const maxRetries = options.retryPolicy?.maxRetries ?? 0;
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const abortFromParent = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abortFromParent, { once: true });

    const timeoutId = options.timeoutMs
      ? setTimeout(() => controller.abort(new Error("timeout")), options.timeoutMs)
      : null;

    try {
      return await options.operation({ signal: controller.signal, attempt });
    } catch (error) {
      lastError = error;
      const wasTimeout = Boolean(timeoutId) && controller.signal.aborted;
      const wasParentAbort = Boolean(options.signal?.aborted);

      if (attempt > maxRetries || wasTimeout || wasParentAbort) {
        throw normalizeExternalIOError(options.label, error, attempt, wasTimeout, wasParentAbort);
      }

      await delay(retryDelay(options.retryPolicy, attempt));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", abortFromParent);
    }
  }

  throw normalizeExternalIOError(options.label, lastError, attempt, false, false);
}

function retryDelay(policy: ExternalIORetryPolicy | undefined, attempt: number): number {
  const interval = policy?.intervalMs ?? 250;
  if (policy?.backoffStrategy === "exponential") return Math.pow(2, attempt - 1) * interval;
  if (policy?.backoffStrategy === "linear") return attempt * interval;
  return interval;
}

function normalizeExternalIOError(
  label: string,
  error: unknown,
  attempts: number,
  timeout: boolean,
  aborted: boolean,
): ExternalIOError {
  if (timeout) {
    return new ExternalIOError(`${label} timed out`, "EXTERNAL_IO_TIMEOUT", attempts, error);
  }
  if (aborted) {
    return new ExternalIOError(`${label} was aborted`, "EXTERNAL_IO_ABORTED", attempts, error);
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ExternalIOError(`${label} failed: ${message}`, "EXTERNAL_IO_FAILED", attempts, error);
}
