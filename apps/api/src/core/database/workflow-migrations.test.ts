import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { up as initialWorkflows } from "./migrations/workflows/001_initial_workflows.ts";
import { up as addPublishedAt } from "./migrations/workflows/002_add_published_at.ts";
import { up as addLastTriggerPayload } from "./migrations/workflows/003_add_last_trigger_payload.ts";

describe("workflow migrations", () => {
  it("keeps additive column migrations idempotent for partially migrated databases", async () => {
    const db = new Database(":memory:");

    try {
      await initialWorkflows(db);
      db.prepare("ALTER TABLE workflows ADD COLUMN published_at TEXT").run();
      db.prepare("ALTER TABLE workflows ADD COLUMN last_trigger_payload JSON").run();

      await addPublishedAt(db);
      await addLastTriggerPayload(db);

      const columns = db.prepare("PRAGMA table_info(workflows)").all() as Array<{ name: string }>;
      assert.equal(columns.filter((column) => column.name === "published_at").length, 1);
      assert.equal(columns.filter((column) => column.name === "last_trigger_payload").length, 1);
    } finally {
      db.close();
    }
  });
});
