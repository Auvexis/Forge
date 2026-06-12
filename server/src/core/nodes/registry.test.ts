import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  NodeHandlerRegistry,
  createNodeHandler,
  createUtilityNodeRegistry,
} from "./registry.ts";
import type { NodeHandlerMetadata } from "./types.ts";

const metadata: NodeHandlerMetadata = {
  description: "Test handler",
  execution: "stateless",
  sideEffects: ["none"],
  outputs: [{ id: "default", label: "Default" }],
  errors: [],
};

describe("NodeHandlerRegistry", () => {
  it("registers and resolves utility node handlers by node type", () => {
    const handler = createNodeHandler("set", async () => ({ ok: true }), metadata);
    const registry = new NodeHandlerRegistry([handler]);

    assert.equal(registry.get("set"), handler);
    assert.equal(registry.has("set"), true);
  });

  it("rejects duplicate handler registrations", () => {
    const first = createNodeHandler("if", async () => ({ branch: "then" }), metadata);
    const second = createNodeHandler("if", async () => ({ branch: "else" }), metadata);

    assert.throws(
      () => new NodeHandlerRegistry([first, second]),
      /Duplicate node handler registered for type "if"/,
    );
  });

  it("keeps plugin execution outside the utility node registry", () => {
    const registry = createUtilityNodeRegistry();

    assert.equal(registry.has("plugin"), false);
    assert.throws(() => registry.get("plugin"), /No node handler registered for type "plugin"/);
  });

  it("creates the default registry with all first-party utility handlers", () => {
    const registry = createUtilityNodeRegistry();

    for (const nodeType of [
      "code",
      "if",
      "loop",
      "subworkflow",
      "trigger",
      "http",
      "event",
      "event-listener",
      "set",
      "switch",
      "merge",
      "split-in-batches",
      "respond-webhook",
    ] as const) {
      assert.equal(registry.has(nodeType), true, `${nodeType} should be registered`);
    }
  });
});
