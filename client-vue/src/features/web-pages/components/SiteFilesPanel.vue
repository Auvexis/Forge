<template>
  <div class="web-page-site-files">
    <div class="web-page-site-files__actions">
      <button type="button" @click="$emit('create-file', 'css/site.css')">css/site.css</button>
      <button type="button" @click="$emit('create-file', 'js/site.js')">js/site.js</button>
    </div>

    <div class="web-page-site-files__section">
      <span>pages/</span>
      <button
        v-for="page in pages"
        :key="page.id"
        type="button"
        class="web-page-site-files__item"
        @click="$emit('open-file', pageFile(page))"
      >
        {{ pageFile(page).path }}
      </button>
    </div>

    <div class="web-page-site-files__section">
      <span>assets/</span>
      <button
        v-for="file in assetFiles"
        :key="file.path"
        type="button"
        class="web-page-site-files__item"
        @click="$emit('open-file', file)"
      >
        {{ file.path }}
      </button>
    </div>

    <div class="web-page-site-files__section">
      <span>css/</span>
      <button
        v-for="file in cssFiles"
        :key="file.path"
        type="button"
        class="web-page-site-files__item"
        @click="$emit('open-file', file)"
      >
        {{ file.path }}
      </button>
    </div>

    <div class="web-page-site-files__section">
      <span>js/</span>
      <button
        v-for="file in jsFiles"
        :key="file.path"
        type="button"
        class="web-page-site-files__item"
        @click="$emit('open-file', file)"
      >
        {{ file.path }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SailorPageSummary, SailorSite, SiteFile } from '../types/page.types.ts'

const props = defineProps<{
  site: SailorSite | null
  pages: SailorPageSummary[]
}>()

defineEmits<{
  'open-file': [file: SiteFile]
  'create-file': [path: string]
}>()

const files = computed(() => props.site?.files ?? [])
const assetFiles = computed(() => files.value.filter((file) => file.path.startsWith('assets/') && file.kind !== 'folder'))
const cssFiles = computed(() => ensureDefaultFile(files.value, 'css/site.css'))
const jsFiles = computed(() => ensureDefaultFile(files.value, 'js/site.js'))

function pageFile(page: SailorPageSummary): SiteFile {
  return {
    path: `pages/${page.slug}.html`,
    kind: 'file',
    content: '',
    mimeType: 'text/html',
    updatedAt: page.updatedAt,
  }
}

function ensureDefaultFile(files: SiteFile[], path: string): SiteFile[] {
  const ownFiles = files.filter((file) => file.path.startsWith(path.split('/')[0] + '/') && file.kind !== 'folder')
  if (ownFiles.some((file) => file.path === path)) return ownFiles
  return [{ path, kind: 'file', content: '', updatedAt: '' }, ...ownFiles]
}
</script>
