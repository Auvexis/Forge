import { ref, readonly } from 'vue'
import { generateId } from '../utils/id'
import { TOAST_DURATION_MS } from '../../core/constants/app.ts'
import {
  createToastNotificationPayload,
  persistToastNotification,
  type ToastNotificationMetadata,
  type ToastNotificationPersister,
} from './toastNotificationPolicy.ts'

export type ToastVariant = 'default' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  duration?: number
}

export interface ToastOptions extends ToastNotificationMetadata {
  title?: string
  duration?: number
}

type ToastInput = Omit<Toast, 'id'> & ToastNotificationMetadata

// Global state for toasts
const toasts = ref<Toast[]>([])

const persistNotification: ToastNotificationPersister = async (payload) => {
  const { useNotificationStore } = await import('../stores/notification.store.ts')
  await useNotificationStore().persist(payload)
}

export function useToast() {
  const addToast = (toast: ToastInput) => {
    const duplicate = toasts.value.find(
      (item) =>
        item.variant === toast.variant &&
        item.title === toast.title &&
        item.message === toast.message,
    )
    if (duplicate) return duplicate.id

    const notification = createToastNotificationPayload(toast, toast)
    if (notification) void persistToastNotification(notification, persistNotification)

    const id = generateId('toast')
    const newToast: Toast = {
      id,
      message: toast.message,
      title: toast.title,
      variant: toast.variant,
      duration: toast.duration ?? TOAST_DURATION_MS,
    }

    toasts.value.push(newToast)

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (
    message: string,
    titleOrOptions?: string | ToastOptions,
    duration?: number,
  ) => addToast({ message, variant: 'success', ...normalizeToastOptions(titleOrOptions, duration) })

  const error = (
    message: string,
    titleOrOptions?: string | ToastOptions,
    duration?: number,
  ) => addToast({ message, variant: 'error', ...normalizeToastOptions(titleOrOptions, duration) })

  const warning = (
    message: string,
    titleOrOptions?: string | ToastOptions,
    duration?: number,
  ) => addToast({ message, variant: 'warning', ...normalizeToastOptions(titleOrOptions, duration) })

  const info = (
    message: string,
    titleOrOptions?: string | ToastOptions,
    duration?: number,
  ) => addToast({ message, variant: 'default', ...normalizeToastOptions(titleOrOptions, duration) })

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  }
}

function normalizeToastOptions(
  titleOrOptions?: string | ToastOptions,
  duration?: number,
): ToastOptions {
  if (typeof titleOrOptions === 'object') {
    return {
      ...titleOrOptions,
      duration: titleOrOptions.duration ?? duration,
    }
  }
  return { title: titleOrOptions, duration }
}
