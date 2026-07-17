<template>
  <section class="web-page-blueprint-inspector-section">
    <header>{{ title }}</header>
    <div>
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>
