import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { describe, it } from "node:test";
import {
  AgentFileRefStore,
  resolveAgentFileRefsInToolArgs,
  storeAgentFileRefsInToolResult,
} from "./agent-file-ref-store.ts";

describe("agent file ref store", () => {
  it("stores downloaded file content as a persistent lightweight ref", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-agent-files-"));
    const store = new AgentFileRefStore({ rootDir: root });

    const result = await storeAgentFileRefsInToolResult({
      store,
      toolCallId: "tool_call_1",
      value: {
        download: {
          fileName: "andresimoes.pdf",
          mimeType: "application/pdf",
          content: Readable.from(["pdf-content"]),
        },
      },
    });

    const ref = (result as any).download.content;
    assert.equal(ref.type, "file");
    assert.match(ref.ref, /^agent-file:\/\//);
    assert.equal(ref.fileName, "andresimoes.pdf");
    assert.equal(ref.mimeType, "application/pdf");
    assert.equal(ref.bytes, Buffer.byteLength("pdf-content"));
    assert.equal(fs.readFileSync(store.resolve(ref.ref).filePath, "utf8"), "pdf-content");
  });

  it("resolves persistent refs back into tool args without plugin-specific logic", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-agent-files-"));
    const store = new AgentFileRefStore({ rootDir: root });
    const ref = await store.put({
      toolCallId: "tool_call_1",
      path: "download/content",
      fileName: "andresimoes.pdf",
      mimeType: "application/pdf",
      value: Buffer.from("pdf-content"),
    });

    const args = resolveAgentFileRefsInToolArgs({
      store,
      value: {
        attachments: [ref],
        contentBase64: ref.ref,
      },
    }) as any;

    assert.equal(args.attachments[0].filename, "andresimoes.pdf");
    assert.equal(args.attachments[0].mimeType, "application/pdf");
    assert.equal(typeof args.attachments[0].content.pipe, "function");
    assert.equal(args.contentBase64, Buffer.from("pdf-content").toString("base64"));
  });

  it("cleans stored file refs and metadata after a terminal success", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sailor-agent-files-"));
    const store = new AgentFileRefStore({ rootDir: root });
    await store.put({
      toolCallId: "tool_call_1",
      path: "download/content",
      fileName: "andresimoes.pdf",
      mimeType: "application/pdf",
      value: Buffer.from("pdf-content"),
    });

    assert.ok(fs.readdirSync(root).length > 0);
    store.cleanupAll();

    assert.deepEqual(fs.existsSync(root) ? fs.readdirSync(root) : [], []);
  });
});
