import { useAuvexisProductEvents } from '@/shared/composables/useAuvexisProductEvents'
import { useToast } from '@/shared/composables/useToast'
import type { GuideRewardEvent } from '../types'

export function useGuideReward() {
  const { triggerAuvexisEvent } = useAuvexisProductEvents()
  const toast = useToast()

  async function claimGuideReward(event: GuideRewardEvent) {
    try {
      const result = await triggerAuvexisEvent(event)
      if (result.outcomes.some((outcome) => outcome.outcome === 'claimed')) {
        toast.reward('Auvexis campaign reward claimed.', {
          title: 'Reward claimed',
          category: 'rewards',
          source: 'auvexis',
          context: { outcomes: result.outcomes },
        })
      }
      return result
    } catch (error) {
      console.warn('[Auvexis] Guide reward event failed', error)
      return null
    }
  }

  return {
    claimGuideReward,
  }
}
