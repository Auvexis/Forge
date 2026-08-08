import { nextTick, onBeforeUnmount, ref, type Ref } from 'vue'
import { ownerWindowOf } from '@/shared/composables/useOverlayTarget'

interface VariablePickerPositionOptions {
  preferredMaxHeight?: number
  viewportGap?: number
  offset?: number
}

export function useVariablePickerPosition(
  anchorRef: Ref<HTMLElement | null>,
  options: VariablePickerPositionOptions = {},
) {
  const pickerRef = ref<HTMLElement | null>(null)
  const pickerStyle = ref<Record<string, string>>({})
  let isListening = false

  function updatePickerPosition() {
    const anchor = anchorRef.value
    if (!anchor) return

    const rect = anchor.getBoundingClientRect()
    const ownerWindow = ownerWindowOf(anchor)
    const viewportGap = options.viewportGap ?? 8
    const offset = options.offset ?? 6
    const preferredMaxHeight = options.preferredMaxHeight ?? 320

    const spaceBelow = ownerWindow.innerHeight - rect.bottom - viewportGap
    const spaceAbove = rect.top - viewportGap
    const openUp = spaceBelow < preferredMaxHeight && spaceAbove > spaceBelow
    const availableHeight = Math.max(120, openUp ? spaceAbove : spaceBelow)
    const pickerWidth = Math.min(420, ownerWindow.innerWidth - viewportGap * 2)
    const desiredLeft = rect.right - pickerWidth
    const maxLeft = ownerWindow.innerWidth - viewportGap - pickerWidth
    const left = Math.min(Math.max(viewportGap, desiredLeft), maxLeft)

    pickerStyle.value = {
      position: 'fixed',
      top: openUp ? 'auto' : `${rect.bottom + offset}px`,
      bottom: openUp ? `${ownerWindow.innerHeight - rect.top + offset}px` : 'auto',
      left: `${left}px`,
      width: `${pickerWidth}px`,
      maxHeight: `${Math.min(preferredMaxHeight, availableHeight)}px`,
      zIndex: '10030',
    }
  }

  function addPickerPositionListeners() {
    if (isListening) return
    isListening = true
    const ownerWindow = ownerWindowOf(anchorRef.value)
    ownerWindow.addEventListener('resize', updatePickerPosition)
    ownerWindow.addEventListener('scroll', updatePickerPosition, true)
  }

  function removePickerPositionListeners() {
    if (!isListening) return
    isListening = false
    const ownerWindow = ownerWindowOf(anchorRef.value)
    ownerWindow.removeEventListener('resize', updatePickerPosition)
    ownerWindow.removeEventListener('scroll', updatePickerPosition, true)
  }

  async function preparePickerPosition() {
    await nextTick()
    updatePickerPosition()
    addPickerPositionListeners()
  }

  onBeforeUnmount(removePickerPositionListeners)

  return {
    pickerRef,
    pickerStyle,
    updatePickerPosition,
    preparePickerPosition,
    removePickerPositionListeners,
  }
}
