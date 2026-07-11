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
    const body = response.json() as {
      status_code: number;
      message: string;
      error: null;
      data: { nodes: Array<Record<string, any>> };
    };
    const code = body.data.nodes.find((node) => node.type === "code");
    const agent = body.data.nodes.find((node) => node.type === "ai-agent");

    assert.ok(code);
    if (!agent) throw new Error("AI Agent catalog entry was not found.");
    assert.equal(body.status_code, 200);
    assert.equal(body.error, null);
    assert.match(body.message, /catalog/i);
    assert.equal(code.label, "Code Block");
    assert.equal(code.packId, "fabric-core");
    assert.equal(typeof code.description, "string");
    assert.equal(typeof code.category, "string");
    assert.equal(code.style.icon, "code-2");
    assert.equal(code.style.iconColor, "var(--fabric-node-codeblock-icon)");
    assert.equal(typeof code.style.bgColor, "string");
    assert.equal(typeof code.style.borderColor, "string");
    assert.equal("execute" in code, false);
    assert.equal("handler" in code, false);
    assert.equal(agent.role, "flow");
    assert.deepEqual(agent.capabilities, []);
    assert.equal(agent.presentation.base, "advanced");
    assert.deepEqual(agent.handles.map((handle: any) => handle.id), ["chatModel", "memory", "tool"]);

    await app.close();
  });
});
