<template>
  <button class="base-topbar-button" :disabled="disabled" :style="buttonStyle" v-bind="$attrs">
    <span v-if="$slots.left" class="base-topbar-button__side">
      <slot name="left" />
    </span>

    <span v-if="$slots.default" class="base-topbar-button__center">
      <slot />
    </span>

    <span v-if="$slots.right" class="base-topbar-button__side">
      <slot name="right" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    width?: string
    gap?: string
  }>(),
  {
    disabled: false,
    width: 'auto',
    gap: 'var(--fabric-space-2)',
  },
)

const buttonStyle = computed(() => ({
  '--base-topbar-button-width': props.width,
  '--base-topbar-button-gap': props.gap,
}))

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-topbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--base-topbar-button-gap);
  width: var(--base-topbar-button-width);
  height: 100%;
  min-width: 0;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-topbar-search-text);
  background: transparent;
  font: inherit;
  font-weight: var(--fabric-font-medium);
  cursor: pointer;
  transition:
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
  user-select: none;
}

.base-topbar-button:hover {
  color: var(--fabric-topbar-search-hover-text);
  background: var(--fabric-button-ghost-hover);
}

.base-topbar-button:active {
  background: var(--fabric-button-ghost-active);
}

.base-topbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.base-topbar-button__side,
.base-topbar-button__center {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.base-topbar-button__side {
  flex: 0 0 auto;
  line-height: 0;
}

.base-topbar-button__center {
  flex: 0 1 auto;
}
</style>
