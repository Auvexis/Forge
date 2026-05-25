<template>
  <div class="web-page-site-files">
    <div class="web-page-site-files__actions">
      <button type="button" @click="createFile">
        <LucideIcon name="file-plus-2" :size="14" />
        <span>New file</span>
      </button>
      <button type="button" @click="createFolder">
        <LucideIcon name="folder-plus" :size="14" />
        <span>New folder</span>
      </button>
      <button type="button" @click="assetInput?.click()">
        <LucideIcon name="image-plus" :size="14" />
        <span>Upload image</span>
      </button>
      <input ref="assetInput" type="file" accept="image/*" @change="uploadAsset" />
    </div>

    <div class="web-page-site-files__tree">
      <div class="web-page-site-files__children">
        <button
          v-for="node in flatNodes"
          :key="node.path"
          type="button"
          class="web-page-site-files__item"
          :class="node.file.kind === 'folder' ? 'web-page-site-files__item--folder' : 'web-page-site-files__item--file'"
          :style="{ '--depth': String(node.depth) }"
          :disabled="node.file.kind === 'folder'"
          @click="node.file.kind !== 'folder' && $emit('open-file', node.file)"
        >
          <span class="web-page-site-files__guide" />
          <LucideIcon :name="folderIcon(node.file) || fileIcon(node.file)" :size="14" />
          <span>{{ node.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { SailorPageSummary, SailorSite, SiteFile } from '../types/page.types.ts'

interface FileNodeModel {
  path: string
  name: string
  file: SiteFile
  children: FileNodeModel[]
}

interface FlatFileNode extends FileNodeModel {
  depth: number
}

const props = defineProps<{
  site: SailorSite | null
  pages: SailorPageSummary[]
}>()

const emit = defineEmits<{
  'open-file': [file: SiteFile]
  'create-file': [path: string]
  'create-folder': [path: string]
  'upload-asset': [file: File]
}>()

const assetInput = ref<HTMLInputElement | null>(null)
const files = computed(() => [
  ...defaultFolders(),
  ...pageFiles(),
  ...defaultEditableFiles(props.site?.files ?? []),
  ...(props.site?.files ?? []),
])
const tree = computed(() => buildTree(files.value))
const flatNodes = computed(() => flattenTree(tree.value))

function createFile() {
  const path = window.prompt('File path', 'css/custom.css')?.trim()
  if (!path) return
  emit('create-file', normalizeProjectPath(path))
}

function createFolder() {
  const path = window.prompt('Folder path', 'assets/images')?.trim()
  if (!path) return
  emit('create-folder', normalizeProjectPath(path))
}

function uploadAsset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('upload-asset', file)
  if (assetInput.value) assetInput.value.value = ''
}

function defaultFolders(): SiteFile[] {
  return ['pages', 'assets', 'css', 'js'].map((path) => ({ path, kind: 'folder', updatedAt: '' }))
}

function pageFiles(): SiteFile[] {
  return props.pages.map((page) => ({
    path: `pages/${page.slug}.html`,
    kind: 'file',
    content: '',
    mimeType: 'text/html',
    updatedAt: page.updatedAt,
  }))
}

function defaultEditableFiles(files: SiteFile[]): SiteFile[] {
  return ['css/site.css', 'js/site.js']
    .filter((path) => !files.some((file) => file.path === path))
    .map((path) => ({ path, kind: 'file', content: '', updatedAt: '' }))
}

function buildTree(siteFiles: SiteFile[]): FileNodeModel[] {
  const nodes = new Map<string, FileNodeModel>()
  for (const file of dedupeFiles(siteFiles)) {
    const parts = file.path.split('/').filter(Boolean)
    let currentPath = ''
    for (let index = 0; index < parts.length; index += 1) {
      currentPath = currentPath ? `${currentPath}/${parts[index]}` : parts[index]!
      if (!nodes.has(currentPath)) {
        nodes.set(currentPath, {
          path: currentPath,
          name: parts[index]!,
          file: index === parts.length - 1 ? file : { path: currentPath, kind: 'folder', updatedAt: '' },
          children: [],
        })
      }
    }
  }

  const roots: FileNodeModel[] = []
  for (const node of nodes.values()) {
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    const parent = nodes.get(parentPath)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return sortNodes(roots)
}

function sortNodes(nodes: FileNodeModel[]): FileNodeModel[] {
  return nodes
    .sort((a, b) => Number(b.file.kind === 'folder') - Number(a.file.kind === 'folder') || a.name.localeCompare(b.name))
    .map((node) => ({ ...node, children: sortNodes(node.children) }))
}

function flattenTree(nodes: FileNodeModel[], depth = 0): FlatFileNode[] {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children, depth + 1),
  ])
}

function dedupeFiles(siteFiles: SiteFile[]): SiteFile[] {
  return [...new Map(siteFiles.map((file) => [file.path, file])).values()]
}

function folderIcon(file: SiteFile): string {
  return file.kind === 'folder' ? 'folder' : ''
}

function fileIcon(file: SiteFile): string {
  if (file.kind === 'asset' || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.path)) return 'image'
  if (file.path.endsWith('.css')) return 'braces'
  if (file.path.endsWith('.js')) return 'file-code-2'
  if (file.path.endsWith('.html')) return 'file-code'
  return 'file'
}

function normalizeProjectPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/g, '')
}
</script>
