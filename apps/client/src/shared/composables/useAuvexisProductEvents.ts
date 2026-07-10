import { ref } from 'vue'
import {
  auvexisAccountApi,
  type AuvexisProductEventInput,
  type AuvexisProductEventResult,
} from '@/core/api/auvexis-account.api'

export type TriggerAuvexisProductEventInput = AuvexisProductEventInput

export function useAuvexisProductEvents() {
  const isEmitting = ref(false)
  const error = ref<string | null>(null)
  const lastResult = ref<AuvexisProductEventResult | null>(null)

  async function triggerAuvexisEvent(
    input: TriggerAuvexisProductEventInput,
  ): Promise<AuvexisProductEventResult> {
    isEmitting.value = true
    error.value = null
    try {
      const result = await auvexisAccountApi.emitProductEvent(input)
      lastResult.value = result
      return result
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to emit Auvexis event'
      throw err
    } finally {
      isEmitting.value = false
    }
  }

  return {
    isEmitting,
    error,
    lastResult,
    triggerAuvexisEvent,
  }
}
