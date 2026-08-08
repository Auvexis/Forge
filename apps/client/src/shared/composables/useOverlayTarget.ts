import { computed, type Ref } from 'vue'

export const fabricOverlayRootId = 'fabric-overlay-root'

export function ensureOverlayRoot(document: Document): HTMLElement {
  const existing = document.getElementById(fabricOverlayRootId)
  if (existing) return existing

  const root = document.createElement('div')
  root.id = fabricOverlayRootId
  root.setAttribute('data-fabric-overlay-root', '')
  document.body.append(root)
  return root
}

export function ownerDocumentOf(element?: Element | null): Document {
  return element?.ownerDocument ?? document
}

export function ownerWindowOf(element?: Element | null): Window {
  return ownerDocumentOf(element).defaultView ?? window
}

export function useOverlayTarget(sourceRef?: Ref<Element | null | undefined>) {
  return computed(() => ensureOverlayRoot(ownerDocumentOf(sourceRef?.value ?? null)))
}
