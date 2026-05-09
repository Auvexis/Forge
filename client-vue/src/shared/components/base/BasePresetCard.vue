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
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-md);
  background: var(--nod8-bg-surface);
  color: var(--nod8-text-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--nod8-duration-fast) var(--nod8-ease-standard),
              background var(--nod8-duration-fast) var(--nod8-ease-standard);
  width: 100%;
}

.preset-card:hover {
  border-color: var(--nod8-border-strong);
  background: var(--nod8-button-ghost-hover);
}

.preset-card--active {
  border-color: var(--nod8-border-strong);
  box-shadow: inset 0 0 0 1px var(--nod8-border-strong);
}

.preset-card__swatch {
  display: block;
  width: 100%;
  height: 26px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
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
  color: var(--nod8-text-primary);
  line-height: 1.2;
}

.preset-card__desc {
  display: block;
  font-size: 11px;
  color: var(--nod8-text-muted);
  line-height: 1.35;
  font-weight: 400;
}
</style>
