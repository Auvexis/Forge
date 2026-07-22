import { computed, ref } from 'vue'

export function useGuideFlow<const TStepId extends string>(steps: readonly TStepId[]) {
  const stepIndex = ref(0)
  const stepCount = computed(() => steps.length)
  const activeStep = computed(() => steps[stepIndex.value] ?? null)
  const isFirstStep = computed(() => stepIndex.value === 0)
  const isLastStep = computed(() => stepIndex.value >= steps.length - 1)

  function is(stepId: TStepId) {
    return activeStep.value === stepId
  }

  function goTo(stepId: TStepId) {
    const nextIndex = steps.indexOf(stepId)
    if (nextIndex >= 0) stepIndex.value = nextIndex
  }

  function next() {
    stepIndex.value = Math.min(stepIndex.value + 1, Math.max(steps.length - 1, 0))
  }

  function back() {
    stepIndex.value = Math.max(stepIndex.value - 1, 0)
  }

  function reset() {
    stepIndex.value = 0
  }

  return {
    steps,
    stepIndex,
    stepCount,
    activeStep,
    isFirstStep,
    isLastStep,
    is,
    goTo,
    next,
    back,
    reset,
  }
}
