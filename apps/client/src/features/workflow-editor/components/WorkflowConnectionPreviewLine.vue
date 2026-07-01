<template>
  <path
    class="sailor-connection-preview-line"
    :class="status"
    :d="path"
    fill="none"
  />
</template>

<script setup lang="ts">
defineProps<{
  path: string
  status: 'valid' | 'invalid'
}>()
</script>

<style scoped>
.sailor-connection-preview-line {
  stroke: var(--sailor-rf-edge-stroke);
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
}

.sailor-connection-preview-line.valid {
  stroke: var(--sailor-rf-edge-stroke-selected);
}

.sailor-connection-preview-line.invalid {
  stroke: var(--sailor-rf-edge-stroke-selected);
}
</style>
