import type { App } from 'vue'
import { useToast } from './useToast'

let installed = false
const recentReports = new Map<string, number>()
const globalErrorDuplicateWindowMs = 750

export function installGlobalErrorToasts(app: App) {
  if (installed || typeof window === 'undefined') return
  installed = true
  const toast = useToast()
  const originalConsoleError = console.error.bind(console)

  function report(error: unknown, title = 'Browser error', source = 'browser-error') {
    const message = formatError(error)
    if (shouldSkipDuplicateReport(message)) return
    toast.error(message, { title, category: 'global', source })
  }

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args)
    report(args.map(formatError).join(' '), 'Console error', 'browser-console')
  }

  window.addEventListener('error', (event) => {
    report(event.error || event.message, 'Runtime error', 'browser-runtime')
  })

  window.addEventListener('unhandledrejection', (event) => {
    report(event.reason, 'Unhandled promise', 'browser-unhandled-promise')
  })

  app.config.errorHandler = (error) => {
    report(error, 'Vue error', 'browser-vue')
  }
}

function shouldSkipDuplicateReport(message: string): boolean {
  const now = Date.now()
  const lastSeenAt = recentReports.get(message)
  recentReports.set(message, now)
  for (const [key, seenAt] of recentReports) {
    if (now - seenAt > globalErrorDuplicateWindowMs) recentReports.delete(key)
  }
  return lastSeenAt !== undefined && now - lastSeenAt <= globalErrorDuplicateWindowMs
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}
