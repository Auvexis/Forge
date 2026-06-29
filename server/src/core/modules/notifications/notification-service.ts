import { randomUUID } from "node:crypto";

import { NotificationRepository } from "./notification-repository.ts";
import type {
  CreateNotificationRequest,
  NotificationFilters,
  NotificationRecord,
  NotificationSummary,
} from "./notification-types.ts";

interface NotificationServiceDependencies {
  createId?: () => string;
  now?: () => Date;
}

export class NotificationService {
  private readonly repository: NotificationRepository;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    repository = new NotificationRepository(),
    dependencies: NotificationServiceDependencies = {},
  ) {
    this.repository = repository;
    this.createId = dependencies.createId ?? randomUUID;
    this.now = dependencies.now ?? (() => new Date());
  }

  create(input: CreateNotificationRequest): NotificationRecord {
    return this.repository.create(
      {
        ...input,
        id: this.createId(),
        category: input.category ?? "global",
      },
      this.now(),
    );
  }

  list(filters: NotificationFilters = {}): NotificationRecord[] {
    return this.repository.list(filters);
  }

  summary(): NotificationSummary {
    return this.repository.summary();
  }

  markRead(id: string): NotificationRecord | null {
    return this.repository.markRead(id);
  }

  markAllRead(): number {
    return this.repository.markAllRead();
  }

  delete(id: string): boolean {
    return this.repository.delete(id);
  }

  clear(): number {
    return this.repository.clear();
  }
}
