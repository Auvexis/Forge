import { onMounted, onUnmounted } from 'vue'

type KeyCombo = string

interface KeyboardOptions {
  prevent?: boolean
  stop?: boolean
  exact?: boolean
}

/**
 * Normalizes a key combo string (e.g. 'ctrl+shift+k' to a standard format)
 */
function normalizeCombo(combo: string): string[] {
  return combo
    .toLowerCase()
    .split('+')
    .map((k) => k.trim())
}

/**
 * Checks if a standard keyboard event matches a given combo array.
 */
function matchesCombo(e: KeyboardEvent, comboKeys: string[], exact: boolean): boolean {
  const hasMeta =
    comboKeys.includes('meta') || comboKeys.includes('cmd') || comboKeys.includes('ctrl')
  const hasShift = comboKeys.includes('shift')
  const hasAlt = comboKeys.includes('alt')

  // Check modifiers
  const metaMatch = (e.ctrlKey || e.metaKey) === hasMeta
  const shiftMatch = e.shiftKey === hasShift
  const altMatch = e.altKey === hasAlt

  // Exact flag means NO other modifiers should be pressed
  if (exact) {
    if (!metaMatch || !shiftMatch || !altMatch) return false
  } else {
    // Non-exact means the *required* modifiers must be pressed, but others can be too
    // (Simplified logic, usually exactly matching modifiers is safer to avoid overlapping shortcuts)
    if (hasMeta && !(e.ctrlKey || e.metaKey)) return false
    if (hasShift && !e.shiftKey) return false
    if (hasAlt && !e.altKey) return false
  }

  // Find the non-modifier key
  const targetKey = comboKeys.find((k) => !['meta', 'cmd', 'ctrl', 'shift', 'alt'].includes(k))

  if (!targetKey) return metaMatch && shiftMatch && altMatch // Modifier only shortcut?

  // Key match
  return e.key.toLowerCase() === targetKey
}

/**
 * Registers global keyboard shortcuts.
 */
export function useKeyboard(
  combo: KeyCombo,
  callback: (e: KeyboardEvent) => void,
  options: KeyboardOptions = { prevent: true, exact: true },
) {
  const comboKeys = normalizeCombo(combo)

  const handleKeydown = (e: KeyboardEvent) => {
    // Ignore keydown when typing inside an input/textarea, UNLESS it's a dedicated shortcut like escape/enter
    const target = e.target as HTMLElement
    const isInput =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // If we're an input, only allow some shortcuts like Escape, Enter, or CMD+Enter
    if (
      isInput &&
      !['escape', 'enter'].includes(
        comboKeys.find((k) => !['cmd', 'ctrl', 'shift', 'alt', 'meta'].includes(k)) || '',
      )
    ) {
      return
    }

    if (matchesCombo(e, comboKeys, options.exact ?? true)) {
      if (options.prevent) e.preventDefault()
      if (options.stop) e.stopPropagation()
      callback(e)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}
