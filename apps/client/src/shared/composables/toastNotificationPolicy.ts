import type { CreateNotificationPayload } from '../../core/types/notification.types.ts'

export type ToastNotificationVariant = 'default' | 'success' | 'warning' | 'error'

export interface ToastNotificationMetadata {
  category?: string
  source?: string
  context?: unknown
  actionUrl?: string
  actionLabel?: string
  persist?: boolean
}

export interface ToastNotificationCandidate {
  message: string
  title?: string
  variant: ToastNotificationVariant
}

export type ToastNotificationPersister = (
  payload: CreateNotificationPayload,
) => Promise<unknown>

export function createToastNotificationPayload(
  toast: ToastNotificationCandidate,
  metadata: ToastNotificationMetadata = {},
): CreateNotificationPayload | null {
  if (toast.variant === 'success' || metadata.persist === false) return null

  return {
    level: toast.variant === 'default' ? 'info' : toast.variant,
    category: metadata.category,
    title: toast.title,
    message: toast.message,
    source: metadata.source,
    context: metadata.context,
    actionUrl: metadata.actionUrl,
    actionLabel: metadata.actionLabel,
  }
}

export async function persistToastNotification(
  payload: CreateNotificationPayload,
  persist: ToastNotificationPersister,
): Promise<void> {
  try {
    await persist(payload)
  } catch {
    // Persistence failures stay ephemeral and must never create another notification.
  }
}
