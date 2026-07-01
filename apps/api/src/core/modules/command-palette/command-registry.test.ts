import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CommandRegistry,
  filterVisibleCommands,
  normalizeCommandDescriptor,
} from "./command-registry.ts";
import type {
  CommandDescriptor,
  CommandExecutionContext,
  CommandHandler,
} from "./command-types.ts";

function descriptor(overrides: Partial<CommandDescriptor> = {}): CommandDescriptor {
  return {
    id: "workflow.create",
    group: "workflow",
    label: "Create Workflow",
    description: "Create a new workflow",
    keywords: ["new", "workflow"],
    icon: "plus",
    destructive: false,
    availability: { enabled: true },
    ...overrides,
  };
}

function handler(command: CommandDescriptor): CommandHandler {
  return {
    describe: () => command,
    execute: async () => ({ ok: true }),
  };
}

const context = {} as CommandExecutionContext;

describe("CommandRegistry", () => {
  it("rejects duplicate command ids across providers", async () => {
    const registry = new CommandRegistry();

    registry.registerProvider({
      id: "workflows",
      order: 20,
      commands: [handler(descriptor({ id: "workflow.create" }))],
    });

    registry.registerProvider({
      id: "plugins",
      order: 30,
      commands: [handler(descriptor({ id: "workflow.create", label: "Duplicate" }))],
    });

    await assert.rejects(
      () => registry.list(context),
      /Duplicate command id "workflow.create"/,
    );
  });

  it("lists commands deterministically by provider order then command label", async () => {
    const registry = new CommandRegistry();

    registry.registerProvider({
      id: "plugins",
      order: 30,
      commands: [
        handler(descriptor({ id: "plugin.disconnect", group: "plugin", label: "Disconnect Plugin" })),
      ],
    });
    registry.registerProvider({
      id: "navigation",
      order: 10,
      commands: [
        handler(descriptor({ id: "nav.universe", group: "navigation", label: "Universe" })),
        handler(descriptor({ id: "nav.workflows", group: "navigation", label: "Workflows" })),
      ],
    });

    const commands = await registry.list(context);

    assert.deepEqual(commands.map((command) => command.id), [
      "nav.universe",
      "nav.workflows",
      "plugin.disconnect",
    ]);
  });
});

describe("command descriptor helpers", () => {
  it("normalizes labels and keyword fields for stable search indexing", () => {
    const command = normalizeCommandDescriptor(descriptor({
      id: " Workflow.Create ",
      label: "  Create   Workflow  ",
      keywords: ["New", "workflow", "new", "  "],
    }));

    assert.equal(command.id, "workflow.create");
    assert.equal(command.label, "Create Workflow");
    assert.deepEqual(command.keywords, ["new", "workflow"]);
  });

  it("hides commands marked hidden while keeping disabled visible commands", () => {
    const visible = descriptor({ id: "workflow.create" });
    const hidden = descriptor({
      id: "plugin.install",
      availability: { enabled: false, hidden: true, reason: "No install API" },
    });
    const disabled = descriptor({
      id: "workflow.delete",
      destructive: true,
      availability: { enabled: false, reason: "No active workflow" },
    });

    assert.deepEqual(filterVisibleCommands([visible, hidden, disabled]).map((c) => c.id), [
      "workflow.create",
      "workflow.delete",
    ]);
  });
});
