<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import BaseVariableInput from '@/shared/components/base/BaseVariableInput.vue'
import type { ExpressionItem, TextSelectionRange } from './expressionVariables'
import { insertExpressionToken } from './expressionVariables'
import ExpressionBadges from './ExpressionBadges.vue'
import VariablePicker from './VariablePicker.vue'
import { useVariablePickerPosition } from './useVariablePickerPosition'
import { ownerDocumentOf, useOverlayTarget } from '@/shared/composables/useOverlayTarget'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    placeholder?: string
    error?: string
    hint?: string
    disabled?: boolean
    required?: boolean
    rows?: number
    id?: string
  }>(),
  {
    modelValue: '',
    rows: 4,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const isOpen = ref(false)
const selection = ref<TextSelectionRange | null>(null)
const rootRef = ref<HTMLElement | null>(null)
const overlayTarget = useOverlayTarget(rootRef)
const { pickerRef, pickerStyle, preparePickerPosition, removePickerPositionListeners } =
  useVariablePickerPosition(rootRef)

function rememberSelection(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  if (!target || typeof target.selectionStart !== 'number') return
  selection.value = {
    start: target.selectionStart ?? props.modelValue.length,
    end: target.selectionEnd ?? target.selectionStart ?? props.modelValue.length,
  }
}

function selectItem(item: ExpressionItem) {
  const next = insertExpressionToken(props.modelValue, item.token, selection.value)
  emit('update:modelValue', next)
  isOpen.value = false
  ownerDocumentOf(rootRef.value).removeEventListener('pointerdown', onDocumentPointerDown, true)
  removePickerPositionListeners()
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node
  if (!rootRef.value?.contains(target) && !pickerRef.value?.contains(target)) {
    isOpen.value = false
    removePickerPositionListeners()
  }
}

async function togglePicker() {
  isOpen.value = !isOpen.value
  const ownerDocument = ownerDocumentOf(rootRef.value)
  if (isOpen.value) {
    ownerDocument.addEventListener('pointerdown', onDocumentPointerDown, true)
    await preparePickerPosition()
  } else {
    ownerDocument.removeEventListener('pointerdown', onDocumentPointerDown, true)
    removePickerPositionListeners()
  }
}

onBeforeUnmount(() => {
  ownerDocumentOf(rootRef.value).removeEventListener('pointerdown', onDocumentPointerDown, true)
  removePickerPositionListeners()
})

defineOptions({ inheritAttrs: false })
</script>

<template>
  <div ref="rootRef" class="expression-field" v-bind="$attrs">
    <BaseVariableInput
      :id="id"
      field-type="textarea"
      :label="label"
      :placeholder="placeholder"
      :error="error"
      :hint="hint"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', String($event))"
      @focus="
        (event) => {
          rememberSelection(event)
          $emit('focus', event)
        }
      "
      @blur="$emit('blur', $event)"
      @keyup="rememberSelection"
      @mouseup="rememberSelection"
      @click="rememberSelection"
      @variable-click="togglePicker"
    />

    <ExpressionBadges :value="modelValue" />

    <Teleport :to="overlayTarget">
      <div
        v-if="isOpen"
        ref="pickerRef"
        class="expression-field__popover"
        :style="pickerStyle"
      >
        <VariablePicker @select="selectItem" />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.expression-field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-1);
  min-width: 0;
  width: 100%;
}

.expression-field__popover {
  z-index: 10030;
}
</style>
