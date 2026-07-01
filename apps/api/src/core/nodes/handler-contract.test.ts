import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createUtilityNodeRegistry } from "./registry.ts";
import type { NodeHandlerMetadata } from "./types.ts";

describe("NodeHandler contract metadata", () => {
  it("exposes explicit execution metadata for every first-party utility handler", () => {
    const registry = createUtilityNodeRegistry();

    for (const handler of registry.list()) {
      assert.equal(typeof handler.metadata.description, "string", `${handler.type} description`);
      assert.ok(handler.metadata.description.length > 0, `${handler.type} description is not empty`);
      assert.ok(isExecutionKind(handler.metadata.execution), `${handler.type} execution kind`);
      assert.ok(Array.isArray(handler.metadata.sideEffects), `${handler.type} side effects`);
      assert.ok(Array.isArray(handler.metadata.errors), `${handler.type} errors`);
      assert.ok(Array.isArray(handler.metadata.outputs), `${handler.type} outputs`);
    }
  });
});

function isExecutionKind(value: NodeHandlerMetadata["execution"]): boolean {
  return ["stateless", "subgraph", "external-io", "long-running"].includes(value);
}
