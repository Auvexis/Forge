<template>
  <button
    type="button"
    class="preset-card"
    :class="{ 'preset-card--active': active }"
    @click="emit('click')"
  >
    <span class="preset-card__swatch" :style="{ background: swatch }" />
    <span class="preset-card__body">
      <strong class="preset-card__label">{{ label }}</strong>
      <small v-if="description" class="preset-card__desc">{{ description }}</small>
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  swatch?: string
  active?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<style scoped>
.preset-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-surface);
  color: var(--fabric-text-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
              background var(--fabric-duration-fast) var(--fabric-ease-standard);
  width: 100%;
}

.preset-card:hover {
  border-color: var(--fabric-border-strong);
  background: var(--fabric-button-ghost-hover);
}

.preset-card--active {
  border-color: var(--fabric-border-strong);
  box-shadow: inset 0 0 0 1px var(--fabric-border-strong);
}

.preset-card__swatch {
  display: block;
  width: 100%;
  height: 26px;
  border-radius: var(--fabric-radius-sm);
  border: 1px solid var(--fabric-border);
  flex-shrink: 0;
}

.preset-card__body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preset-card__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--fabric-text-primary);
  line-height: 1.2;
}

.preset-card__desc {
  display: block;
  font-size: 11px;
  color: var(--fabric-text-muted);
  line-height: 1.35;
  font-weight: 400;
}
</style>
