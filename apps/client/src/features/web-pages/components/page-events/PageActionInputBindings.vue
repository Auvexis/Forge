<template>
  <div class="web-page-event-inputs">
    <div class="web-page-events-subheader">
      <LucideIcon name="log-in" :size="12" />
      <strong>Inputs</strong>
    </div>
    <p v-if="inputs.length === 0" class="web-page-event-empty">This trigger has no inputs.</p>
    <div v-for="field in inputs" :key="field.key" class="web-page-event-input-row">
      <div>
        <strong>{{ field.label }}</strong>
        <span>{{ field.type }}</span>
      </div>
      <PageElementTargetChip
        v-if="bindingFor(field.key)"
        :label="bindingFor(field.key)?.target?.label ?? bindingFor(field.key)?.scopePath ?? field.key"
        @clear="$emit('clearInput', field.key)"
      />
      <span v-else class="web-page-event-muted">Manual or default</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PageActionInputBinding, PageActionInputField } from '@/core/page-actions'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import PageElementTargetChip from './PageElementTargetChip.vue'

const props = defineProps<{
  inputs: PageActionInputField[]
  bindings: Record<string, PageActionInputBinding>
}>()

defineEmits<{
  clearInput: [inputKey: string]
}>()

function bindingFor(inputKey: string) {
  return props.bindings[inputKey] ?? null
}
</script>
