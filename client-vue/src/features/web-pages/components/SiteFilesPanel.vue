<template>
  <div class="web-page-site-files">
    <div class="web-page-site-files__tree web-page-site-files__children">
      <button
        v-for="node in visibleNodes"
        :key="node.path"
        type="button"
        class="web-page-site-files__item"
        :class="[
          node.file.kind === 'folder' ? 'web-page-site-files__item--folder' : 'web-page-site-files__item--file',
          { 'web-page-site-files__item--root': node.depth === 0 },
        ]"
        :style="{ '--depth': String(node.depth) }"
        @click="node.file.kind === 'folder' ? toggleFolder(node.path) : $emit('open-file', node.file)"
      >
        <span v-if="node.depth > 0" class="web-page-site-files__guide" />
        <LucideIcon
          v-if="node.file.kind === 'folder'"
          class="web-page-site-files__chevron"
          :name="isFolderExpanded(node.path) ? 'chevron-down' : 'chevron-right'"
          :size="13"
        />
        <span v-else class="web-page-site-files__chevron" />
        <LucideIcon class="web-page-site-files__icon" :name="folderIcon(node.file) || fileIcon(node.file)" :size="14" />
        <span class="web-page-site-files__name">{{ node.name }}</span>
        <span v-if="node.file.kind === 'folder'" class="web-page-site-files__folder-actions" @click.stop>
          <button type="button" title="New file" @click="openCreationDialog('file', node.path)">
            <LucideIcon name="file-plus-2" :size="13" />
          </button>
          <button type="button" title="New folder" @click="openCreationDialog('folder', node.path)">
            <LucideIcon name="folder-plus" :size="13" />
          </button>
          <button type="button" title="Upload image" @click="uploadAssetFromFolder(node.path)">
            <LucideIcon name="image-plus" :size="13" />
          </button>
        </span>
        <span v-if="canDeleteFile(node.file)" class="web-page-site-files__file-actions" @click.stop>
          <button type="button" title="Delete file" @click="emit('delete-file', node.path)">
            <LucideIcon name="trash-2" :size="13" />
          </button>
        </span>
      </button>
    </div>

    <input ref="assetInput" type="file" accept="image/*" @change="uploadAsset" />

    <BaseModal :is-open="creationDialog.isOpen" max-width="420px" height="auto" @close="closeCreationDialog">
      <form class="web-page-site-files-dialog" @submit.prevent="submitCreationDialog">
        <header class="web-page-site-files-dialog__header">
          <strong>{{ creationDialog.kind === 'file' ? 'New file' : 'New folder' }}</strong>
          <BaseButton variant="ghost" size="icon" icon-left="x" type="button" @click="closeCreationDialog" />
        </header>
        <div class="web-page-site-files-dialog__body">
          <BaseInput
            v-model="creationDialog.path"
            :label="creationDialog.kind === 'file' ? 'File path' : 'Folder path'"
            :placeholder="creationDialog.kind === 'file' ? 'css/custom.css' : 'assets/images'"
            autofocus
          />
        </div>
        <footer class="web-page-site-files-dialog__footer">
          <BaseButton variant="ghost" type="button" @click="closeCreationDialog">Cancel</BaseButton>
          <BaseButton variant="primary" type="submit">Create</BaseButton>
        </footer>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { SailorPageSummary, SailorSite, SiteFile } from '../types/page.types.ts'

type CreationKind = 'file' | 'folder'

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
  'delete-file': [path: string]
}>()

const assetInput = ref<HTMLInputElement | null>(null)
const expandedFolders = ref(new Set(['pages', 'assets', 'css', 'js']))
const creationDialog = ref({
  isOpen: false,
  kind: 'file' as CreationKind,
  parentPath: '',
  path: '',
})

const files = computed(() => [
  ...defaultFolders(),
  ...pageFiles(),
  ...defaultEditableFiles(),
  ...(props.site?.files ?? []),
])
const tree = computed(() => buildTree(files.value))
const visibleNodes = computed(() => flattenVisibleTree(tree.value))

function openCreationDialog(kind: CreationKind, parentPath = kind === 'file' ? 'pages' : 'assets') {
  creationDialog.value = {
    isOpen: true,
    kind,
    parentPath,
    path: kind === 'file' ? defaultFilePath(parentPath) : `${parentPath}/new-folder`,
  }
}

function closeCreationDialog() {
  creationDialog.value.isOpen = false
}

