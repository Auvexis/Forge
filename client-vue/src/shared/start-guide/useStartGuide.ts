import { useProfileStore } from '@/shared/stores/profile.store'
import { getStartGuideDefinition, startGuideRegistry } from './startGuide.registry'
import {
  hasCompletedStartGuide,
  resetStartGuideProgress,
  writeStartGuideProgress,
} from './startGuideProgress'
import { useStartGuideControllerStore } from './startGuideController.store'
import type { StartGuideDefinition } from './startGuide.types'

function resolveGuide(input: string | StartGuideDefinition): StartGuideDefinition | null {
  return typeof input === 'string' ? getStartGuideDefinition(input) : input
}

export function useStartGuide() {
  const controller = useStartGuideControllerStore()
  const profileStore = useProfileStore()

  function openIfNeeded(input: string | StartGuideDefinition) {
    const guide = resolveGuide(input)
    const profileId = profileStore.currentProfile?.id
    if (!guide || !profileId) return false
    if (hasCompletedStartGuide(profileId, guide)) return false
    controller.openGuide(guide)
    return true
  }

  function open(input: string | StartGuideDefinition) {
    const guide = resolveGuide(input)
    if (!guide) return false
    controller.openGuide(guide)
    return true
  }

  function skip() {
    const guide = controller.activeGuide
    const profileId = profileStore.currentProfile?.id
    if (guide && profileId) {
      writeStartGuideProgress(profileId, {
        featureId: guide.featureId,
        status: 'skipped',
        version: guide.version,
        updatedAt: new Date().toISOString(),
      })
    }
    controller.closeGuide()
  }

  function complete() {
    const guide = controller.activeGuide
    const profileId = profileStore.currentProfile?.id
    if (guide && profileId) {
      writeStartGuideProgress(profileId, {
        featureId: guide.featureId,
        status: 'completed',
        version: guide.version,
        updatedAt: new Date().toISOString(),
      })
    }
    controller.closeGuide()
  }

  function reset(featureId: string) {
    resetStartGuideProgress(profileStore.currentProfile?.id, featureId)
  }

  return {
    controller,
    registry: startGuideRegistry,
    openIfNeeded,
    open,
    skip,
    complete,
    reset,
    openGuideBook: controller.openGuideBook,
    closeGuideBook: controller.closeGuideBook,
  }
}
