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
    <div v-if="block.tag === 'image'" class="web-page-image-upload">
      <BaseButton variant="outline" size="sm" icon-left="image-plus" @click="imageInput?.click()">
        Upload image
      </BaseButton>
      <input ref="imageInput" type="file" accept="image/*" @change="uploadImage" />
    </div>
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
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import type { PageBlock } from '../types/page.types.ts'

const props = defineProps<{ block: PageBlock }>()
const emit = defineEmits<{
  patch: [patch: Partial<PageBlock>]
  'upload-image': [file: File]
}>()
const urlError = ref('')
const imageInput = ref<HTMLInputElement | null>(null)

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

function uploadImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('upload-image', file)
  if (imageInput.value) imageInput.value.value = ''
}
</script>
