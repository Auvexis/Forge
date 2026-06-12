import { customRef } from 'vue'

/**
 * Creates a ref that automatically syncs its value with localStorage.
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  return customRef((track, trigger) => {
    return {
      get() {
        track()
        const stored = localStorage.getItem(key)
        if (stored !== null) {
          try {
            return JSON.parse(stored) as T
          } catch {
            return defaultValue
          }
        }
        return defaultValue
      },
      set(newValue: T) {
        if (newValue === null || newValue === undefined) {
          localStorage.removeItem(key)
        } else {
          localStorage.setItem(key, JSON.stringify(newValue))
        }
        trigger()
      },
    }
  })
}
