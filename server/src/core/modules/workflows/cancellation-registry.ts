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

export const CancellationRegistry = {
  /**
   * Mark an execution as cancelled. The executor will stop at its
   * next checkpoint (before the next node begins).
   */
  cancel(executionId: string): void {
    cancelledIds.add(executionId);
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
      cancelledIds.delete(executionId);
      return true;
    }
    return false;
  },
};
