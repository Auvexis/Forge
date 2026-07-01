export type NotificationLevel = "error" | "warning" | "info";

export interface NotificationRecord {
  id: string;
  level: NotificationLevel;
  category: string;
  title: string | null;
  message: string;
  source: string | null;
  context: unknown | null;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  occurrenceCount: number;
  createdAt: string;
  lastOccurredAt: string;
}

export interface CreateNotificationInput {
  id: string;
  level: NotificationLevel;
  category: string;
  title?: string | null;
  message: string;
  source?: string | null;
  context?: unknown | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
}

export type CreateNotificationRequest = Omit<CreateNotificationInput, "id" | "category"> & {
  category?: string;
};

export interface NotificationFilters {
  category?: string;
  level?: NotificationLevel;
  unread?: boolean;
}

export interface NotificationSummary {
  unreadCount: number;
  categories: string[];
}
