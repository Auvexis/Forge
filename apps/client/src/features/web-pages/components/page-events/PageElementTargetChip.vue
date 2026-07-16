<template>
  <span class="web-page-event-target-chip" :title="label">
    <LucideIcon :name="icon" :size="11" />
    <span>{{ label }}</span>
    <button v-if="clearable" type="button" title="Clear binding" @click="$emit('clear')">
      <LucideIcon name="x" :size="10" />
    </button>
  </span>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(
  defineProps<{
    label: string
    icon?: string
    clearable?: boolean
  }>(),
  {
    icon: 'crosshair',
    clearable: true,
  },
)

defineEmits<{
  clear: []
}>()
</script>
