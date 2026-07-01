/**
 * PendingWebhookResponseRegistry
 *
 * Decoupled mediator between the webhook HTTP handler and the workflow executor.
 * The Fastify reply object NEVER enters the executor — only the correlationId does.
 *
 * Flow:
 *   1. Webhook handler generates correlationId → calls waitForResponse()
 *   2. Executor calls resolve() when it hits a RespondToWebhookNode
 *   3. Handler receives the resolved value and sends the HTTP response
 *   4. Auto-timeout (default 30s) sends 504 if the workflow never responds
 */

export interface WebhookPendingResponse {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
}

interface PendingEntry {
  resolve: (response: WebhookPendingResponse) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

const registry = new Map<string, PendingEntry>();

export const PendingWebhookResponseRegistry = {
  /**
   * Register a pending response slot. Returns a Promise that resolves when
   * the executor calls resolve() or rejects on timeout.
   */
  waitForResponse(
    correlationId: string,
    timeoutMs = 30_000,
  ): Promise<WebhookPendingResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        registry.delete(correlationId);
        reject(new Error(`Webhook response timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      registry.set(correlationId, { resolve, reject, timer });
    });
  },

  /**
   * Called by the executor when a RespondToWebhookNode is reached.
   * Returns true if the correlationId was found (i.e. caller is still waiting).
   */
  resolve(correlationId: string, response: WebhookPendingResponse): boolean {
    const entry = registry.get(correlationId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    registry.delete(correlationId);
    entry.resolve(response);
    return true;
  },

  /** Utility for testing/debugging — number of open slots */
  size(): number {
    return registry.size;
  },
};
