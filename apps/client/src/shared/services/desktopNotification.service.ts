import type { AppNotification } from '@/core/types/notification.types'
import type { AppSettings } from '@/shared/stores/settings.store'

export function shouldSendDesktopNotification(settings: AppSettings): boolean {
  return settings.desktop_notifications_enabled !== false
}

export function sendDesktopNotification(notification: AppNotification, settings: AppSettings) {
  if (
    typeof window === 'undefined' ||
    !window.fabricDesktop?.isDesktop ||
    !shouldSendDesktopNotification(settings)
  ) {
    return
  }

  void window.fabricDesktop.notify({
    title: notification.title || desktopNotificationTitle(notification.level),
    body: notification.message,
  })
}

function desktopNotificationTitle(level: AppNotification['level']) {
  if (level === 'error') return 'Fabric error'
  if (level === 'warning') return 'Fabric warning'
  return 'Fabric notification'
}
