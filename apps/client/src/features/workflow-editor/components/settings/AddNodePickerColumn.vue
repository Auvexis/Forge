<template>
  <section class="add-node-picker-column">
    <header class="add-node-picker-column__header">
      <span>{{ title }}</span>
      <code v-if="count !== undefined">{{ count }}</code>
    </header>
    <div class="add-node-picker-column__scroller" @wheel.stop>
      <slot />
      <div v-if="empty" class="add-node-picker-column__empty">
        {{ emptyLabel }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  count?: number
  empty?: boolean
  emptyLabel?: string
}>()
</script>
