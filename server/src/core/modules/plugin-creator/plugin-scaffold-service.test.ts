import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PluginScaffoldService } from "./plugin-scaffold-service.ts";

describe("PluginScaffoldService", () => {
  it("creates a default blueprint with version 0.1.0 and empty canvas", () => {
    const service = new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    });

    const blueprint = service.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
      icon: "icon.svg",
      iconDark: "icon-dark.svg",
      iconLight: "icon-light.svg",
    });

    assert.equal(blueprint.id, "bp_fixed");
    assert.equal(blueprint.metadata.version, "0.1.0");
    assert.equal(blueprint.auth.type, "none");
    assert.deepEqual(blueprint.methods, []);
    assert.deepEqual(blueprint.canvas, { nodes: {}, edges: [] });
    assert.equal(blueprint.createdAt, "2026-05-20T00:00:00.000Z");
    assert.equal(blueprint.updatedAt, "2026-05-20T00:00:00.000Z");
  });

  it("creates a default HTTP method and cluster when requested", () => {
    const service = new PluginScaffoldService({
      createId: (prefix) => `${prefix}_fixed`,
      now: () => "2026-05-20T00:00:00.000Z",
    });

    const blueprint = service.createBlueprint({
      handle: "my-crm",
      name: "My CRM",
      description: "CRM API connector",
      includeDefaultMethod: true,
    });

    assert.equal(blueprint.methods.length, 1);
    assert.equal(blueprint.methods[0]?.id, "method_fixed");
    assert.equal(blueprint.methods[0]?.handle, "callApi");
    assert.equal(blueprint.methods[0]?.request.method, "GET");
    assert.equal(blueprint.methods[0]?.request.url, "https://api.example.com");
    assert.deepEqual(Object.keys(blueprint.canvas.nodes), [
      "node_method_fixed",
      "node_inputs_fixed",
      "node_request_fixed",
      "node_response_fixed",
      "node_output_fixed",
    ]);
    assert.equal(blueprint.canvas.edges.length, 3);
  });

  it("creates standalone default methods with predictable ids", () => {
    const service = new PluginScaffoldService({
      createId: (prefix) => `${prefix}_abc`,
      now: () => "2026-05-20T00:00:00.000Z",
    });

    const method = service.createDefaultMethod({
      handle: "createLead",
      name: "Create Lead",
      description: "Create a CRM lead",
      category: "Leads",
    });

    assert.equal(method.id, "method_abc");
    assert.equal(method.handle, "createLead");
    assert.equal(method.category, "Leads");
    assert.deepEqual(method.inputs, []);
    assert.deepEqual(method.responseMapping, []);
    assert.deepEqual(method.errorMapping, []);
  });
});
