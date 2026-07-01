import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { AgentRuntimeError } from "../agent-errors.ts";

const LARGE_TEXT_REF_CHARS = 1200;

export interface AgentFileRef {
  type: "file";
  ref: string;
  fileName?: string;
  mimeType?: string;
  bytes: number;
}

export interface StoredAgentFileRef extends AgentFileRef {
  filePath: string;
}

interface AgentFileRefMeta {
  id: string;
  toolCallId: string;
  path: string;
  fileName?: string;
  mimeType?: string;
  bytes: number;
  filePath: string;
}

export class AgentFileRefStore {
  private readonly rootDir: string;

  constructor(options: { rootDir: string }) {
    this.rootDir = options.rootDir;
  }

  async put(input: {
    toolCallId: string;
    path: string;
    value: unknown;
    fileName?: string;
    mimeType?: string;
  }): Promise<AgentFileRef> {
    fs.mkdirSync(this.rootDir, { recursive: true });
    const id = crypto.randomUUID();
    const fileName = sanitizeFileName(input.fileName ?? `${id}.bin`);
    const storedName = `${id}-${fileName}`;
    const filePath = path.join(this.rootDir, storedName);
    const bytes = await writeFileValue(filePath, input.value);
    const meta: AgentFileRefMeta = {
      id,
      toolCallId: input.toolCallId,
      path: input.path,
      ...(input.fileName ? { fileName: input.fileName } : {}),
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
      bytes,
      filePath,
    };
    fs.writeFileSync(this.metaPath(id), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    return toPublicRef(meta);
  }

  resolve(ref: string): StoredAgentFileRef {
    const id = parseAgentFileRef(ref);
    const metaPath = this.metaPath(id);
    if (!fs.existsSync(metaPath)) {
      throw new AgentRuntimeError(
        `Agent file ref not found: ${ref}`,
        "AGENT_TOOL_REF_UNRESOLVED",
        "Agent file reference was not found",
        400,
      );
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as AgentFileRefMeta;
    if (!fs.existsSync(meta.filePath)) {
      throw new AgentRuntimeError(
        `Agent file ref content not found: ${ref}`,
        "AGENT_TOOL_REF_UNRESOLVED",
        "Agent file reference content was not found",
        400,
      );
    }
    return { ...toPublicRef(meta), filePath: meta.filePath };
  }

  cleanupAll(): void {
    if (!fs.existsSync(this.rootDir)) return;
    fs.rmSync(this.rootDir, { recursive: true, force: true });
  }

  private metaPath(id: string): string {
    return path.join(this.rootDir, `${id}.json`);
  }
}

export async function storeAgentFileRefsInToolResult(input: {
  store?: AgentFileRefStore;
  toolCallId: string;
  value: unknown;
}): Promise<unknown> {
  if (!input.store) return input.value;
  return storeFileRefs(input.store, input.toolCallId, input.value);
}

export function resolveAgentFileRefsInToolArgs(input: {
  store?: AgentFileRefStore;
  value: unknown;
}): unknown {
  if (!input.store) return input.value;
  return resolveFileRefs(input.store, input.value);
}

async function storeFileRefs(
  store: AgentFileRefStore,
  toolCallId: string,
  value: unknown,
  pathParts: string[] = [],
  inherited: { fileName?: string; mimeType?: string } = {},
): Promise<unknown> {
  if (isFileContentValue(value, pathParts, inherited)) {
    return store.put({
      toolCallId,
      path: pathParts.join("/"),
      value,
      fileName: inherited.fileName,
      mimeType: inherited.mimeType,
    });
  }

  if (isLargeTextValue(value)) {
    const key = pathParts.at(-1) ?? "text";
    return store.put({
      toolCallId,
      path: pathParts.join("/"),
      value,
      fileName: `${key}.txt`,
      mimeType: "text/plain",
    });
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map((item, index) =>
      storeFileRefs(store, toolCallId, item, [...pathParts, String(index)], inherited)
    ));
  }

  if (!value || typeof value !== "object" || Buffer.isBuffer(value) || isReadableLike(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  const nextInherited = {
    fileName: firstString(record.fileName, record.filename, inherited.fileName),
    mimeType: firstString(record.mimeType, record.mimetype, inherited.mimeType),
  };
  const entries = await Promise.all(Object.entries(record).map(async ([key, item]) => [
    key,
    await storeFileRefs(store, toolCallId, item, [...pathParts, key], nextInherited),
  ] as const));
  return Object.fromEntries(entries);
}

function resolveFileRefs(store: AgentFileRefStore, value: unknown, keyHint = ""): unknown {
  if (typeof value === "string" && value.startsWith("agent-file://")) {
    return resolveRefForKey(store, value, keyHint);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveFileRefs(store, item, keyHint));
  }

  if (!value || typeof value !== "object" || Buffer.isBuffer(value) || isReadableLike(value)) {
    return value;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.ref === "string" && record.ref.startsWith("agent-file://")) {
    const stored = store.resolve(record.ref);
    if (
      isTextParamKey(keyHint.toLowerCase()) &&
      firstString(record.mimeType, record.mimetype, stored.mimeType)?.toLowerCase().startsWith("text/")
    ) {
      return fs.readFileSync(stored.filePath, "utf8");
    }
    return {
      filename: firstString(record.fileName, record.filename, stored.fileName) ?? "attachment.bin",
      ...(firstString(record.mimeType, record.mimetype, stored.mimeType)
        ? { mimeType: firstString(record.mimeType, record.mimetype, stored.mimeType) }
        : {}),
      content: fs.createReadStream(stored.filePath),
    };
  }

  const nestedContent = record.content;
  if (nestedContent && typeof nestedContent === "object" && !Array.isArray(nestedContent)) {
    const nestedRecord = nestedContent as Record<string, unknown>;
    if (typeof nestedRecord.ref === "string" && nestedRecord.ref.startsWith("agent-file://")) {
      const stored = store.resolve(nestedRecord.ref);
      return {
        filename: firstString(record.fileName, record.filename, nestedRecord.fileName, nestedRecord.filename, stored.fileName) ?? "attachment.bin",
        ...(firstString(record.mimeType, record.mimetype, nestedRecord.mimeType, nestedRecord.mimetype, stored.mimeType)
          ? { mimeType: firstString(record.mimeType, record.mimetype, nestedRecord.mimeType, nestedRecord.mimetype, stored.mimeType) }
          : {}),
        content: fs.createReadStream(stored.filePath),
      };
    }
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      resolveFileRefs(store, item, key),
    ]),
  );
}

