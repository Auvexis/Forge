import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { WorkflowGitSnapshotService } from "./workflow-git-snapshot-service.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

function workflow(id: string, name = "Draft Workflow"): WorkflowItem {
  return {
    metadata: {
      id,
      name,
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-06-06T00:00:00.000Z",
      updatedAt: "2026-06-06T00:00:00.000Z",
    },
    trigger: { type: "manual" },
    nodes: {},
    edges: [],
    variables: [],
  };
}

describe("WorkflowGitSnapshotService", () => {
  it("writes a profile data git repository snapshot for a workflow", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-workflow-git-"));
    const commands: { args: string[]; cwd: string }[] = [];
    const service = new WorkflowGitSnapshotService({
      dataDir: root,
      runGit: (args, options) => {
        commands.push({ args, cwd: options.cwd });
        if (args.join(" ") === "diff --cached --quiet") {
          return { status: 1, stdout: "", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    service.save(workflow("wf:demo/one", "Demo"));

    const repoDir = path.join(root, "workflows-git", "wf-demo-one");
    assert.equal(fs.existsSync(path.join(repoDir, "workflow.json")), true);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(repoDir, "workflow.json"), "utf8")).metadata.name,
      "Demo",
    );
    assert.deepEqual(commands.map((command) => command.args), [
      ["init"],
      ["config", "user.name", "Sailor Workflow Git"],
      ["config", "user.email", "workflow-git@sailor.local"],
      ["add", "workflow.json"],
      ["diff", "--cached", "--quiet"],
      ["commit", "-m", "Save workflow Demo"],
    ]);
    assert.equal(commands.every((command) => command.cwd === repoDir), true);
  });
});
