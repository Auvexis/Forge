<template>
  <div
    class="web-page-blueprint-component-group"
    :class="{ 'is-selected': selected }"
    :style="{
      transform: `translate(${x}px, ${y}px)`,
      width: `${width}px`,
      height: `${height}px`,
    }"
  >
    <header data-base-canvas-no-drag @pointerdown.stop.prevent="$emit('dragStart', $event)">
      <span class="web-page-blueprint-component-group__accent" />
      <LucideIcon name="component" :size="12" />
      <strong>{{ name }}</strong>
      <small>{{ childCount }} nodes</small>
    </header>
  </div>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineProps<{
  name: string
  childCount: number
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}>()

defineEmits<{
  dragStart: [event: PointerEvent]
}>()
</script>
