<template>
  <section class="node-editor-section">
    <header class="node-editor-section__header">
      <div>
        <p v-if="eyebrow" class="node-editor-section__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
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
defineProps<{
  title: string
  eyebrow?: string
  description?: string
}>()
</script>

<style scoped>
.node-editor-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-bottom: 1px solid var(--sailor-border-subtle);
}

.node-editor-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.node-editor-section__eyebrow {
  margin: 0 0 4px;
  color: var(--sailor-text-muted);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.node-editor-section__header h3 {
  margin: 0;
  color: var(--sailor-text-primary);
  font-size: 15px;
  line-height: 1.3;
}

.node-editor-section__description {
  margin: 5px 0 0;
  color: var(--sailor-text-secondary);
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
  gap: 12px;
}
</style>
