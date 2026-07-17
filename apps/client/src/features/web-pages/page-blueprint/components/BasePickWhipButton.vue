<template>
  <button
    data-base-canvas-no-drag
    class="web-page-blueprint-pick-whip"
    type="button"
    :title="title"
    @pointerdown.stop.prevent="emitPick"
  >
    <LucideIcon :name="icon" :size="11" />
  </button>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  title?: string
  icon?: string
}>(), {
  title: 'Pick whip',
  icon: 'link-2',
})

const emit = defineEmits<{
  pick: [event: PointerEvent]
}>()

function emitPick(event: PointerEvent) {
  emit('pick', event)
}
</script>
