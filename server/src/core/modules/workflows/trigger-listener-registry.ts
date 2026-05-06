// ──────────── TriggerListenerRegistry ────────────
//
// In-memory registry that tracks which webhook paths are currently in
// "Listen for Event" mode. When a webhook arrives for a registered path,
// the handler intercepts it, emits the payload via SSE, and removes the entry.
//
// Design decisions:
// - Keyed by webhookPath (not workflowId) for O(1) lookup at webhook ingress.
// - TTL enforced externally (route sets a setTimeout and calls remove).
// - No coupling to any plugin or workflow business logic.

/** Function that pushes data to the SSE connection opened by the frontend. */
type SseSender = (payload: Record<string, any>) => void;

interface ListenerEntry {
  workflowId: string;
  send: SseSender;
}

const registry = new Map<string, ListenerEntry>();

export const TriggerListenerRegistry = {
  /**
   * Register a webhook path as "listening".
   * The `send` callback will be invoked with the intercepted payload.
   */
  register(webhookPath: string, workflowId: string, send: SseSender): void {
    registry.set(webhookPath, { workflowId, send });
    console.log(`[NOD8 | LISTEN]: Registered listener for webhook path '${webhookPath}'`);
  },

  /**
   * Returns true if the given webhook path currently has an active listener.
   */
  has(webhookPath: string): boolean {
    return registry.has(webhookPath);
  },

  /**
   * Consume a listener entry: invoke the SSE sender with the intercepted payload
   * and remove the entry from the registry (one-shot capture).
   * Returns true if a listener was found and consumed, false otherwise.
   */
  consume(webhookPath: string, payload: Record<string, any>): { consumed: boolean; workflowId: string | null } {
    const entry = registry.get(webhookPath);
    if (!entry) return { consumed: false, workflowId: null };

    try {
      entry.send(payload);
    } catch {
      // SSE connection may have already closed; ignore silently
    }

    registry.delete(webhookPath);
    console.log(`[NOD8 | LISTEN]: Consumed listener for webhook path '${webhookPath}'`);
    return { consumed: true, workflowId: entry.workflowId };
  },

  /**
   * Explicitly remove a listener entry (e.g. on timeout or client disconnect).
   */
  remove(webhookPath: string): void {
    if (registry.delete(webhookPath)) {
      console.log(`[NOD8 | LISTEN]: Removed listener for webhook path '${webhookPath}'`);
    }
  },

  /**
   * Returns all currently active listener webhook paths (for diagnostics).
   */
  getActiveListeners(): string[] {
    return Array.from(registry.keys());
  },
};
