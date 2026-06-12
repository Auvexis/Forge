/**
 * CancellationRegistry
 *
 * A simple, process-scoped registry for tracking which executions
 * have been cancelled. The executor polls this between each node
 * to decide whether to abort cleanly.
 *
 * Design principles:
 * - No external dependencies — just an in-memory Set.
 * - Entries are removed after retrieval to avoid memory leaks.
 * - Safe for concurrent use since Node.js is single-threaded.
 */

const cancelledIds = new Set<string>();
const abortControllers = new Map<string, AbortController>();

export const CancellationRegistry = {
  /**
   * Mark an execution as cancelled. The executor will stop at its
   * next checkpoint (before the next node begins).
   */
  cancel(executionId: string): void {
    cancelledIds.add(executionId);
    abortControllers.get(executionId)?.abort();
  },

  /**
   * Returns true if the execution has been cancelled.
   * Does NOT remove the entry — use `consume()` for that.
   */
  isCancelled(executionId: string): boolean {
    return cancelledIds.has(executionId);
  },

  /**
   * Returns true and removes the entry. Used by the executor after
   * stopping so the registry doesn't grow indefinitely.
   */
  consume(executionId: string): boolean {
    if (cancelledIds.has(executionId)) {
      this.clear(executionId);
      return true;
    }
    return false;
  },

  /**
   * Returns an AbortSignal tied to the execution. Model adapters use this
   * to stop in-flight LLM requests as soon as cancellation is requested.
   */
  signal(executionId: string): AbortSignal {
    let controller = abortControllers.get(executionId);
    if (!controller) {
      controller = new AbortController();
      abortControllers.set(executionId, controller);
    }
    return controller.signal;
  },

  /**
   * Remove all cancellation state for a finished execution.
   */
  clear(executionId: string): void {
    cancelledIds.delete(executionId);
    abortControllers.delete(executionId);
  },
};
