<template>
  <div class="web-page-inspector">
    <BaseSegmentedSelect
      :model-value="block.action?.type ?? ''"
      :options="actionOptions"
      aria-label="Action"
      @update:model-value="setActionType(String($event))"
    />
    <BaseInput
      v-if="block.action?.type === 'submitForm'"
      :model-value="block.action.formId"
      label="Form ID"
      @update:model-value="patchAction({ formId: String($event) })"
    />
    <BaseInput
      v-if="block.action?.type === 'triggerWorkflow'"
      :model-value="block.action.workflowId"
      label="Workflow ID"
      @update:model-value="patchAction({ workflowId: String($event) })"
    />
    <BaseInput
      v-if="block.action?.type === 'openUrl'"
      :model-value="block.action.url"
      label="URL"
      :error="urlError"
      @update:model-value="setOpenUrl(String($event))"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSegmentedSelect from '@/shared/components/base/BaseSegmentedSelect.vue'
import type { PageBlock, PageBlockAction } from '../types/page.types.ts'

const props = defineProps<{ block: PageBlock }>()
const emit = defineEmits<{ patch: [patch: Partial<PageBlock>] }>()
const urlError = ref('')

const actionOptions = [
  { label: '', title: 'None', value: '', icon: 'circle-slash' },
  { label: '', title: 'Submit form', value: 'submitForm', icon: 'send' },
  { label: '', title: 'Trigger workflow', value: 'triggerWorkflow', icon: 'workflow' },
  { label: '', title: 'Open URL', value: 'openUrl', icon: 'external-link' },
]

function setActionType(type: string) {
  if (type === 'submitForm') emit('patch', { action: { id: createActionId(), type, formId: '' } })
  else if (type === 'triggerWorkflow') emit('patch', { action: { id: createActionId(), type, workflowId: '' } })
  else if (type === 'openUrl') emit('patch', { action: { id: createActionId(), type, url: '', target: '_blank' } })
  else emit('patch', { action: undefined })
}

function patchAction(payload: Record<string, string>) {
  if (!props.block.action) return
  emit('patch', { action: { ...props.block.action, ...payload } as PageBlockAction })
}

function setOpenUrl(value: string) {
  if (value && !isSafeUrl(value)) {
    urlError.value = 'Invalid URL'
    return
  }
  urlError.value = ''
  patchAction({ url: value })
}

function isSafeUrl(value: string): boolean {
  return value.startsWith('/') || value.startsWith('#') || /^(https?:|mailto:|tel:)/.test(value)
}

function createActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}
</script>
