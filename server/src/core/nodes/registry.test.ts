import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  NodeHandlerRegistry,
  createNodeHandler,
  createUtilityNodeRegistry,
} from "./registry.ts";

describe("NodeHandlerRegistry", () => {
  it("registers and resolves utility node handlers by node type", () => {
    const handler = createNodeHandler("set", async () => ({ ok: true }));
    const registry = new NodeHandlerRegistry([handler]);

    assert.equal(registry.get("set"), handler);
    assert.equal(registry.has("set"), true);
  });

  it("rejects duplicate handler registrations", () => {
    const first = createNodeHandler("if", async () => ({ branch: "then" }));
    const second = createNodeHandler("if", async () => ({ branch: "else" }));

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
});
