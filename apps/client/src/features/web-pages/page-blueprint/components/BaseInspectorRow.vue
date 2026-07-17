<template>
  <label class="web-page-blueprint-inspector-row">
    <span class="web-page-blueprint-inspector-row__label">{{ label }}</span>
    <input
      v-if="editable && isEditing"
      ref="inputRef"
      class="web-page-blueprint-inspector-row__control"
      :value="value"
      :placeholder="placeholder"
      @input="emit('update:value', ($event.target as HTMLInputElement).value)"
      @keydown.enter="isEditing = false"
      @blur="isEditing = false"
    />
    <code
      v-else
      class="web-page-blueprint-inspector-row__value"
      :class="{ 'web-page-blueprint-inspector-row__value--editable': editable }"
      @dblclick="startEditing"
    >
      {{ value || '-' }}
    </code>
  </label>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'

withDefaults(defineProps<{
  label: string
  value?: string
  placeholder?: string
  editable?: boolean
}>(), {
  value: '',
  placeholder: '',
  editable: false,
})

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isEditing = ref(false)

function startEditing() {
  isEditing.value = true
  void nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}
</script>
