import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAgentToolCatalog } from "./agent-tool-catalog.ts";

describe("agent tool catalog", () => {
  it("exposes compact tool metadata without schemas or configured defaults", () => {
    const catalog = buildAgentToolCatalog([
      {
        name: "google_drive_download_file",
        description: "Download or export a file from Google Drive.",
        instructions: "Use after selecting a specific fileId.",
        sideEffect: "read",
        pluginName: "Google Drive",
        pluginId: "google-drive",
        methodId: "downloadFile",
        inputSchema: {
          type: "object",
          required: ["fileId"],
          properties: {
            fileId: { type: "string" },
            secretDefault: { type: "string" },
          },
        },
        configuredDefaults: {
          secretDefault: "credential-like-value",
        },
      },
    ]);

    assert.deepEqual(catalog, [
      {
        name: "google_drive_download_file",
        pluginName: "Google Drive",
        description: "Download or export a file from Google Drive.",
        instructions: "Use after selecting a specific fileId.",
        sideEffect: "read",
      },
    ]);
    assert.doesNotMatch(JSON.stringify(catalog), /inputSchema|secretDefault|credential-like-value|methodId/);
  });

  it("accepts callable tools without plugin identity", () => {
    const catalog = buildAgentToolCatalog([{
      name: "search_refund_policy",
      description: "Search refund policies.",
      sideEffect: "read",
      inputSchema: { type: "object", required: ["query"] },
      invoke: async () => ({ answer: "ok" }),
    }]);

    assert.deepEqual(catalog, [{ name: "search_refund_policy", description: "Search refund policies.", sideEffect: "read" }]);
  });
});
