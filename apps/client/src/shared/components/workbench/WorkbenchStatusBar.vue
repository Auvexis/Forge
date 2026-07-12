<template>
  <div class="workbench-status-bar" role="toolbar" :aria-label="ariaLabel">
    <div class="workbench-status-bar__zone workbench-status-bar__zone--left">
      <slot name="left" />
    </div>
    <div v-if="$slots.center" class="workbench-status-bar__zone workbench-status-bar__zone--center">
      <slot name="center" />
    </div>
    <div v-if="$slots.right" class="workbench-status-bar__zone workbench-status-bar__zone--right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    ariaLabel?: string
  }>(),
  {
    ariaLabel: 'Workbench status',
  },
)
</script>

<style scoped>
.workbench-status-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  height: var(--fabric-workbench-status-height, 24px);
  min-width: 0;
  overflow: hidden;
  background: var(--fabric-workbench-status-bg);
  color: var(--fabric-workbench-status-text);
  font-size: 11px;
}

.workbench-status-bar__zone {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  height: 100%;
}

.workbench-status-bar__zone--left {
  justify-content: flex-start;
}

.workbench-status-bar__zone--center {
  justify-content: center;
}

.workbench-status-bar__zone--right {
  justify-content: flex-end;
}

.workbench-status-bar :deep(button),
.workbench-status-bar :deep(a) {
  height: 100%;
}
</style>
