<template>
  <label
    class="base-switch-wrapper"
    :class="{ 'base-switch-wrapper--disabled': disabled }"
    v-bind="rootAttrs"
  >
    <div class="base-switch" :class="{ 'base-switch--checked': modelValue }">
      <input
        type="checkbox"
        class="base-switch__input"
        :checked="modelValue"
        :disabled="disabled"
        @change="onChange"
        v-bind="inputAttrs"
      />
      <div class="base-switch__track"></div>
      <div class="base-switch__thumb"></div>
    </div>

    <span v-if="label || $slots.default" class="base-switch__label">
      <slot>{{ label }}</slot>
    </span>
  </label>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const attrs = useAttrs()
const rootAttrs = computed(() => ({
  class: attrs.class,
  style: attrs.style,
  title: typeof attrs.title === 'string' ? attrs.title : undefined,
}))
const inputAttrs = computed(() => {
  const { class: _class, style: _style, title: _title, ...rest } = attrs
  return rest
})

const onChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}

defineOptions({ inheritAttrs: false })
</script>

<style scoped>
.base-switch-wrapper {
  display: inline-flex;
  align-items: center;
  gap: var(--fabric-space-2);
  cursor: pointer;
  user-select: none;
}

.base-switch-wrapper--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-switch {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.base-switch__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  margin: 0;
}

.base-switch__track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: var(--fabric-base-switch-track-radius);
  background-color: var(--fabric-base-switch-bg-muted);
  transition: background-color var(--fabric-duration-fast) var(--fabric-ease-standard);
  border: 1px solid var(--fabric-base-switch-border-strong);
}

.base-switch__thumb {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: var(--fabric-base-switch-thumb-radius);
  background-color: var(--fabric-base-switch-text-inverse);
  transition: transform var(--fabric-duration-fast) var(--fabric-ease-standard);
  transform: translateY(-50%);
  box-shadow: var(--fabric-base-switch-shadow-sm);
}

/* Checked State */
.base-switch--checked .base-switch__track {
  background-color: var(--fabric-base-switch-button-primary-bg);
  border-color: transparent;
}

.base-switch--checked .base-switch__thumb {
  transform: translate(16px, -50%);
}

/* Focus State */
.base-switch__input:focus-visible + .base-switch__track {
  outline: 2px solid var(--fabric-base-switch-border-strong);
  outline-offset: 2px;
}

.base-switch__label {
  font-size: var(--fabric-text-sm);
  color: var(--fabric-base-switch-text-primary);
  line-height: 1.2;
}
</style>
