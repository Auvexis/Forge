<template>
  <div class="web-page-inspector web-page-style-panel">
    <h4>Page</h4>
    <label class="web-page-style-row">
      <span>Title</span>
      <BaseInput
        :model-value="page.title"
        @update:model-value="patchField('title', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Slug</span>
      <BaseInput
        :model-value="page.slug"
        @update:model-value="patchField('slug', $event)"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import BaseInput from '@/shared/components/base/BaseInput.vue'
import type { SailorPage } from '../types/page.types.ts'

defineProps<{
  page: SailorPage
}>()

const emit = defineEmits<{
  patch: [patch: Partial<SailorPage>]
}>()

function patchField(key: 'title' | 'slug', value: string | boolean) {
  emit('patch', { [key]: String(value) })
}
</script>
