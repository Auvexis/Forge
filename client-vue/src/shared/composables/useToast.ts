import { ref, readonly } from 'vue'
import { generateId } from '../utils/id'
import { TOAST_DURATION_MS } from '@/core/constants/app'

export type ToastVariant = 'default' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  duration?: number
}

// Global state for toasts
const toasts = ref<Toast[]>([])

export function useToast() {
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const duplicate = toasts.value.find(
      (item) =>
        item.variant === toast.variant &&
        item.title === toast.title &&
        item.message === toast.message,
    )
    if (duplicate) return duplicate.id

    const id = generateId('toast')
    const newToast: Toast = {
      ...toast,
      id,
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

  const success = (message: string, title?: string, duration?: number) =>
    addToast({ message, title, variant: 'success', duration })

  const error = (message: string, title?: string, duration?: number) =>
    addToast({ message, title, variant: 'error', duration })

  const warning = (message: string, title?: string, duration?: number) =>
    addToast({ message, title, variant: 'warning', duration })

  const info = (message: string, title?: string, duration?: number) =>
    addToast({ message, title, variant: 'default', duration })

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
