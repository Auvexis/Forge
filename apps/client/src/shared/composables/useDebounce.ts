import { customRef } from 'vue'

/**
 * Creates a debounced ref that only updates after a specified delay.
 * Useful for text inputs that trigger searches or auto-saves.
 */
export function useDebouncedRef<T>(value: T, delay = 200) {
  let timeout: ReturnType<typeof setTimeout>

  return customRef((track, trigger) => {
    return {
      get() {
        track()
        return value
      },
      set(newValue: T) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger()
        }, delay)
      },
    }
  })
}
