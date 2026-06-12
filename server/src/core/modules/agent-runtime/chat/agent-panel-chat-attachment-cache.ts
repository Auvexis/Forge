import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { AgentFileRefStore, type AgentFileRef } from "../loop/agent-file-ref-store.ts";
import { resolveAgentChatFileCacheDir, resolveAgentExecutionFileCacheDir } from "./agent-chat-paths.ts";

export interface AgentPanelAttachmentRef {
  id: string;
  fileName: string;
  mimeType?: string;
  bytes: number;
}

interface AgentPanelAttachmentMeta extends AgentPanelAttachmentRef {
  filePath: string;
}

export class AgentPanelChatAttachmentCache {
  private readonly profilesDir: string;

  constructor(options: { profilesDir: string }) {
    this.profilesDir = options.profilesDir;
  }

  async put(input: {
    profileId: string;
    sessionId: string;
    fileName: string;
    mimeType?: string;
    content: unknown;
  }): Promise<AgentPanelAttachmentRef> {
    const rootDir = this.chatCacheDir(input.profileId, input.sessionId);
    fs.mkdirSync(rootDir, { recursive: true });
    const id = crypto.randomUUID();
    const fileName = sanitizeFileName(input.fileName);
    const filePath = path.join(rootDir, `${id}-${fileName}`);
    const bytes = await writeCachedFile(filePath, input.content);
    const meta: AgentPanelAttachmentMeta = {
      id,
      fileName,
      ...(input.mimeType ? { mimeType: input.mimeType } : {}),
      bytes,
      filePath,
    };
    fs.writeFileSync(this.metaPath(input.profileId, input.sessionId, id), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    return toPublicRef(meta);
  }

  async materializeForExecution(input: {
    profileId: string;
    sessionId: string;
    executionId: string;
    attachments?: AgentPanelAttachmentRef[];
  }): Promise<AgentFileRef[]> {
    const refs: AgentFileRef[] = [];
    const store = new AgentFileRefStore({
      rootDir: resolveAgentExecutionFileCacheDir({
        profilesDir: this.profilesDir,
        profileId: input.profileId,
        executionId: input.executionId,
      }),
    });
    for (const attachment of input.attachments ?? []) {
      const meta = this.resolve(input.profileId, input.sessionId, attachment.id);
      refs.push(await store.put({
        toolCallId: "user-upload",
        path: attachment.fileName,
        value: fs.createReadStream(meta.filePath),
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
      }));
    }
    return refs;
  }

  cleanupSessionCache(profileId: string, sessionId: string): void {
    const rootDir = this.chatCacheDir(profileId, sessionId);
    if (fs.existsSync(rootDir)) fs.rmSync(rootDir, { recursive: true, force: true });
  }

  private resolve(profileId: string, sessionId: string, id: string): AgentPanelAttachmentMeta {
    const metaPath = this.metaPath(profileId, sessionId, id);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as AgentPanelAttachmentMeta;
    if (!fs.existsSync(meta.filePath)) throw new Error(`Agent panel attachment not found: ${id}`);
    return meta;
  }

  private chatCacheDir(profileId: string, sessionId: string): string {
    return resolveAgentChatFileCacheDir({
      profilesDir: this.profilesDir,
      profileId,
      chatId: sessionId,
    });
  }

  private metaPath(profileId: string, sessionId: string, id: string): string {
    return path.join(this.chatCacheDir(profileId, sessionId), `${id}.json`);
  }
}

async function writeCachedFile(filePath: string, value: unknown): Promise<number> {
  if (Buffer.isBuffer(value)) {
    fs.writeFileSync(filePath, value);
    return value.byteLength;
  }
  if (isReadableLike(value)) {
    await pipeline(value as NodeJS.ReadableStream, fs.createWriteStream(filePath));
    return fs.statSync(filePath).size;
  }
  if (value instanceof Uint8Array) {
    fs.writeFileSync(filePath, value);
    return value.byteLength;
  }
  throw new Error("Unsupported agent panel attachment content");
}

function toPublicRef(meta: AgentPanelAttachmentMeta): AgentPanelAttachmentRef {
  return {
    id: meta.id,
    fileName: meta.fileName,
    ...(meta.mimeType ? { mimeType: meta.mimeType } : {}),
    bytes: meta.bytes,
  };
}

function sanitizeFileName(value: string): string {
  return path.basename(value).replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_").slice(0, 120) || "file.bin";
}

function isReadableLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { pipe?: unknown; on?: unknown };
  return typeof candidate.pipe === "function" && typeof candidate.on === "function";
}
