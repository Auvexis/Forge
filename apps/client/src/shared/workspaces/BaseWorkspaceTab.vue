<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

withDefaults(defineProps<{
  title: string
  active?: boolean
  closable?: boolean
}>(), {
  active: false,
  closable: true,
})

defineEmits<{
  (event: 'select'): void
  (event: 'close'): void
}>()
</script>

<template>
  <button
    class="base-workspace-tab"
    :class="{ 'base-workspace-tab--active': active }"
    type="button"
    role="tab"
    :aria-selected="active"
    @click="$emit('select')"
  >
    <span class="base-workspace-tab__title">{{ title }}</span>
    <span
      v-if="closable"
      class="base-workspace-tab__close"
      role="button"
      tabindex="0"
      aria-label="Close tab"
      @click.stop="$emit('close')"
      @keydown.enter.stop="$emit('close')"
    >
      <LucideIcon name="x" :size="13" />
    </span>
  </button>
</template>

<style scoped>
.base-workspace-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-2);
  min-width: 120px;
  max-width: 240px;
  height: 40px;
  padding: 0 var(--fabric-space-2) 0 var(--fabric-space-3);
  border: 0;
  border-right: 1px solid var(--fabric-app-topbar-topbar-border);
  border-radius: 0;
  background: transparent;
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-sm);
  cursor: default;
  -webkit-app-region: no-drag;
}

.base-workspace-tab::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 2px;
  background: transparent;
}

.base-workspace-tab:hover,
.base-workspace-tab--active {
  background: var(--fabric-bg-surface);
  color: var(--fabric-text-primary);
}

.base-workspace-tab--active::before {
  background: var(--fabric-accent);
}

.base-workspace-tab__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-workspace-tab__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: var(--fabric-radius-sm);
}

.base-workspace-tab__close:hover {
  background: var(--fabric-bg-muted);
}
</style>
