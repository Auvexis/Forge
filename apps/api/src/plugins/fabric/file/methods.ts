import fs from "node:fs";
import path from "node:path";

// Sandbox root — configurable via env, falls back to ./workspace relative to CWD
const WORKSPACE_ROOT = path.resolve(
  process.env.FABRIC_WORKSPACE_PATH ?? "./workspace",
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

      const input = extractFileContent(params.input);
      let buf: Buffer;
      if (from === "buffer" && Buffer.isBuffer(input)) {
        buf = input;
      } else if (from === "buffer" && input && input.type === "Buffer" && Array.isArray(input.data)) {
        buf = Buffer.from(input.data);
      } else if (typeof input === "string") {
        buf = Buffer.from(input, from as BufferEncoding);
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

    async setFileMetadata(params: { file: Buffer | string; filename: string; mimeType?: string }) {
      if (!params.file) {
        throw new Error("'file' parameter is required.");
      }
      if (!params.filename) {
        throw new Error("'filename' parameter is required.");
      }

      let contentBuf: Buffer;
      if (Buffer.isBuffer(params.file)) {
        contentBuf = params.file;
      } else if (typeof params.file === "string") {
        // If it's a string, we assume it's base64 because that's the standard intermediate format
        contentBuf = Buffer.from(params.file, "base64");
      } else {
        throw new Error("'file' must be a Buffer or a base64 string.");
      }

      return {
        content: contentBuf,
        filename: params.filename.trim(),
        mimeType: params.mimeType?.trim() || "application/octet-stream"
      };
    }
  };
}

function extractFileContent(input: any): any {
  if (!input || typeof input !== "object" || Buffer.isBuffer(input)) return input;
  if (input.type === "Buffer" && Array.isArray(input.data)) return input;
  if (input.buffer) return input.buffer;
  if (input.content) return input.content;
  if (input.file) return input.file;
  if (input.download) return extractFileContent(input.download);
  if (input.result) return extractFileContent(input.result);
  return input;
}
