<template>
  <nav class="base-rail" :aria-label="ariaLabel">
    <slot />
  </nav>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    ariaLabel?: string
  }>(),
  {
    ariaLabel: 'Tools',
  },
)
</script>

<style scoped>
.base-rail {
  display: flex;
  width: var(--fabric-base-rail-width, 40px);
  height: 100%;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 0;
  background: var(--fabric-workbench-rail-bg);
}

.base-rail :deep(.base-rail__group) {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.base-rail :deep(.base-rail__spacer) {
  flex: 1;
}
</style>
