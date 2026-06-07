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

  it("reports workflow git status with branch and latest commit metadata", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-workflow-git-status-"));
    const repoDir = path.join(root, "workflows-git", "wf-demo");
    fs.mkdirSync(path.join(repoDir, ".git"), { recursive: true });
    const service = new WorkflowGitSnapshotService({
      dataDir: root,
      runGit: (args) => {
        const command = args.join(" ");
        if (command === "rev-parse --abbrev-ref HEAD") return { status: 0, stdout: "main\n", stderr: "" };
        if (command === "log -1 --format=%H%x00%h%x00%cI%x00%s") {
          return {
            status: 0,
            stdout: "abc123def\u0000abc123d\u00002026-06-06T10:00:00-03:00\u0000Save workflow Demo\n",
            stderr: "",
          };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    assert.deepEqual(service.status("wf/demo"), {
      available: true,
      state: "ready",
      repoPath: repoDir,
      branch: "main",
      latestCommit: {
        hash: "abc123def",
        shortHash: "abc123d",
        committedAt: "2026-06-06T10:00:00-03:00",
        message: "Save workflow Demo",
      },
      error: null,
    });
  });

  it("reports a missing workflow git repository without throwing", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-workflow-git-missing-"));
    const service = new WorkflowGitSnapshotService({ dataDir: root });

    assert.deepEqual(service.status("wf-missing"), {
      available: false,
      state: "missing",
      repoPath: path.join(root, "workflows-git", "wf-missing"),
      branch: null,
      latestCommit: null,
      error: null,
    });
  });
});
