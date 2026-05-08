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
function safePath(executionId: string, filename: string): string {
  // Sanitize: strip any leading slashes / drive letters
  const sanitized = filename.replace(/^[/\\]+/, "").replace(/^[a-zA-Z]:/, "");
  const resolved = path.resolve(WORKSPACE_ROOT, executionId, sanitized);

  if (!resolved.startsWith(WORKSPACE_ROOT + path.sep) && resolved !== WORKSPACE_ROOT) {
    throw new Error(`Path traversal detected: "${filename}" escapes the sandbox.`);
  }

  return resolved;
}

/** Ensure the workflow sandbox directory exists. */
function ensureSandbox(executionId: string): void {
  const dir = path.resolve(WORKSPACE_ROOT, executionId);
  fs.mkdirSync(dir, { recursive: true });
}

export function cleanupSandbox(executionId: string): void {
  const dir = path.resolve(WORKSPACE_ROOT, executionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function createMethods() {
  return {
    async readFile(params: { filename: string; encoding?: BufferEncoding; executionId: string }) {
      const target = safePath(params.executionId, params.filename);
      if (!fs.existsSync(target)) throw new Error(`File not found: "${params.filename}"`);
      
      const enc = params.encoding || "utf8";
      const content = fs.readFileSync(target, enc);
      
      return { 
        content, 
        filename: params.filename, 
        encoding: enc,
        bytes: fs.statSync(target).size 
      };
    },

    async writeFile(params: { filename: string; content: string; encoding?: BufferEncoding; executionId: string }) {
      ensureSandbox(params.executionId);
      const target = safePath(params.executionId, params.filename);
      
      const enc = params.encoding || "utf8";
      fs.writeFileSync(target, params.content, enc);
      
      return { 
        filename: params.filename, 
        encoding: enc,
        bytes: fs.statSync(target).size, 
        ok: true 
      };
    },

    async deleteFile(params: { filename: string; executionId: string }) {
      const target = safePath(params.executionId, params.filename);
      if (!fs.existsSync(target)) throw new Error(`File not found: "${params.filename}"`);
      fs.unlinkSync(target);
      return { filename: params.filename, deleted: true };
    },

    async listFiles(params: { executionId: string }) {
      const dir = path.resolve(WORKSPACE_ROOT, params.executionId);
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

    async convertFile(params: { input: any; fromFormat?: string; toFormat: string }) {
      const from = params.fromFormat || "utf8";
      const to = params.toFormat || "base64";

      let buf: Buffer;
      if (from === "buffer" && Buffer.isBuffer(params.input)) {
        buf = params.input;
      } else if (from === "buffer" && params.input && params.input.type === "Buffer" && Array.isArray(params.input.data)) {
        // Handle JSON serialized buffers
        buf = Buffer.from(params.input.data);
      } else if (from === "buffer" && params.input && params.input.buffer && Buffer.isBuffer(params.input.buffer)) {
        // Handle trigger object format from forms
        buf = params.input.buffer;
      } else if (typeof params.input === "string") {
        buf = Buffer.from(params.input, from as BufferEncoding);
      } else {
        throw new Error("Invalid input or format. Input must be a string or Buffer.");
      }

      let result: any;
      if (to === "buffer") {
        result = buf;
      } else {
        result = buf.toString(to as BufferEncoding);
      }

      return {
        result,
        sizeBytes: buf.length,
        format: to
      };
    },
  };
}