function submitCreationDialog() {
  const path = normalizeProjectPath(creationDialog.value.path)
  if (!path) return
  if (creationDialog.value.kind === 'file') emit('create-file', path)
  else emit('create-folder', path)
  expandParentFolders(path)
  closeCreationDialog()
}

function uploadAssetFromFolder(_folderPath: string) {
  assetInput.value?.click()
}

function uploadAsset(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) emit('upload-asset', file)
  if (assetInput.value) assetInput.value.value = ''
}

function toggleFolder(path: string) {
  const folders = new Set(expandedFolders.value)
  if (folders.has(path)) folders.delete(path)
  else folders.add(path)
  expandedFolders.value = folders
}

function isFolderExpanded(path: string) {
  return expandedFolders.value.has(path)
}

function canDeleteFile(file: SiteFile) {
  if (file.kind === 'folder') return false
  return props.site?.files.some((item) => item.path === file.path && item.kind !== 'folder') ?? false
}

function defaultFolders(): SiteFile[] {
  return ['pages', 'assets'].map((path) => ({ path, kind: 'folder', updatedAt: '' }))
}

function pageFiles(): SiteFile[] {
  return props.pages.flatMap((page) => [
    {
      path: `pages/${page.slug}`,
      kind: 'folder' as const,
      content: '',
      updatedAt: page.updatedAt,
    },
    {
      path: `pages/${page.slug}/index.html`,
      kind: 'file' as const,
      content: '',
      mimeType: 'text/html',
      updatedAt: page.updatedAt,
    },
    {
      path: `pages/${page.slug}/${page.slug}.css`,
      kind: 'file' as const,
      content: '',
      mimeType: 'text/css',
      updatedAt: page.updatedAt,
    },
    {
      path: `pages/${page.slug}/${page.slug}.js`,
      kind: 'file' as const,
      content: '',
      mimeType: 'text/javascript',
      updatedAt: page.updatedAt,
    },
  ])
}

function defaultEditableFiles(): SiteFile[] {
  return []
}

function buildTree(siteFiles: SiteFile[]): FileNodeModel[] {
  const nodes = new Map<string, FileNodeModel>()
  for (const file of dedupeFiles(siteFiles)) {
    const parts = file.path.split('/').filter(Boolean)
    let currentPath = ''
    for (let index = 0; index < parts.length; index += 1) {
      currentPath = currentPath ? `${currentPath}/${parts[index]}` : parts[index]!
      const isLeaf = index === parts.length - 1
      if (!nodes.has(currentPath)) {
        nodes.set(currentPath, {
          path: currentPath,
          name: parts[index]!,
          file: isLeaf ? file : { path: currentPath, kind: 'folder', updatedAt: '' },
          children: [],
        })
      }
    }
  }

  const roots: FileNodeModel[] = []
  for (const node of nodes.values()) {
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    const parent = nodes.get(parentPath)
    if (parent && !parent.children.some((child) => child.path === node.path)) parent.children.push(node)
    else if (!parent) roots.push(node)
  }
  return sortNodes(roots)
}

function sortNodes(nodes: FileNodeModel[]): FileNodeModel[] {
  return nodes
    .sort((a, b) => Number(b.file.kind === 'folder') - Number(a.file.kind === 'folder') || a.name.localeCompare(b.name))
    .map((node) => ({ ...node, children: sortNodes(node.children) }))
}

function flattenVisibleTree(nodes: FileNodeModel[], depth = 0): FlatFileNode[] {
  return nodes.flatMap((node) => {
    const current = { ...node, depth }
    if (node.file.kind !== 'folder' || !isFolderExpanded(node.path)) return [current]
    return [current, ...flattenVisibleTree(node.children, depth + 1)]
  })
}

function dedupeFiles(siteFiles: SiteFile[]): SiteFile[] {
  return [...new Map(siteFiles.map((file) => [file.path, file])).values()]
}

function expandParentFolders(path: string) {
  const folders = new Set(expandedFolders.value)
  const parts = path.split('/').filter(Boolean)
  for (let index = 1; index < parts.length; index += 1) {
    folders.add(parts.slice(0, index).join('/'))
  }
  expandedFolders.value = folders
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

function defaultFilePath(parentPath: string): string {
  if (/^pages\/[^/]+$/.test(parentPath)) return `${parentPath}/style.css`
  return `${parentPath}/custom.css`
}
</script>
