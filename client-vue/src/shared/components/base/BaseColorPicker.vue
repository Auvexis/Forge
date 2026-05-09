<template>
  <div class="bcp-root" :class="{ 'bcp-root--disabled': disabled }">
    <label class="bcp-swatch-wrapper" :title="modelValue">
      <span class="bcp-swatch" :style="{ background: modelValue }">
        <span class="bcp-swatch__overlay" />
      </span>
      <input
        class="bcp-color-input"
        type="color"
        :value="safeColorValue"
        :disabled="disabled"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <input
      v-if="showValue"
      class="bcp-text-input"
      type="text"
      :value="modelValue"
      :disabled="disabled"
      spellcheck="false"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  showValue?: boolean
  disabled?: boolean
}>(), {
  modelValue: '#000000',
  showValue: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Native type="color" inputs only accept strict #RRGGBB 7-char hex formats.
// If the user types rgba() or an 8-char hex with alpha, we must fallback to avoid a DOM warning.
const safeColorValue = computed(() => {
  const val = props.modelValue.trim()
  if (val.startsWith('#') && val.length === 7) return val
  if (val.startsWith('#') && val.length === 9) return val.substring(0, 7) // Strip alpha for picker
  if (val.startsWith('#') && val.length === 4) {
    return '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]
  }
  return '#000000'
})
</script>

<style scoped>
.bcp-root {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 3px 8px 3px 3px;
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-bg-surface);
  transition: border-color var(--nod8-duration-fast) var(--nod8-ease-standard),
              box-shadow var(--nod8-duration-fast) var(--nod8-ease-standard);
  position: relative;
}

.bcp-root:hover {
  border-color: var(--nod8-border-strong);
}

.bcp-root:focus-within {
  border-color: var(--nod8-border-strong);
}

.bcp-root--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.bcp-swatch-wrapper {
  position: relative;
  width: 22px;
  height: 22px;
  cursor: pointer;
  border-radius: calc(var(--nod8-radius-sm) - 2px);
  overflow: hidden;
}

/* The visible color square */
.bcp-swatch {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  border: 1px solid rgba(0, 0, 0, 0.15);
  background-image: conic-gradient(rgba(0,0,0,0.06) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.06) 75%, transparent 75%, transparent);
  background-size: 8px 8px;
}

/* Subtle inner shadow to separate swatch from bg */
.bcp-swatch__overlay {
  display: block;
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}

/* Native input is invisible but covers the swatch label */
.bcp-color-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  padding: 0;
}

.bcp-text-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  font-size: 11px;
  font-family: var(--nod8-font-mono);
  color: var(--nod8-text-primary);
  outline: none;
  padding: 0;
  letter-spacing: 0.02em;
}
.bcp-text-input::placeholder {
  color: var(--nod8-text-muted);
}
</style>
