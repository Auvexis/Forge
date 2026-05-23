<template>
  <div class="web-page-inspector">
    <BaseInput
      v-if="block.tag === 'text' || block.tag === 'button' || block.tag === 'link'"
      :model-value="String(block.props?.text ?? '')"
      label="Text"
      @update:model-value="setProp('text', $event)"
    />
    <BaseInput
      v-if="block.tag === 'image'"
      :model-value="String(block.props?.src ?? '')"
      label="Image URL"
      :error="urlError"
      @update:model-value="setUrlProp('src', String($event))"
    />
    <BaseInput
      v-if="block.tag === 'image'"
      :model-value="String(block.props?.alt ?? '')"
      label="Alt"
      @update:model-value="setProp('alt', $event)"
    />
    <BaseInput
      v-if="block.tag === 'link'"
      :model-value="String(block.props?.href ?? '')"
      label="Link URL"
      :error="urlError"
      @update:model-value="setUrlProp('href', String($event))"
    />
    <BaseInput
      v-if="block.tag === 'input'"
      :model-value="String(block.props?.name ?? '')"
      label="Name"
      @update:model-value="setProp('name', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import type { PageBlock } from '../types/page.types.ts'

const props = defineProps<{ block: PageBlock }>()
const emit = defineEmits<{ patch: [patch: Partial<PageBlock>] }>()
const urlError = ref('')

function setProp(key: string, value: string | boolean) {
  emit('patch', { props: { ...(props.block.props ?? {}), [key]: value } })
}

function setUrlProp(key: string, value: string) {
  if (value && !isSafeUrl(value)) {
    urlError.value = 'Invalid URL'
    return
  }
  urlError.value = ''
  setProp(key, value)
}

function isSafeUrl(value: string): boolean {
  return value.startsWith('/') || value.startsWith('#') || /^(https?:|mailto:|tel:)/.test(value)
}
</script>
