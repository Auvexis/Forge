import type { GuideProgressScope, GuideProgressState } from '../types'

const STORAGE_PREFIX = 'fabric:guide:v1'

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined'
}

export function guideProgressStorageKey(
  scope: GuideProgressScope,
  scopeId: string,
  guideId: string,
): string {
  return `${STORAGE_PREFIX}:${scope}:${scopeId}:${guideId}`
}

export function readGuideProgress(
  scope: GuideProgressScope,
  scopeId: string | null | undefined,
  guideId: string,
): GuideProgressState | null {
  if (!scopeId || !guideId || !canUseLocalStorage()) return null

  const raw = localStorage.getItem(guideProgressStorageKey(scope, scopeId, guideId))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as GuideProgressState
    if (parsed.guideId !== guideId) return null
    if (parsed.status !== 'skipped' && parsed.status !== 'completed') return null
    if (typeof parsed.version !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function writeGuideProgress(
  scope: GuideProgressScope,
  scopeId: string | null | undefined,
  progress: GuideProgressState,
) {
  if (!scopeId || !progress.guideId || !canUseLocalStorage()) return
  localStorage.setItem(
    guideProgressStorageKey(scope, scopeId, progress.guideId),
    JSON.stringify(progress),
  )
}

export function hasCompletedGuide(input: {
  scope: GuideProgressScope
  scopeId: string | null | undefined
  guideId: string
  version: number
}): boolean {
  const progress = readGuideProgress(input.scope, input.scopeId, input.guideId)
  if (!progress) return false
  if (progress.version !== input.version) return false
  return progress.status === 'skipped' || progress.status === 'completed'
}

export function markGuideCompleted(input: {
  scope: GuideProgressScope
  scopeId: string | null | undefined
  guideId: string
  version: number
}) {
  writeGuideProgress(input.scope, input.scopeId, {
    guideId: input.guideId,
    status: 'completed',
    version: input.version,
    updatedAt: new Date().toISOString(),
  })
}

export function markGuideSkipped(input: {
  scope: GuideProgressScope
  scopeId: string | null | undefined
  guideId: string
  version: number
}) {
  writeGuideProgress(input.scope, input.scopeId, {
    guideId: input.guideId,
    status: 'skipped',
    version: input.version,
    updatedAt: new Date().toISOString(),
  })
}

export function resetGuideProgress(
  scope: GuideProgressScope,
  scopeId: string | null | undefined,
  guideId: string,
) {
  if (!scopeId || !guideId || !canUseLocalStorage()) return
  localStorage.removeItem(guideProgressStorageKey(scope, scopeId, guideId))
}
