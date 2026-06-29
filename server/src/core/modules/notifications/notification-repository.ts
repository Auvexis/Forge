import type Database from "better-sqlite3";

import { DatabaseManager } from "../../database/index.ts";
import type {
  CreateNotificationInput,
  NotificationFilters,
  NotificationRecord,
  NotificationSummary,
} from "./notification-types.ts";

type NotificationDatabaseProvider = () => Database.Database;

interface NotificationRow {
  id: string;
  level: NotificationRecord["level"];
  category: string;
  title: string | null;
  message: string;
  source: string | null;
  context_json: string | null;
  action_url: string | null;
  action_label: string | null;
  is_read: number;
  occurrence_count: number;
  created_at: string;
  last_occurred_at: string;
}

let notificationDatabaseProvider: NotificationDatabaseProvider = () => DatabaseManager.notifications;

export function setNotificationDatabaseProvider(provider: NotificationDatabaseProvider): void {
  notificationDatabaseProvider = provider;
}

export function resetNotificationDatabaseProvider(): void {
  notificationDatabaseProvider = () => DatabaseManager.notifications;
}

export class NotificationRepository {
  private readonly databaseProvider: NotificationDatabaseProvider;

  constructor(databaseProvider: NotificationDatabaseProvider = () => notificationDatabaseProvider()) {
    this.databaseProvider = databaseProvider;
  }

  create(input: CreateNotificationInput, occurredAt = new Date()): NotificationRecord {
    const db = this.databaseProvider();
    const timestamp = occurredAt.toISOString();

    return db.transaction(() => {
      db.prepare(`
        INSERT INTO notifications (
          id, level, category, title, message, source, context_json,
          action_url, action_label, is_read, occurrence_count, created_at, last_occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)
      `).run(
        input.id,
        input.level,
        input.category,
        input.title ?? null,
        input.message,
        input.source ?? null,
        serializeContext(input.context),
        input.actionUrl ?? null,
        input.actionLabel ?? null,
        timestamp,
        timestamp,
      );

      db.prepare(`
        DELETE FROM notifications
        WHERE id NOT IN (
          SELECT id FROM notifications
          ORDER BY last_occurred_at DESC, id DESC
          LIMIT 200
        )
      `).run();

      return this.getRequired(input.id);
    })();
  }

  list(filters: NotificationFilters = {}): NotificationRecord[] {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (filters.category) {
      conditions.push("category = ?");
      values.push(filters.category);
    }
    if (filters.level) {
      conditions.push("level = ?");
      values.push(filters.level);
    }
    if (filters.unread !== undefined) {
      conditions.push("is_read = ?");
      values.push(filters.unread ? 0 : 1);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.databaseProvider()
      .prepare(`SELECT * FROM notifications ${where} ORDER BY last_occurred_at DESC, id DESC`)
      .all(...values) as NotificationRow[];
    return rows.map(mapRow);
  }

  summary(): NotificationSummary {
    const db = this.databaseProvider();
    const unread = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE is_read = 0").get() as { count: number };
    const categories = db.prepare("SELECT DISTINCT category FROM notifications ORDER BY category ASC").all() as Array<{ category: string }>;
    return { unreadCount: unread.count, categories: categories.map(({ category }) => category) };
  }

  markRead(id: string): NotificationRecord | null {
    const result = this.databaseProvider().prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
    return result.changes ? this.getRequired(id) : null;
  }

  markAllRead(): number {
    return this.databaseProvider().prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0").run().changes;
  }

  delete(id: string): boolean {
    return this.databaseProvider().prepare("DELETE FROM notifications WHERE id = ?").run(id).changes > 0;
  }

  clear(): number {
    return this.databaseProvider().prepare("DELETE FROM notifications").run().changes;
  }

  private getRequired(id: string): NotificationRecord {
    const row = this.databaseProvider().prepare("SELECT * FROM notifications WHERE id = ?").get(id) as NotificationRow | undefined;
    if (!row) throw new Error(`Notification '${id}' was not found`);
    return mapRow(row);
  }
}

function serializeContext(context: unknown): string | null {
  return context === undefined || context === null ? null : JSON.stringify(context);
}

function mapRow(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    level: row.level,
    category: row.category,
    title: row.title,
    message: row.message,
    source: row.source,
    context: row.context_json ? JSON.parse(row.context_json) : null,
    actionUrl: row.action_url,
    actionLabel: row.action_label,
    isRead: row.is_read === 1,
    occurrenceCount: row.occurrence_count,
    createdAt: row.created_at,
    lastOccurredAt: row.last_occurred_at,
  };
}
