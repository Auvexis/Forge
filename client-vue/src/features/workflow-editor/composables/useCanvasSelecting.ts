/**
 * Shared reactive state for canvas selection.
 * - isCanvasSelecting: true while the user is actively dragging a marquee rectangle
 * - multiSelectionCount: number of currently selected nodes (updated by the canvas)
 *
 * Both are module-level singletons so any component can read them without
 * needing to pass props down the tree.
 */
import { ref } from 'vue'

export const isCanvasSelecting = ref(false)
