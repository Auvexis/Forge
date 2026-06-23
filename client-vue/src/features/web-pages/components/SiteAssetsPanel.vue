<template>
  <div class="web-page-assets-panel">
    <div class="web-page-assets-panel__header">
      <div>
        <h4>Assets</h4>
        <span>{{ assetFiles.length }} files</span>
      </div>
      <BaseButton variant="outline" size="sm" icon-left="image-plus" @click="assetInput?.click()">
        Upload
      </BaseButton>
    </div>

    <div v-if="assetFiles.length" class="web-page-assets-panel__grid">
      <article v-for="asset in assetFiles" :key="asset.path" class="web-page-assets-panel__card">
        <div class="web-page-assets-panel__thumb">
          <img v-if="thumbnailUrl(asset)" :src="thumbnailUrl(asset)" :alt="asset.path" />
          <LucideIcon v-else name="file" :size="20" />
        </div>
        <div class="web-page-assets-panel__meta">
          <strong>{{ assetName(asset.path) }}</strong>
          <span>{{ formatAssetSize(asset.size) }}</span>
          <small>{{ asset.path }}</small>
        </div>
        <button type="button" title="Delete asset" @click="$emit('delete-file', asset.path)">
          <LucideIcon name="trash-2" :size="14" />
        </button>
      </article>
    </div>

    <div v-else class="web-page-assets-panel__empty">
      Upload images to build a reusable project library.
    </div>

    <input ref="assetInput" type="file" accept="image/*" @change="uploadAsset" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { API_BASE_URL } from '@/core/constants/app.ts'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { SailorSite, SiteFile } from '../types/page.types.ts'

const props = defineProps<{ site: SailorSite | null }>()

const emit = defineEmits<{
  'upload-asset': [file: File]
  'delete-file': [path: string]
}>()
const assetInput = ref<HTMLInputElement | null>(null)
const assetFiles = computed(() => (props.site?.files ?? []).filter((file) => file.kind === 'asset' || file.path.startsWith('assets/')))

function thumbnailUrl(asset: SiteFile) {
  if (asset.url?.startsWith('/sites/')) return `${API_BASE_URL}${asset.url}`
  if (asset.url) return asset.url
  return asset.path.startsWith('assets/') ? `${API_BASE_URL}/${asset.path}` : ''
}

function assetName(path: string) {
  return path.split('/').filter(Boolean).at(-1) ?? path
}

function formatAssetSize(size: number | undefined) {
  if (!size) return 'Unknown size'
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function uploadAsset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('upload-asset', file)
  if (assetInput.value) assetInput.value.value = ''
}
</script>
