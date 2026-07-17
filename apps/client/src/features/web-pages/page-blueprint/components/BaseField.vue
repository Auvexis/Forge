<template>
  <div class="web-page-blueprint-field">
    <div class="web-page-blueprint-field__left">
      <BasePickWhipButton
        v-if="input"
        :node-id="nodeId"
        :field-id="fieldId"
        side="input"
        :title="`Bind input for ${label}`"
        :connected="inputConnected"
        :disconnectable="inputConnected"
        @release="$emit('pickInput', $event)"
      />
      <span class="web-page-blueprint-field__label">
        <strong>{{ label }}</strong>
        <small v-if="type">{{ type }}</small>
      </span>
    </div>

    <div class="web-page-blueprint-field__right" :class="{ 'web-page-blueprint-field__right--inline': !hasValue }">
      <BaseFieldModeToggle
        v-if="mode && hasValue"
        :model-value="mode"
        @update:model-value="$emit('update:mode', $event)"
      />
      <div v-if="hasValue || output" class="web-page-blueprint-field__value-row">
        <BaseFieldModeToggle
          v-if="mode && !hasValue"
          :model-value="mode"
          @update:model-value="$emit('update:mode', $event)"
        />
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
          :node-id="nodeId"
          :field-id="fieldId"
          side="output"
          :title="`Connect ${label}`"
          :connected="outputConnected"
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
  nodeId?: string
  fieldId?: string
  type?: string
  value?: string
  placeholder?: string
  input?: boolean
  output?: boolean
  inputConnected?: boolean
  outputConnected?: boolean
  mode?: 'single' | 'multiple'
}>(), {
  type: '',
  nodeId: '',
  fieldId: '',
  value: undefined,
  placeholder: '',
  input: false,
  output: false,
  inputConnected: false,
  outputConnected: false,
  mode: undefined,
})

defineEmits<{
  pickInput: [event: PointerEvent]
  pickOutput: [event: PointerEvent]
  'update:mode': [mode: 'single' | 'multiple']
}>()

const hasValue = computed(() => props.value !== undefined)
</script>
