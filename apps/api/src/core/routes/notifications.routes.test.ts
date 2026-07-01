import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import Fastify from "fastify";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { up as createNotificationSchema } from "../database/migrations/notifications/001_initial_notifications.ts";
import { NotificationRepository } from "../modules/notifications/notification-repository.ts";
import { NotificationService } from "../modules/notifications/notification-service.ts";
import type { NotificationRecord, NotificationSummary } from "../modules/notifications/notification-types.ts";
import notificationsRoutes from "./notifications.routes.ts";

async function createDatabase() {
  const db = new Database(":memory:");
  await createNotificationSchema(db);
  return db;
}

async function buildApp(provider: () => Database.Database) {
  const app = Fastify({ logger: false });
  let sequence = 0;
  const service = new NotificationService(
    new NotificationRepository(provider),
    { createId: () => `notification-${++sequence}` },
  );
  await app.register(notificationsRoutes, { service });
  return app;
}

describe("notification routes", () => {
  it("registers notification routes in the server", () => {
    const source = fs.readFileSync(path.resolve("src/core/server.ts"), "utf8");
    assert.match(source, /import notificationsRoutes from "\.\/routes\/notifications\.routes\.ts"/);
    assert.match(source, /fastify\.register\(notificationsRoutes\)/);
  });

  it("creates, lists, filters and summarizes notifications", async () => {
    const db = await createDatabase();
    const app = await buildApp(() => db);

    const created = await app.inject({
      method: "POST",
      url: "/notifications",
      payload: {
        level: "error",
        category: "pages",
        title: "Save failed",
        message: "Could not save page",
        source: "page-editor",
        context: { pageId: "page-1" },
        actionUrl: "/pages/page-1",
        actionLabel: "Open page",
      },
    });
    assert.equal(created.statusCode, 201);

    await app.inject({
      method: "POST",
      url: "/notifications",
      payload: { level: "warning", message: "Global warning" },
    });

    const filtered = await app.inject({
      method: "GET",
      url: "/notifications?category=pages&level=error&unread=true",
    });
    const filteredBody = filtered.json() as ApiResponse<NotificationRecord[]>;
    assert.equal(filtered.statusCode, 200);
    assert.equal(filteredBody.data?.length, 1);
    assert.deepEqual(filteredBody.data?.[0]?.context, { pageId: "page-1" });

    const summary = await app.inject({ method: "GET", url: "/notifications/summary" });
    assert.deepEqual(
      (summary.json() as ApiResponse<NotificationSummary>).data,
      { unreadCount: 2, categories: ["global", "pages"] },
    );
    db.close();
  });

  it("marks one or all notifications read and deletes one or all", async () => {
    const db = await createDatabase();
    const app = await buildApp(() => db);
    await app.inject({ method: "POST", url: "/notifications", payload: { level: "info", message: "One" } });
    await app.inject({ method: "POST", url: "/notifications", payload: { level: "warning", message: "Two" } });

    const readOne = await app.inject({ method: "PATCH", url: "/notifications/notification-1/read" });
    assert.equal(readOne.statusCode, 200);
    assert.equal((readOne.json() as ApiResponse<NotificationRecord>).data?.isRead, true);

    const readAll = await app.inject({ method: "PATCH", url: "/notifications/read-all" });
    assert.equal((readAll.json() as ApiResponse<{ updated: number }>).data?.updated, 1);

    const deleteOne = await app.inject({ method: "DELETE", url: "/notifications/notification-1" });
    assert.equal(deleteOne.statusCode, 200);
    const deleteMissing = await app.inject({ method: "DELETE", url: "/notifications/missing" });
    assert.equal(deleteMissing.statusCode, 404);

    const clear = await app.inject({ method: "DELETE", url: "/notifications" });
    assert.equal((clear.json() as ApiResponse<{ deleted: number }>).data?.deleted, 1);
    db.close();
  });

  it("rejects invalid levels, categories, filters and external action urls", async () => {
    const db = await createDatabase();
    const app = await buildApp(() => db);

    for (const payload of [
      { level: "success", message: "Nope" },
      { level: "error", category: "Pages Editor", message: "Nope" },
      { level: "error", message: "Nope", actionUrl: "https://example.com" },
      { level: "error", message: "   " },
    ]) {
      const response = await app.inject({ method: "POST", url: "/notifications", payload });
      assert.equal(response.statusCode, 400);
    }

    const invalidFilter = await app.inject({ method: "GET", url: "/notifications?unread=maybe" });
    assert.equal(invalidFilter.statusCode, 400);
    db.close();
  });

  it("uses the currently provided profile database", async () => {
    const profileA = await createDatabase();
    const profileB = await createDatabase();
    let active = profileA;
    const app = await buildApp(() => active);

    await app.inject({ method: "POST", url: "/notifications", payload: { level: "error", message: "Profile A" } });
    active = profileB;
    const profileBList = await app.inject({ method: "GET", url: "/notifications" });
    assert.deepEqual((profileBList.json() as ApiResponse<NotificationRecord[]>).data, []);

    active = profileA;
    const profileAList = await app.inject({ method: "GET", url: "/notifications" });
    assert.equal((profileAList.json() as ApiResponse<NotificationRecord[]>).data?.length, 1);
    profileA.close();
    profileB.close();
  });
});
