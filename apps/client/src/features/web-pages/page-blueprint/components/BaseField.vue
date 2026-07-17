<template>
  <div class="web-page-blueprint-field">
    <div class="web-page-blueprint-field__left">
      <BasePickWhipButton
        v-if="input"
        icon="radio-receiver"
        :title="`Bind input for ${label}`"
        @pick="$emit('pickInput', $event)"
      />
      <span class="web-page-blueprint-field__label">
        <strong>{{ label }}</strong>
        <small v-if="type">{{ type }}</small>
      </span>
    </div>

    <div class="web-page-blueprint-field__right">
      <BaseFieldModeToggle
        v-if="mode"
        :model-value="mode"
        @update:model-value="$emit('update:mode', $event)"
      />
      <div v-if="hasValue || output" class="web-page-blueprint-field__value-row">
        <input
          v-if="hasValue"
          data-base-canvas-no-drag
          :value="value"
          :placeholder="placeholder"
          readonly
          aria-label="Field value"
        />
        <BasePickWhipButton
          v-if="output"
          :title="`Connect ${label}`"
          @pick="$emit('pickOutput', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseFieldModeToggle from './BaseFieldModeToggle.vue'
import BasePickWhipButton from './BasePickWhipButton.vue'

const props = withDefaults(defineProps<{
  label: string
  type?: string
  value?: string
  placeholder?: string
  input?: boolean
  output?: boolean
  mode?: 'single' | 'multiple'
}>(), {
  type: '',
  value: undefined,
  placeholder: '',
  input: false,
  output: false,
  mode: undefined,
})

defineEmits<{
  pickInput: [event: PointerEvent]
  pickOutput: [event: PointerEvent]
  'update:mode': [mode: 'single' | 'multiple']
}>()

const hasValue = computed(() => props.value !== undefined)
</script>
