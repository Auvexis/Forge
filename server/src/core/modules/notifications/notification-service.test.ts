import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";

import { up as createNotificationSchema } from "../../database/migrations/notifications/001_initial_notifications.ts";
import { NotificationRepository } from "./notification-repository.ts";
import { NotificationService } from "./notification-service.ts";

describe("NotificationService", () => {
  it("creates a generated notification with a global fallback category", async () => {
    const db = new Database(":memory:");
    await createNotificationSchema(db);
    const service = new NotificationService(
      new NotificationRepository(() => db),
      { createId: () => "generated-id", now: () => new Date("2026-06-28T10:00:00.000Z") },
    );

    const notification = service.create({ level: "info", message: "Hello" });

    assert.equal(notification.id, "generated-id");
    assert.equal(notification.category, "global");
    assert.equal(notification.createdAt, "2026-06-28T10:00:00.000Z");
    db.close();
  });

  it("delegates filters, summary and mutations to the repository", async () => {
    const db = new Database(":memory:");
    await createNotificationSchema(db);
    const service = new NotificationService(
      new NotificationRepository(() => db),
      { createId: () => "notification-id" },
    );
    service.create({ level: "warning", category: "workflows", message: "Warning" });

    assert.deepEqual(service.list({ category: "workflows" }).map(({ id }) => id), ["notification-id"]);
    assert.equal(service.summary().unreadCount, 1);
    assert.equal(service.markRead("notification-id")?.isRead, true);
    assert.equal(service.markAllRead(), 0);
    assert.equal(service.delete("notification-id"), true);
    assert.equal(service.clear(), 0);
    db.close();
  });
});
