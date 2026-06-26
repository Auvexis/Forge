<template>
  <div
    class="web-page-assets-panel"
    @dragover.prevent
    @drop.prevent="dropUploadAssets"
  >
    <div class="web-page-assets-panel__header">
      <div>
        <h4>Assets</h4>
        <span>{{ assetFiles.length }} files</span>
      </div>
      <BaseButton variant="outline" size="sm" icon-left="image-plus" @click="assetInput?.click()">
        Upload
      </BaseButton>
    </div>

    <div v-if="uploadingAssets.length" class="web-page-assets-panel__upload-preview">
      <article v-for="asset in uploadingAssets" :key="asset.name">
        <span>{{ asset.name }}</span>
        <span class="web-page-assets-panel__loading-bar" />
      </article>
    </div>

    <div v-if="assetFiles.length" class="web-page-assets-panel__grid">
      <article
        v-for="asset in assetFiles"
        :key="asset.path"
        class="web-page-assets-panel__card"
        draggable="true"
        @dragstart="startAssetDrag($event, asset)"
      >
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

    <input ref="assetInput" type="file" accept="image/*,font/*,.ttf,.otf,.woff,.woff2" multiple @change="uploadAsset" />
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
const uploadingAssets = ref<Array<{ name: string }>>([])
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
  uploadFiles((event.target as HTMLInputElement).files)
  if (assetInput.value) assetInput.value.value = ''
}

function dropUploadAssets(event: DragEvent) {
  uploadFiles(event.dataTransfer?.files)
}

function uploadFiles(files: FileList | null | undefined) {
  const list = Array.from(files ?? [])
  uploadingAssets.value = list.map((file) => ({ name: file.name }))
  for (const file of list) emit('upload-asset', file)
  window.setTimeout(() => {
    uploadingAssets.value = []
  }, 900)
}

function startAssetDrag(event: DragEvent, asset: SiteFile) {
  const path = asset.url ?? asset.path
  event.dataTransfer?.setData('application/x-sailor-page-asset', path)
  event.dataTransfer?.setData('text/plain', path)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    setDragImage(event, assetName(asset.path))
  }
}

function setDragImage(event: DragEvent, label: string) {
  if (!event.dataTransfer) return
  const preview = document.createElement('div')
  preview.className = 'web-page-toolbox-drag-preview web-page-asset-drag-preview'
  preview.textContent = label
  document.body.appendChild(preview)
  event.dataTransfer.setDragImage(preview, 16, 16)
  window.setTimeout(() => preview.remove(), 0)
}
</script>
