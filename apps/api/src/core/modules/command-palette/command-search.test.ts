import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { searchCommands } from "./command-search.ts";
import type { CommandDescriptor } from "./command-types.ts";

function command(id: string, label: string, keywords: string[] = []): CommandDescriptor {
  return {
    id,
    group: "workflow",
    label,
    keywords,
    availability: { enabled: true },
  };
}

describe("command search", () => {
  it("ranks exact and prefix label matches ahead of keyword-only matches", () => {
    const results = searchCommands("create workflow", [
      command("workflow.import", "Import Workflow", ["create workflow from json"]),
      command("workflow.create", "Create Workflow", ["new"]),
      command("workflow.delete", "Delete Workflow", ["remove"]),
    ]);

    assert.deepEqual(results.map((result) => result.command.id), [
      "workflow.create",
      "workflow.import",
    ]);
  });

  it("returns all commands for an empty query in deterministic label order", () => {
    const results = searchCommands("", [
      command("plugin.disconnect", "Disconnect Plugin"),
      command("workflow.create", "Create Workflow"),
      command("nav.universe", "Universe"),
    ]);

    assert.deepEqual(results.map((result) => result.command.id), [
      "workflow.create",
      "plugin.disconnect",
      "nav.universe",
    ]);
  });
});
