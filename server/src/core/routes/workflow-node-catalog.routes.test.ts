import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import workflowNodeCatalogRoutes from "./workflow-node-catalog.routes.ts";

describe("workflow node catalog routes", () => {
  it("returns catalog metadata and styles without handler implementation details", async () => {
    const app = Fastify({ logger: false });
    await app.register(workflowNodeCatalogRoutes);

    const response = await app.inject({
      method: "GET",
      url: "/workflow-nodes/catalog",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as { nodes: Array<Record<string, any>> };
    const code = body.nodes.find((node) => node.type === "code");

    assert.ok(code);
    assert.equal(code.label, "Code Block");
    assert.equal(code.packId, "sailor-core");
    assert.equal(typeof code.description, "string");
    assert.equal(typeof code.category, "string");
    assert.equal(code.style.icon, "code-2");
    assert.equal(code.style.iconColor, "#60a5fa");
    assert.equal(typeof code.style.bgColor, "string");
    assert.equal(typeof code.style.borderColor, "string");
    assert.equal("execute" in code, false);
    assert.equal("handler" in code, false);

    await app.close();
  });
});
