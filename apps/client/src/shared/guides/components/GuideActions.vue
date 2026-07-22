<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'

withDefaults(
  defineProps<{
    canBack?: boolean
    canNext?: boolean
    isLastStep?: boolean
    nextLabel?: string
    backLabel?: string
    completeLabel?: string
  }>(),
  {
    canBack: true,
    canNext: true,
    isLastStep: false,
    nextLabel: 'Next',
    backLabel: 'Back',
    completeLabel: 'Done',
  },
)

defineEmits<{
  back: []
  next: []
  complete: []
}>()
</script>

<template>
  <footer class="guide-actions">
    <BaseButton variant="secondary" :disabled="!canBack" @click="$emit('back')">
      {{ backLabel }}
    </BaseButton>
    <BaseButton
      v-if="!isLastStep"
      variant="primary"
      :disabled="!canNext"
      @click="$emit('next')"
    >
      {{ nextLabel }}
    </BaseButton>
    <BaseButton v-else variant="primary" :disabled="!canNext" @click="$emit('complete')">
      {{ completeLabel }}
    </BaseButton>
  </footer>
</template>

<style scoped>
.guide-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--fabric-space-2);
  padding: var(--fabric-space-4);
  border-top: 1px solid var(--fabric-border);
}
</style>
