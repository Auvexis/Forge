import { onUnmounted } from 'vue'

type EventHandler<T = any> = (payload: T) => void

class EventBus {
  private events: Map<string, Set<EventHandler>> = new Map()

  on<T>(event: string, handler: EventHandler<T>) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler)

    // Return unsubscribe function
    return () => this.off(event, handler)
  }

  off<T>(event: string, handler: EventHandler<T>) {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit<T>(event: string, payload?: T) {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.forEach((handler) => handler(payload))
    }
  }
}

// Singleton instance
const bus = new EventBus()

/**
 * A typed global event bus for fire-and-forget cross-feature communication.
 * E.g., 'oauth:success' -> { pluginId: string }
 */
export function useEventBus<T = any>(event?: string) {
  if (event) {
    return {
      emit: (payload?: T) => bus.emit(event, payload),
      on: (handler: EventHandler<T>) => {
        const unsubscribe = bus.on(event, handler)
        // Auto-cleanup on component unmount
        onUnmounted(unsubscribe)
        return unsubscribe
      },
    }
  }

  return bus
}
