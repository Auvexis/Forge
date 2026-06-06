import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

export interface GitRunResult {
  status: number | null;
  stdout?: string;
  stderr?: string;
}

export interface WorkflowGitSnapshotServiceOptions {
  dataDir: string;
  runGit?: (args: string[], options: { cwd: string }) => GitRunResult;
}

export class WorkflowGitSnapshotService {
  private readonly dataDir: string;
  private readonly runGit: NonNullable<WorkflowGitSnapshotServiceOptions["runGit"]>;

  constructor(options: WorkflowGitSnapshotServiceOptions) {
    this.dataDir = options.dataDir;
    this.runGit = options.runGit ?? defaultRunGit;
  }

  save(workflow: WorkflowItem): void {
    const repoDir = path.join(this.dataDir, "workflows-git", safeWorkflowDirectoryName(workflow.metadata.id));
    fs.mkdirSync(repoDir, { recursive: true });

    if (!fs.existsSync(path.join(repoDir, ".git"))) {
      this.git(["init"], repoDir);
    }

    this.git(["config", "user.name", "Sailor Workflow Git"], repoDir);
    this.git(["config", "user.email", "workflow-git@sailor.local"], repoDir);
    fs.writeFileSync(path.join(repoDir, "workflow.json"), `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
    this.git(["add", "workflow.json"], repoDir);

    const diff = this.git(["diff", "--cached", "--quiet"], repoDir, { allowedStatuses: [0, 1] });
    if (diff.status === 0) return;

    this.git(["commit", "-m", `Save workflow ${workflow.metadata.name}`], repoDir);
  }

  private git(
    args: string[],
    cwd: string,
    options: { allowedStatuses?: number[] } = {},
  ): GitRunResult {
    const result = this.runGit(args, { cwd });
    const allowedStatuses = options.allowedStatuses ?? [0];
    if (!allowedStatuses.includes(result.status ?? -1)) {
      throw new Error(`Workflow git command failed: git ${args.join(" ")} ${result.stderr ?? ""}`.trim());
    }
    return result;
  }
}

function defaultRunGit(args: string[], options: { cwd: string }): GitRunResult {
  const result = spawnSync("git", args, {
    cwd: options.cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr || (result.error ? String(result.error) : ""),
  };
}

function safeWorkflowDirectoryName(workflowId: string): string {
  const safe = workflowId.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safe || "workflow";
}
