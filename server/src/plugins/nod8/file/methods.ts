import fs from "node:fs";
import path from "node:path";

// Sandbox root — configurable via env, falls back to ./workspace relative to CWD
const WORKSPACE_ROOT = path.resolve(
  process.env.ND8_WORKSPACE_PATH ?? "./workspace",
);

/**
 * Resolves a user-supplied filename into an absolute sandboxed path.
 * Throws immediately if the resolved path escapes the sandbox.
 */
function safePath(workflowId: string, filename: string): string {
  // Sanitize: strip any leading slashes / drive letters
  const sanitized = filename.replace(/^[/\\]+/, "").replace(/^[a-zA-Z]:/, "");
  const resolved = path.resolve(WORKSPACE_ROOT, workflowId, sanitized);

  if (!resolved.startsWith(WORKSPACE_ROOT + path.sep) && resolved !== WORKSPACE_ROOT) {
    throw new Error(`Path traversal detected: "${filename}" escapes the sandbox.`);
  }

  return resolved;
}

/** Ensure the workflow sandbox directory exists. */
function ensureSandbox(workflowId: string): void {
  const dir = path.resolve(WORKSPACE_ROOT, workflowId);
  fs.mkdirSync(dir, { recursive: true });
}

export function createMethods() {
  return {
    async readText(params: { filename: string; workflowId: string }) {
      const target = safePath(params.workflowId, params.filename);
      if (!fs.existsSync(target)) throw new Error(`File not found: "${params.filename}"`);
      const content = fs.readFileSync(target, "utf8");
      return { content, filename: params.filename, bytes: Buffer.byteLength(content) };
    },

    async writeText(params: { filename: string; content: string; workflowId: string }) {
      ensureSandbox(params.workflowId);
      const target = safePath(params.workflowId, params.filename);
      fs.writeFileSync(target, params.content, "utf8");
      return { filename: params.filename, bytes: Buffer.byteLength(params.content), ok: true };
    },

    async readJson(params: { filename: string; workflowId: string }) {
      const target = safePath(params.workflowId, params.filename);
      if (!fs.existsSync(target)) throw new Error(`File not found: "${params.filename}"`);
      const raw = fs.readFileSync(target, "utf8");
      try {
        return { data: JSON.parse(raw), filename: params.filename };
      } catch {
        throw new Error(`File "${params.filename}" is not valid JSON.`);
      }
    },

    async writeJson(params: { filename: string; content: unknown; workflowId: string }) {
      ensureSandbox(params.workflowId);
      const target = safePath(params.workflowId, params.filename);
      const serialized = JSON.stringify(params.content, null, 2);
      fs.writeFileSync(target, serialized, "utf8");
      return { filename: params.filename, bytes: Buffer.byteLength(serialized), ok: true };
    },

    async deleteFile(params: { filename: string; workflowId: string }) {
      const target = safePath(params.workflowId, params.filename);
      if (!fs.existsSync(target)) throw new Error(`File not found: "${params.filename}"`);
      fs.unlinkSync(target);
      return { filename: params.filename, deleted: true };
    },

    async listFiles(params: { workflowId: string }) {
      const dir = path.resolve(WORKSPACE_ROOT, params.workflowId);
      if (!fs.existsSync(dir)) return { files: [], count: 0 };
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files = entries
        .filter((e) => e.isFile())
        .map((e) => {
          const stat = fs.statSync(path.join(dir, e.name));
          return { name: e.name, bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
        });
      return { files, count: files.length };
    },
  };
}
