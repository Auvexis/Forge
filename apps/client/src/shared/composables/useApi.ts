import { ref, type Ref, type ShallowRef, shallowRef } from 'vue'
import { useToast } from './useToast'

export interface UseApiReturn<T, Args extends any[]> {
  data: ShallowRef<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  execute: (...args: Args) => Promise<T>
  reset: () => void
}

/**
 * A generic composable to wrap async API calls with loading and error state.
 *
 * @param apiFunction The API function to wrap
 * @param initialData Optional initial data
 */
export function useApi<T, Args extends any[]>(
  apiFunction: (...args: Args) => Promise<T>,
  initialData: T | null = null,
): UseApiReturn<T, Args> {
  const data = shallowRef<T | null>(initialData)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const execute = async (...args: Args): Promise<T> => {
    loading.value = true
    error.value = null
    try {
      const result = await apiFunction(...args)
      data.value = result
      return result
    } catch (e: any) {
      const message = e?.message || 'An unexpected error occurred'
      error.value = message
      useToast().error(message)
      throw e
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    data.value = initialData
    loading.value = false
    error.value = null
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
  }
}
