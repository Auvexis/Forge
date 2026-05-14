import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDevWorkflowSessionRuntime } from "./runtime.ts";
import type { WorkflowItem } from "../../../../shared/models/workflow-types.ts";

function workflow(): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-05-14T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
  };
}

describe("dev workflow session runtime", () => {
  it("connects manager events to the session event bus", () => {
    const runtime = createDevWorkflowSessionRuntime({
      createId: () => "session-1",
    });
    const received: string[] = [];

    runtime.eventBus.onSession("session-1", (event) => received.push(event.type));
    runtime.manager.createSession(workflow());

    assert.deepEqual(received, ["session:start", "session:ready"]);
  });
});
