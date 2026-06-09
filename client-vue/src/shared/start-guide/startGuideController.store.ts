import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { StartGuideDefinition, StartGuideLang } from './startGuide.types'

export const useStartGuideControllerStore = defineStore('start-guide-controller', () => {
  const activeGuide = ref<StartGuideDefinition | null>(null)
  const activeStepIndex = ref(0)
  const activeLang = ref<StartGuideLang>('en')
  const isGuideBookOpen = ref(false)

  const isOpen = computed(() => activeGuide.value !== null)
  const activeStep = computed(() => activeGuide.value?.steps[activeStepIndex.value] ?? null)

  function openGuide(guide: StartGuideDefinition, lang?: StartGuideLang) {
    activeGuide.value = guide
    activeStepIndex.value = 0
    activeLang.value = lang ?? guide.defaultLang
  }

  function closeGuide() {
    activeGuide.value = null
    activeStepIndex.value = 0
  }

  function nextStep() {
    if (!activeGuide.value) return
    activeStepIndex.value = Math.min(activeStepIndex.value + 1, activeGuide.value.steps.length - 1)
  }

  function prevStep() {
    activeStepIndex.value = Math.max(activeStepIndex.value - 1, 0)
  }

  function setLang(lang: StartGuideLang) {
    activeLang.value = lang
  }

  function openGuideBook() {
    isGuideBookOpen.value = true
  }

  function closeGuideBook() {
    isGuideBookOpen.value = false
  }

  return {
    activeGuide,
    activeStepIndex,
    activeLang,
    activeStep,
    isOpen,
    isGuideBookOpen,
    openGuide,
    closeGuide,
    nextStep,
    prevStep,
    setLang,
    openGuideBook,
    closeGuideBook,
  }
})