function resolveRefForKey(store: AgentFileRefStore, ref: string, keyHint: string): unknown {
  const stored = store.resolve(ref);
  const key = keyHint.toLowerCase();
  if (key === "contentbase64" || key.endsWith("base64")) {
    return fs.readFileSync(stored.filePath).toString("base64");
  }
  if (isTextParamKey(key) && stored.mimeType?.toLowerCase().startsWith("text/")) {
    return fs.readFileSync(stored.filePath, "utf8");
  }
  if (key === "content" || key === "buffer" || key === "data" || key === "input") {
    return fs.createReadStream(stored.filePath);
  }
  return {
    filename: stored.fileName ?? "attachment.bin",
    ...(stored.mimeType ? { mimeType: stored.mimeType } : {}),
    content: fs.createReadStream(stored.filePath),
  };
}

function isFileContentValue(
  value: unknown,
  pathParts: string[],
  inherited: { fileName?: string; mimeType?: string },
): boolean {
  if (Buffer.isBuffer(value) || isReadableLike(value) || isBlob(value)) return true;
  if (typeof value !== "string") return false;
  const key = pathParts.at(-1)?.toLowerCase() ?? "";
  if (key.includes("base64") && isLikelyBase64(value)) return true;
  return Boolean(inherited.fileName && key === "content");
}

function isLargeTextValue(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > LARGE_TEXT_REF_CHARS &&
    !isLikelyBase64(value);
}

function isTextParamKey(key: string): boolean {
  return [
    "body",
    "message",
    "text",
    "content",
    "description",
    "html",
    "texto",
    "mensagem",
    "emailbody",
  ].includes(key);
}

async function writeFileValue(filePath: string, value: unknown): Promise<number> {
  if (Buffer.isBuffer(value)) {
    fs.writeFileSync(filePath, value);
    return value.byteLength;
  }
  if (isReadableLike(value)) {
    await pipeline(value as NodeJS.ReadableStream, fs.createWriteStream(filePath));
    return fs.statSync(filePath).size;
  }
  if (isBlob(value)) {
    const buffer = Buffer.from(await value.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return buffer.byteLength;
  }
  if (typeof value === "string" && isLikelyBase64(value)) {
    const buffer = Buffer.from(value, "base64");
    fs.writeFileSync(filePath, buffer);
    return buffer.byteLength;
  }
  if (typeof value === "string") {
    fs.writeFileSync(filePath, value, "utf8");
    return Buffer.byteLength(value);
  }
  throw new AgentRuntimeError(
    "Unsupported agent file ref value",
    "AGENT_FILE_REF_UNSUPPORTED",
    "Agent file value could not be cached",
    400,
  );
}

function toPublicRef(meta: AgentFileRefMeta): AgentFileRef {
  return {
    type: "file",
    ref: `agent-file://${meta.id}`,
    ...(meta.fileName ? { fileName: meta.fileName } : {}),
    ...(meta.mimeType ? { mimeType: meta.mimeType } : {}),
    bytes: meta.bytes,
  };
}

function parseAgentFileRef(ref: string): string {
  const match = ref.match(/^agent-file:\/\/([a-f0-9-]+)$/i);
  if (!match) {
    throw new AgentRuntimeError(
      `Invalid agent file ref: ${ref}`,
      "AGENT_TOOL_REF_UNRESOLVED",
      "Agent file reference is invalid",
      400,
    );
  }
  return match[1];
}

function sanitizeFileName(value: string): string {
  return path.basename(value).replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_").slice(0, 120) || "file.bin";
}

function firstString(...values: unknown[]): string | undefined {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value.trim() : undefined;
}

function isReadableLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { pipe?: unknown; on?: unknown };
  return typeof candidate.pipe === "function" && typeof candidate.on === "function";
}

function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isLikelyBase64(value: string): boolean {
  if (value.length < 64) return false;
  if (value.length % 4 !== 0) return false;
  return /^[a-z0-9+/=\s]+$/i.test(value);
}
