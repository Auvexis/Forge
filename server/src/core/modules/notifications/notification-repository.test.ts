import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { up as createNotificationSchema } from "../../database/migrations/notifications/001_initial_notifications.ts";
import { NotificationRepository } from "./notification-repository.ts";

async function createRepository() {
  const db = new Database(":memory:");
  await createNotificationSchema(db);
  return { db, repository: new NotificationRepository(() => db) };
}

function input(message: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `notification-${message}`,
    level: "error" as const,
    category: "global",
    message,
    ...overrides,
  };
}

describe("NotificationRepository", () => {
  it("creates notifications and lists the newest first", async () => {
    const { db, repository } = await createRepository();

    repository.create(input("older"), new Date("2026-06-28T10:00:00.000Z"));
    repository.create(input("newer"), new Date("2026-06-28T10:01:00.000Z"));

    assert.deepEqual(repository.list().map(({ message }) => message), ["newer", "older"]);
    assert.equal(repository.list()[0]?.isRead, false);
    db.close();
  });

  it("filters by category, level and unread state", async () => {
    const { db, repository } = await createRepository();

    repository.create(input("workflow", { category: "workflows" }), new Date("2026-06-28T10:00:00.000Z"));
    repository.create(input("warning", { id: "warning", level: "warning" }), new Date("2026-06-28T10:01:00.000Z"));
    repository.markRead("warning");

    assert.deepEqual(repository.list({ category: "workflows" }).map(({ id }) => id), ["notification-workflow"]);
    assert.deepEqual(repository.list({ level: "warning" }).map(({ id }) => id), ["warning"]);
    assert.deepEqual(repository.list({ unread: true }).map(({ id }) => id), ["notification-workflow"]);
    db.close();
  });

  it("coalesces matching notifications within 30 seconds and makes them unread", async () => {
    const { db, repository } = await createRepository();

    repository.create(input("repeated", { title: "Failure" }), new Date("2026-06-28T10:00:00.000Z"));
    repository.markRead("notification-repeated");
    const result = repository.create(
      input("repeated", { id: "second-id", title: "Failure" }),
      new Date("2026-06-28T10:00:20.000Z"),
    );

    assert.equal(repository.list().length, 1);
    assert.equal(result.id, "notification-repeated");
    assert.equal(result.occurrenceCount, 2);
    assert.equal(result.isRead, false);
    assert.equal(result.lastOccurredAt, "2026-06-28T10:00:20.000Z");
    db.close();
  });

  it("does not coalesce after the 30-second window", async () => {
    const { db, repository } = await createRepository();

    repository.create(input("repeated"), new Date("2026-06-28T10:00:00.000Z"));
    repository.create(input("repeated", { id: "second-id" }), new Date("2026-06-28T10:00:31.000Z"));

    assert.equal(repository.list().length, 2);
    db.close();
  });

  it("retains only the 200 most recent rows", async () => {
    const { db, repository } = await createRepository();

    for (let index = 0; index < 205; index += 1) {
      repository.create(
        input(`message-${index}`, { id: `notification-${index}` }),
        new Date(Date.UTC(2026, 5, 28, 10, 0, index)),
      );
    }

    const rows = repository.list();
    assert.equal(rows.length, 200);
    assert.equal(rows.at(-1)?.id, "notification-5");
    db.close();
  });

  it("returns summary and applies read and delete mutations", async () => {
    const { db, repository } = await createRepository();

    repository.create(input("global"), new Date("2026-06-28T10:00:00.000Z"));
    repository.create(input("page", { id: "page", category: "pages", level: "info" }), new Date("2026-06-28T10:01:00.000Z"));

    assert.deepEqual(repository.summary(), { unreadCount: 2, categories: ["global", "pages"] });
    assert.equal(repository.markRead("page")?.isRead, true);
    assert.equal(repository.markAllRead(), 1);
    assert.equal(repository.delete("page"), true);
    assert.equal(repository.delete("missing"), false);
    assert.equal(repository.clear(), 1);
    assert.deepEqual(repository.summary(), { unreadCount: 0, categories: [] });
    db.close();
  });
});
