/**
 * Shared reactive state that tracks whether the user is actively
 * performing a marquee (rubber-band) selection on the canvas.
 * Used by edge/node toolbars to suppress themselves during selection.
 */
import { ref } from 'vue'

export const isCanvasSelecting = ref(false)
