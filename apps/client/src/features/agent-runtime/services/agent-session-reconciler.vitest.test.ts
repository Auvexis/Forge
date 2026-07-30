import { describe, expect, it, vi } from "vitest";
import type { AgentSessionSnapshot } from "../types/agent.types";
import { AgentSessionReconciler } from "./agent-session-reconciler";

describe("AgentSessionReconciler", () => {
  it("uses invalidation only to refetch the canonical snapshot", async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce(snapshot(1))
      .mockResolvedValueOnce(snapshot(4));
    const reconciler = new AgentSessionReconciler(loader);

    await reconciler.refresh();
    reconciler.invalidate(4);
    await vi.waitFor(() => expect(reconciler.state.snapshot?.revision).toBe(4));

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("recovers from a lost event on an explicit lifecycle refresh", async () => {
    const loader = vi.fn()
      .mockResolvedValueOnce(snapshot(2))
      .mockResolvedValueOnce(snapshot(7));
    const reconciler = new AgentSessionReconciler(loader);

    await reconciler.refresh();
    // No event arrives for revisions 3 through 7.
    await reconciler.refresh();

    expect(reconciler.state.snapshot?.revision).toBe(7);
  });

  it("coalesces concurrent refreshes and never rolls back a revision", async () => {
    let resolveFirst!: (value: AgentSessionSnapshot) => void;
    const first = new Promise<AgentSessionSnapshot>((resolve) => {
      resolveFirst = resolve;
    });
    const loader = vi.fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(snapshot(9));
    const reconciler = new AgentSessionReconciler(loader);

    const pending = reconciler.refresh();
    reconciler.invalidate(9);
    resolveFirst(snapshot(5));
    await pending;
    await vi.waitFor(() => expect(reconciler.state.snapshot?.revision).toBe(9));

    reconciler.invalidate(8);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("ignores duplicate and out-of-order invalidation revisions", async () => {
    const loader = vi.fn().mockResolvedValue(snapshot(12));
    const reconciler = new AgentSessionReconciler(loader);

    await reconciler.refresh();
    reconciler.invalidate(12);
    reconciler.invalidate(11);
    reconciler.invalidate(4);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(reconciler.state.snapshot?.revision).toBe(12);
  });

  it("lets independent tabs converge through canonical refreshes", async () => {
    let serverRevision = 3;
    const loadFromServer = vi.fn(async () => snapshot(serverRevision));
    const firstTab = new AgentSessionReconciler(loadFromServer);
    const secondTab = new AgentSessionReconciler(loadFromServer);

    await Promise.all([firstTab.refresh(), secondTab.refresh()]);
    serverRevision = 8;
    firstTab.invalidate(8);
    await vi.waitFor(() => expect(firstTab.state.snapshot?.revision).toBe(8));
    expect(secondTab.state.snapshot?.revision).toBe(3);

    // The second tab missed the invalidation and later regains focus.
    await secondTab.refresh();

    expect(secondTab.state.snapshot?.revision).toBe(8);
    expect(firstTab.state.snapshot).toEqual(secondTab.state.snapshot);
  });
});

function snapshot(revision: number): AgentSessionSnapshot {
  const timestamp = "2026-07-30T00:00:00.000Z";
  return {
    session: {
      id: "session_1",
      profileId: "profile_1",
      workflowId: "workflow_1",
      triggerNodeId: "trigger_1",
      title: "Session",
      state: "active",
      revision,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    activeTurn: null,
    messages: [],
    pendingInteraction: null,
    revision,
  };
}
