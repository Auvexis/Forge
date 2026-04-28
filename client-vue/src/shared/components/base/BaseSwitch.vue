<template>
  <label class="base-switch-wrapper" :class="{ 'base-switch-wrapper--disabled': disabled }">
    <div class="base-switch" :class="{ 'base-switch--checked': modelValue }">
      <input
        type="checkbox"
        class="base-switch__input"
        :checked="modelValue"
        :disabled="disabled"
        @change="onChange"
        v-bind="$attrs"
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
  gap: var(--nod8-space-2);
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
  border-radius: var(--nod8-radius-full);
  background-color: var(--nod8-bg-muted);
  transition: background-color var(--nod8-duration-fast) var(--nod8-ease-standard);
  border: 1px solid var(--nod8-border-strong);
}

.base-switch__thumb {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background-color: #ffffff;
  transition: transform var(--nod8-duration-fast) var(--nod8-ease-standard);
  transform: translateY(-50%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Checked State */
.base-switch--checked .base-switch__track {
  background-color: var(--nod8-accent);
  border-color: transparent;
}

.base-switch--checked .base-switch__thumb {
  transform: translate(16px, -50%);
}

/* Focus State */
.base-switch__input:focus-visible + .base-switch__track {
  outline: 2px solid var(--nod8-accent);
  outline-offset: 2px;
}

.base-switch__label {
  font-size: var(--nod8-text-sm);
  color: var(--nod8-text-primary);
  line-height: 1.2;
}
</style>
