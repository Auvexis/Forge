<template>
  <section class="node-editor-section" :class="{ 'node-editor-section--flush': flush }">
    <header class="node-editor-section__header">
      <div class="node-editor-section__title-block">
        <p v-if="eyebrow" class="node-editor-section__eyebrow">
          <LucideIcon v-if="icon" :name="icon" :size="13" />
          {{ eyebrow }}
        </p>
        <h3 class="editor-field__label">{{ title }}</h3>
        <p v-if="description" class="node-editor-section__description">{{ description }}</p>
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
  gap: 12px;
  padding: 0;
}

.node-editor-section + .node-editor-section {
  padding-top: 20px;
}

.node-editor-section--flush + .node-editor-section--flush {
  padding-top: 14px;
}

.node-editor-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.node-editor-section__title-block {
  min-width: 0;
}

.node-editor-section__eyebrow {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0 0 6px;
  color: var(--sailor-text-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.node-editor-section__header h3 {
  margin: 0;
}

.node-editor-section__description {
  margin: 6px 0 0;
  color: var(--sailor-text-muted);
  font-size: 12px;
  line-height: 1.4;
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
  gap: 10px;
}
</style>
