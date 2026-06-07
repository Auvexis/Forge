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

export interface WorkflowGitSnapshotStatus {
  available: boolean;
  state: "missing" | "ready" | "no-commits" | "error";
  repoPath: string;
  branch: string | null;
  latestCommit: {
    hash: string;
    shortHash: string;
    committedAt: string;
    message: string;
  } | null;
  error: string | null;
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

  status(workflowId: string): WorkflowGitSnapshotStatus {
    const repoDir = this.repoDir(workflowId);
    if (!fs.existsSync(path.join(repoDir, ".git"))) {
      return {
        available: false,
        state: "missing",
        repoPath: repoDir,
        branch: null,
        latestCommit: null,
        error: null,
      };
    }

    try {
      const branch = this.git(["rev-parse", "--abbrev-ref", "HEAD"], repoDir).stdout?.trim() || null;
      const log = this.git(["log", "-1", "--format=%H%x00%h%x00%cI%x00%s"], repoDir, {
        allowedStatuses: [0, 128],
      });

      if (log.status === 128 || !log.stdout?.trim()) {
        return {
          available: true,
          state: "no-commits",
          repoPath: repoDir,
          branch,
          latestCommit: null,
          error: null,
        };
      }

      const [hash, shortHash, committedAt, message] = log.stdout.trim().split("\u0000");
      return {
        available: true,
        state: "ready",
        repoPath: repoDir,
        branch,
        latestCommit: {
          hash: hash ?? "",
          shortHash: shortHash ?? "",
          committedAt: committedAt ?? "",
          message: message ?? "",
        },
        error: null,
      };
    } catch (error) {
      return {
        available: false,
        state: "error",
        repoPath: repoDir,
        branch: null,
        latestCommit: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private repoDir(workflowId: string): string {
    return path.join(this.dataDir, "workflows-git", safeWorkflowDirectoryName(workflowId));
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
