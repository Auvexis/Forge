import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { AgentFileRefStore, resolveAgentFileRefsInToolArgs, storeAgentFileRefsInToolResult } from "./agent-file-ref-store.ts";

describe("agent file ref store", () => {
  it("resolves nested content file refs into readable attachment content", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-agent-file-ref-"));
    const store = new AgentFileRefStore({ rootDir: root });
    const ref = await store.put({
      toolCallId: "tool_call_1",
      path: "download/content",
      fileName: "video_desktop.mp4",
      mimeType: "video/mp4",
      value: Buffer.from("video bytes"),
    });

    const resolved = resolveAgentFileRefsInToolArgs({
      store,
      value: {
        attachments: [
          {
            fileName: "video_desktop.mp4",
            mimeType: "video/mp4",
            content: {
              type: "file",
              ref: ref.ref,
              fileName: "video_desktop.mp4",
              mimeType: "video/mp4",
              bytes: ref.bytes,
            },
          },
        ],
      },
    }) as any;

    assert.equal(resolved.attachments[0].filename, "video_desktop.mp4");
    assert.equal(resolved.attachments[0].mimeType, "video/mp4");
    assert.equal(typeof resolved.attachments[0].content.pipe, "function");
  });

  it("stores large text results as text refs and resolves them into text fields", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "fabric-agent-text-ref-"));
    const store = new AgentFileRefStore({ rootDir: root });
    const recipe = `Receita de bolo de milho\n\n${"Misture milho e asse. ".repeat(80)}`;

    const stored = await storeAgentFileRefsInToolResult({
      store,
      toolCallId: "tool_call_recipe",
      value: { recipe },
    }) as any;
    const resolved = resolveAgentFileRefsInToolArgs({
      store,
      value: { body: stored.recipe },
    }) as any;

    assert.equal(stored.recipe.type, "file");
    assert.equal(stored.recipe.mimeType, "text/plain");
    assert.equal(resolved.body, recipe);
  });
});
