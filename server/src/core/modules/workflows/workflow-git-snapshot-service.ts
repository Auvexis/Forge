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

export interface WorkflowGitSnapshotSummary {
  hash: string;
  shortHash: string;
  committedAt: string;
  message: string;
}

export interface WorkflowGitSnapshotFile {
  hash: string;
  rawWorkflowJson: string;
  workflow: WorkflowItem;
}

export interface WorkflowGitCommitResult {
  committed: boolean;
  status: WorkflowGitSnapshotStatus;
}

export class WorkflowGitSnapshotService {
  private readonly dataDir: string;
  private readonly runGit: NonNullable<WorkflowGitSnapshotServiceOptions["runGit"]>;

  constructor(options: WorkflowGitSnapshotServiceOptions) {
    this.dataDir = options.dataDir;
    this.runGit = options.runGit ?? defaultRunGit;
  }

  save(workflow: WorkflowItem, message?: string): WorkflowGitCommitResult {
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
    if (diff.status === 0) {
      return {
        committed: false,
        status: this.status(workflow.metadata.id),
      };
    }

    this.git(["commit", "-m", normalizeCommitMessage(message, workflow)], repoDir);
    return {
      committed: true,
      status: this.status(workflow.metadata.id),
    };
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

  listSnapshots(workflowId: string): WorkflowGitSnapshotSummary[] {
    const repoDir = this.repoDir(workflowId);
    if (!fs.existsSync(path.join(repoDir, ".git"))) return [];

    const log = this.git(["log", "--format=%H%x00%h%x00%cI%x00%s"], repoDir, {
      allowedStatuses: [0, 128],
    });
    if (log.status === 128 || !log.stdout?.trim()) return [];

    return log.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, committedAt, message] = line.split("\u0000");
        return {
          hash: hash ?? "",
          shortHash: shortHash ?? "",
          committedAt: committedAt ?? "",
          message: message ?? "",
        };
      });
  }

  readSnapshot(workflowId: string, hash: string): WorkflowGitSnapshotFile {
    const safeHash = validateCommitHash(hash);
    const repoDir = this.repoDir(workflowId);
    if (!fs.existsSync(path.join(repoDir, ".git"))) {
      throw new Error("Workflow git repository not found");
    }

    const result = this.git(["show", `${safeHash}:workflow.json`], repoDir);
    const rawWorkflowJson = result.stdout ?? "";
    return {
      hash: safeHash,
      rawWorkflowJson,
      workflow: JSON.parse(rawWorkflowJson) as WorkflowItem,
    };
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

function validateCommitHash(hash: string): string {
  const safe = hash.trim();
  if (!/^[a-f0-9]{4,40}$/i.test(safe)) {
    throw new Error("Invalid workflow git snapshot hash");
  }
  return safe;
}

function normalizeCommitMessage(message: string | undefined, workflow: WorkflowItem): string {
  const clean = message?.trim();
  return clean || `Save workflow ${workflow.metadata.name}`;
}
