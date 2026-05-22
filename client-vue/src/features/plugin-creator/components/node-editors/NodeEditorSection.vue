<template>
  <section class="node-editor-section te-section" :class="{ 'node-editor-section--flush': flush }">
    <header class="node-editor-section__header te-intro">
      <div class="node-editor-section__title-block">
        <span class="te-label">
          <LucideIcon v-if="icon" :name="icon" :size="12" />
          {{ title }}
          <span v-if="eyebrow" class="te-label-sub">{{ eyebrow }}</span>
        </span>
        <p v-if="description" class="te-hint">{{ description }}</p>
      </div>
      <div v-if="$slots.toolbar" class="node-editor-section__toolbar">
        <slot name="toolbar" />
      </div>
    </header>
    <div class="node-editor-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  title: string
  eyebrow?: string
  description?: string
  icon?: string
  flush?: boolean
}>(), {
  flush: false,
})
</script>

<style scoped>
.node-editor-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
}

.node-editor-section + .node-editor-section {
  padding-top: 4px;
}

.node-editor-section--flush + .node-editor-section--flush {
  padding-top: 0;
}

.node-editor-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.node-editor-section__title-block {
  min-width: 0;
}

.node-editor-section :deep(.te-label),
.node-editor-section__header .te-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.node-editor-section__toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.node-editor-section__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
