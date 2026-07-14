<template>
  <path
    class="fabric-connection-preview-line"
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
.fabric-connection-preview-line {
  stroke: var(--fabric-workflow-edge-stroke, var(--fabric-rf-edge-stroke));
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
}

.fabric-connection-preview-line.valid {
  stroke: var(--fabric-workflow-edge-selected, var(--fabric-rf-edge-stroke-selected));
}

.fabric-connection-preview-line.invalid {
  stroke: var(--fabric-workflow-edge-error, var(--fabric-rf-edge-stroke-selected));
}
</style>
