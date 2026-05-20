import { nextTick, onBeforeUnmount, ref, type Ref } from 'vue'

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
    const viewportGap = options.viewportGap ?? 8
    const offset = options.offset ?? 6
    const preferredMaxHeight = options.preferredMaxHeight ?? 320

    const spaceBelow = window.innerHeight - rect.bottom - viewportGap
    const spaceAbove = rect.top - viewportGap
    const openUp = spaceBelow < preferredMaxHeight && spaceAbove > spaceBelow
    const availableHeight = Math.max(120, openUp ? spaceAbove : spaceBelow)

    pickerStyle.value = {
      position: 'fixed',
      top: openUp ? 'auto' : `${rect.bottom + offset}px`,
      bottom: openUp ? `${window.innerHeight - rect.top + offset}px` : 'auto',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      maxHeight: `${Math.min(preferredMaxHeight, availableHeight)}px`,
      zIndex: '10030',
    }
  }

  function addPickerPositionListeners() {
    if (isListening) return
    isListening = true
    window.addEventListener('resize', updatePickerPosition)
    window.addEventListener('scroll', updatePickerPosition, true)
  }

  function removePickerPositionListeners() {
    if (!isListening) return
    isListening = false
    window.removeEventListener('resize', updatePickerPosition)
    window.removeEventListener('scroll', updatePickerPosition, true)
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
