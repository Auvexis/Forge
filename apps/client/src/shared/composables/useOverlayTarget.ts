import {
  ownerDocumentOf,
  ownerWindowOf,
  useRenderizerOverlayTarget,
} from '@renderizer/vue'
import {
  ensureWindowSurfaceOverlayTarget,
  renderizerOverlayRootId,
} from '@renderizer/core'
import type { Ref } from 'vue'

export const fabricOverlayRootId = renderizerOverlayRootId

export function ensureOverlayRoot(document: Document): HTMLElement {
  return ensureWindowSurfaceOverlayTarget(document)
}

export { ownerDocumentOf, ownerWindowOf }

export function useOverlayTarget(sourceRef?: Ref<Element | null | undefined>) {
  return useRenderizerOverlayTarget(sourceRef)
}
