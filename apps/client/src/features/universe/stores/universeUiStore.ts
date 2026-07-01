import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUniverseUiStore = defineStore('universeUi', () => {
  /** When true, all HUD panels are hidden for a cinematic/screenshot experience */
  const hideUI = ref(false)

  function toggleUI() {
    hideUI.value = !hideUI.value
  }

  return { hideUI, toggleUI }
})
