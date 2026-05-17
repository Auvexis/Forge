<!-- Reusable field wrapper used by all node editors -->
<template>
  <div class="editor-field">
    <label v-if="label" class="editor-field__label">
      <component :is="iconComponent" v-if="icon" class="editor-field__icon" />
      {{ label }}
    </label>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<{
  label?: string
  icon?: string
}>()

// Render icon only when prop is provided
const iconComponent = computed(() =>
  props.icon ? { render: () => h(LucideIcon, { name: props.icon!, size: 14 }) } : null,
)
</script>

<style scoped>
.editor-field {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.editor-field__label {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-1);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sailor-text-muted);
}

.editor-field__icon {
  color: var(--sailor-text-muted);
}
</style>
