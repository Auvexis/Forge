import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import { CommandExecutor } from "./command-executor.ts";
import { CommandRegistry } from "./command-registry.ts";
import type { CommandDescriptor, CommandHandler } from "./command-types.ts";

function descriptor(): CommandDescriptor {
  return {
    id: "workflow.rename",
    group: "workflow",
    label: "Rename Workflow",
    payloadSchema: z.object({ name: z.string().min(1) }),
    availability: { enabled: true },
  };
}

describe("CommandExecutor", () => {
  it("validates payload before executing a command", async () => {
    let calls = 0;
    const handler: CommandHandler = {
      describe: () => descriptor(),
      execute: async (_context, payload) => {
        calls++;
        return { ok: true, message: `renamed to ${(payload as { name: string }).name}` };
      },
    };
    const registry = new CommandRegistry();
    registry.registerProvider({ id: "workflows", order: 10, commands: [handler] });
    const executor = new CommandExecutor(registry);

    await assert.rejects(
      () => executor.execute("workflow.rename", {}, { name: "" }),
      /Invalid command payload/,
    );
    assert.equal(calls, 0);

    const result = await executor.execute("workflow.rename", {}, { name: "Launch Flow" });
    assert.deepEqual(result, { ok: true, message: "renamed to Launch Flow" });
    assert.equal(calls, 1);
  });

  it("rejects unknown and disabled commands", async () => {
    const registry = new CommandRegistry();
    registry.registerProvider({
      id: "workflows",
      order: 10,
      commands: [
        {
          describe: () => ({
            id: "workflow.delete",
            group: "workflow",
            label: "Delete Workflow",
            destructive: true,
            availability: { enabled: false, reason: "No active workflow" },
          }),
          execute: async () => ({ ok: true }),
        },
      ],
    });
    const executor = new CommandExecutor(registry);

    await assert.rejects(() => executor.execute("missing", {}, {}), /Command not found/);
    await assert.rejects(
      () => executor.execute("workflow.delete", {}, {}),
      /Command disabled: No active workflow/,
    );
  });
});
