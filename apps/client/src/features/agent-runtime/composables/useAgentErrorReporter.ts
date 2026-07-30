import { useToast } from '@/shared/composables/useToast'

export function useAgentErrorReporter() {
  const toast = useToast()

  function reportAgentError(error: unknown, fallback: string, operation: string) {
    const message = error instanceof Error && error.message ? error.message : fallback
    toast.error(message, {
      title: 'Agent error',
      category: 'agents',
      source: 'agent-runtime',
      context: { operation },
    })
  }

  return { reportAgentError }
}
