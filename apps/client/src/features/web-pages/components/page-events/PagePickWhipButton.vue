<template>
  <BaseButton
    class="web-page-pick-whip-button"
    size="icon"
    variant="ghost"
    :title="title"
    :disabled="disabled"
    @pointerdown.stop.prevent="startPick"
  >
    <LucideIcon name="circle-dot-dashed" :size="14" />
  </BaseButton>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    title?: string
    disabled?: boolean
  }>(),
  {
    title: 'Pick target',
    disabled: false,
  },
)

const emit = defineEmits<{
  start: [origin: { x: number; y: number }, event: PointerEvent]
}>()

function startPick(event: PointerEvent) {
  emit('start', { x: event.clientX, y: event.clientY }, event)
}
</script>
