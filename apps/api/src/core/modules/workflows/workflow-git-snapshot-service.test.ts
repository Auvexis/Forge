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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-workflow-git-"));
    const commands: { args: string[]; cwd: string }[] = [];
    const service = new WorkflowGitSnapshotService({
      dataDir: root,
      runGit: (args, options) => {
        commands.push({ args, cwd: options.cwd });
        if (args.join(" ") === "init") {
          fs.mkdirSync(path.join(options.cwd, ".git"), { recursive: true });
        }
        if (args.join(" ") === "diff --cached --quiet") {
          return { status: 1, stdout: "", stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const result = service.save(workflow("wf:demo/one", "Demo"), "Manual checkpoint");

    const repoDir = path.join(root, "workflows-git", "wf-demo-one");
    assert.equal(fs.existsSync(path.join(repoDir, "workflow.json")), true);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(repoDir, "workflow.json"), "utf8")).metadata.name,
      "Demo",
    );
    assert.deepEqual(commands.map((command) => command.args), [
      ["init"],
      ["config", "user.name", "Fabric Workflow Git"],
      ["config", "user.email", "workflow-git@fabric.local"],
      ["add", "workflow.json"],
      ["diff", "--cached", "--quiet"],
      ["commit", "-m", "Manual checkpoint"],
      ["rev-parse", "--abbrev-ref", "HEAD"],
      ["log", "-1", "--format=%H%x00%h%x00%cI%x00%s"],
    ]);
    assert.equal(commands.every((command) => command.cwd === repoDir), true);
    assert.equal(result.committed, true);
  });

  it("returns an unchanged commit result when workflow json has no staged diff", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-workflow-git-clean-"));
    const service = new WorkflowGitSnapshotService({
      dataDir: root,
      runGit: (args, options) => {
        const command = args.join(" ");
        if (command === "init") fs.mkdirSync(path.join(options.cwd, ".git"), { recursive: true });
        if (command === "diff --cached --quiet") return { status: 0, stdout: "", stderr: "" };
        if (command === "rev-parse --abbrev-ref HEAD") return { status: 0, stdout: "main\n", stderr: "" };
        if (command === "log -1 --format=%H%x00%h%x00%cI%x00%s") {
          return {
            status: 0,
            stdout: "abc123def\u0000abc123d\u00002026-06-07T00:00:00.000Z\u0000Existing checkpoint\n",
            stderr: "",
          };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    const result = service.save(workflow("wf-clean", "Clean"), "No-op checkpoint");

    assert.equal(result.committed, false);
    assert.equal(result.status.latestCommit?.message, "Existing checkpoint");
  });

  it("reports workflow git status with branch and latest commit metadata", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-workflow-git-status-"));
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
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-workflow-git-missing-"));
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

  it("removes a workflow git repository folder", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-workflow-git-delete-"));
    const repoDir = path.join(root, "workflows-git", "wf-delete");
    fs.mkdirSync(path.join(repoDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(repoDir, "workflow.json"), "{}", "utf8");
    const service = new WorkflowGitSnapshotService({ dataDir: root });

    service.deleteRepository("wf-delete");

    assert.equal(fs.existsSync(repoDir), false);
  });

  it("lists workflow git snapshots from the repository log", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-workflow-git-list-"));
    const repoDir = path.join(root, "workflows-git", "wf-list");
    fs.mkdirSync(path.join(repoDir, ".git"), { recursive: true });
    const service = new WorkflowGitSnapshotService({
      dataDir: root,
      runGit: (args) => {
        if (args.join(" ") === "log --format=%H%x00%h%x00%cI%x00%s") {
          return {
            status: 0,
            stdout: [
              "abc123def\u0000abc123d\u00002026-06-06T10:00:00-03:00\u0000Save workflow Demo",
              "def456abc\u0000def456a\u00002026-06-06T09:00:00-03:00\u0000Save workflow Demo",
            ].join("\n"),
            stderr: "",
          };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    assert.deepEqual(service.listSnapshots("wf-list"), [
      {
        hash: "abc123def",
        shortHash: "abc123d",
        committedAt: "2026-06-06T10:00:00-03:00",
        message: "Save workflow Demo",
      },
      {
        hash: "def456abc",
        shortHash: "def456a",
        committedAt: "2026-06-06T09:00:00-03:00",
        message: "Save workflow Demo",
      },
    ]);
  });

  it("reads workflow json from a git snapshot", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-workflow-git-read-"));
    const repoDir = path.join(root, "workflows-git", "wf-read");
    fs.mkdirSync(path.join(repoDir, ".git"), { recursive: true });
    const snapshotWorkflow = workflow("wf-read", "Snapshot Version");
    const service = new WorkflowGitSnapshotService({
      dataDir: root,
      runGit: (args) => {
        if (args.join(" ") === "show abc123def:workflow.json") {
          return { status: 0, stdout: JSON.stringify(snapshotWorkflow), stderr: "" };
        }
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    assert.deepEqual(service.readSnapshot("wf-read", "abc123def"), {
      hash: "abc123def",
      rawWorkflowJson: JSON.stringify(snapshotWorkflow),
      workflow: snapshotWorkflow,
    });
  });
});
