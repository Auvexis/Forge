import type { App } from 'vue'
import { useToast } from './useToast'

let installed = false

export function installGlobalErrorToasts(app: App) {
  if (installed || typeof window === 'undefined') return
  installed = true
  const toast = useToast()
  const originalConsoleError = console.error.bind(console)

  function report(error: unknown, title = 'Browser error') {
    toast.error(formatError(error), title)
  }

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args)
    report(args.map(formatError).join(' '), 'Console error')
  }

  window.addEventListener('error', (event) => {
    report(event.error || event.message, 'Runtime error')
  })

  window.addEventListener('unhandledrejection', (event) => {
    report(event.reason, 'Unhandled promise')
  })

  app.config.errorHandler = (error) => {
    report(error, 'Vue error')
  }
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
