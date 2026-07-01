import type { StartGuideDefinition, StartGuideProgress } from './startGuide.types'

const STORAGE_PREFIX = 'sailor:start-guide:v1'

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined'
}

export function startGuideStorageKey(profileId: string, featureId: string): string {
  return `${STORAGE_PREFIX}:${profileId}:${featureId}`
}

export function readStartGuideProgress(
  profileId: string | null | undefined,
  featureId: string,
): StartGuideProgress | null {
  if (!profileId || !featureId || !canUseLocalStorage()) return null

  const raw = localStorage.getItem(startGuideStorageKey(profileId, featureId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as StartGuideProgress
    if (parsed.featureId !== featureId) return null
    if (parsed.status !== 'skipped' && parsed.status !== 'completed') return null
    if (typeof parsed.version !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function writeStartGuideProgress(
  profileId: string | null | undefined,
  progress: StartGuideProgress,
) {
  if (!profileId || !progress.featureId || !canUseLocalStorage()) return
  localStorage.setItem(startGuideStorageKey(profileId, progress.featureId), JSON.stringify(progress))
}

export function hasCompletedStartGuide(
  profileId: string | null | undefined,
  definition: StartGuideDefinition,
): boolean {
  const progress = readStartGuideProgress(profileId, definition.featureId)
  if (!progress) return false
  if (progress.version !== definition.version) return false
  return progress.status === 'skipped' || progress.status === 'completed'
}

export function resetStartGuideProgress(profileId: string | null | undefined, featureId: string) {
  if (!profileId || !featureId || !canUseLocalStorage()) return
  localStorage.removeItem(startGuideStorageKey(profileId, featureId))
}
