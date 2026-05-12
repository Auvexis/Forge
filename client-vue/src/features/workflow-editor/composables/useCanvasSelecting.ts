/**
 * Shared reactive state for canvas selection.
 * - isCanvasSelecting: true while the user is actively dragging a marquee rectangle
 * - multiSelectionCount: number of currently selected nodes (updated by the canvas)
 *
 * Both are module-level singletons so any component can read them without
 * needing to pass props down the tree.
 */
import { ref, computed } from 'vue'

export const isCanvasSelecting   = ref(false)
export const multiSelectionCount = ref(0)

/** True whenever 2+ nodes are selected (either via shift+drag or shift+click). */
export const isMultiSelection = computed(() => multiSelectionCount.value >= 2)
