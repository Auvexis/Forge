import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";

import commandPaletteRoutes from "./command-palette.routes.ts";
import { CommandRegistry } from "../modules/command-palette/command-registry.ts";
import type { CommandDescriptor } from "../modules/command-palette/command-types.ts";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";

function descriptor(overrides: Partial<CommandDescriptor> = {}): CommandDescriptor {
  return {
    id: "workflow.create",
    group: "workflow",
    label: "Create Workflow",
    keywords: ["new"],
    availability: { enabled: true },
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  const registry = new CommandRegistry();
  registry.registerProvider({
    id: "test",
    order: 10,
    commands: [
      {
        describe: () => descriptor(),
        execute: async () => ({ ok: true, navigation: { path: "/workflows/new" } }),
      },
      {
        describe: () => descriptor({
          id: "workflow.delete",
          label: "Delete Workflow",
          destructive: true,
          availability: { enabled: false, reason: "No active workflow" },
        }),
        execute: async () => ({ ok: true }),
      },
    ],
  });
  await app.register(commandPaletteRoutes, { registry });
  return app;
}

describe("command palette routes", () => {
  it("lists descriptors without leaking runtime payload schemas", async () => {
    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/command-palette/commands" });
    const body = response.json() as ApiResponse<Array<Record<string, unknown>>>;

    assert.equal(response.statusCode, 200);
    assert.equal(body.data?.[0]?.id, "workflow.create");
    assert.equal("payloadSchema" in (body.data?.[0] ?? {}), false);
  });

  it("searches command descriptors and executes a command", async () => {
    const app = await buildApp();
    const search = await app.inject({ method: "GET", url: "/command-palette/search?q=create" });
    const searchBody = search.json() as ApiResponse<Array<{ id: string }>>;

    assert.deepEqual(searchBody.data?.map((command) => command.id), ["workflow.create"]);

    const execute = await app.inject({
      method: "POST",
      url: "/command-palette/commands/workflow.create/execute",
      payload: {},
    });
    const executeBody = execute.json() as ApiResponse<{ ok: boolean; navigation: { path: string } }>;

    assert.equal(execute.statusCode, 200);
    assert.equal(executeBody.data?.ok, true);
    assert.equal(executeBody.data?.navigation.path, "/workflows/new");
  });

  it("returns a 400 response for disabled commands", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/command-palette/commands/workflow.delete/execute",
      payload: {},
    });
    const body = response.json() as ApiResponse<null>;

    assert.equal(response.statusCode, 400);
    assert.equal(body.error, "Command disabled: No active workflow");
  });
});
