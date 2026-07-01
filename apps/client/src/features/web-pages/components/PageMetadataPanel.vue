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
        hint="File name for this page."
        @update:model-value="patchField('slug', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>URL</span>
      <BaseInput
        :model-value="page.publicPath ?? ''"
        placeholder="/meusite/signup"
        hint="Public path. Use / for nested routes."
        @update:model-value="patchField('publicPath', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Meta title</span>
      <BaseInput
        :model-value="page.metaTitle ?? ''"
        @update:model-value="patchField('metaTitle', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Meta description</span>
      <BaseInput
        :model-value="page.metaDescription ?? ''"
        @update:model-value="patchField('metaDescription', $event)"
      />
    </label>
    <label class="web-page-style-row">
      <span>Favicon</span>
      <BaseInput
        :model-value="page.faviconUrl ?? ''"
        placeholder="/sites/site_id/assets/favicon.png"
        @update:model-value="patchField('faviconUrl', $event)"
        @drop.prevent="patchDroppedAsset($event, 'faviconUrl')"
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

function patchField(key: 'title' | 'slug' | 'publicPath' | 'metaTitle' | 'metaDescription' | 'faviconUrl', value: string | boolean) {
  emit('patch', { [key]: String(value) })
}

function patchDroppedAsset(event: DragEvent, key: 'faviconUrl') {
  const path = event.dataTransfer?.getData('application/x-sailor-page-asset')
    || event.dataTransfer?.getData('text/plain')
    || ''
  if (path) patchField(key, path)
}
</script>
