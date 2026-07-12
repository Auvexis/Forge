<template>
  <button
    type="button"
    class="base-file-dropzone"
    :class="{ 'base-file-dropzone--dragging': isDragging }"
    :disabled="disabled"
    @click="openPicker"
    @dragenter.prevent="setDragging(true)"
    @dragover.prevent="setDragging(true)"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <LucideIcon :name="icon" :size="iconSize" />
    <span>{{ selectedLabel || title }}</span>
    <small>{{ description }}</small>
    <input
      ref="inputRef"
      class="base-file-dropzone__input"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :webkitdirectory="directory ? '' : undefined"
      :directory="directory ? '' : undefined"
      @change="handleInputChange"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

export interface BaseFileDropzoneEntry {
  file: File
  relativePath: string
}

const props = withDefaults(defineProps<{
  accept?: string
  description?: string
  directory?: boolean
  disabled?: boolean
  icon?: string
  iconSize?: number
  modelValue?: File | null
  multiple?: boolean
  title?: string
}>(), {
  accept: '',
  description: 'Choose a file or drag it here',
  directory: false,
  disabled: false,
  icon: 'folder-up',
  iconSize: 20,
  modelValue: null,
  multiple: false,
  title: 'Drop file here',
})

const emit = defineEmits<{
  'update:modelValue': [file: File | null]
  select: [entries: BaseFileDropzoneEntry[]]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const selectedLabel = computed(() => props.modelValue?.name ?? '')

function openPicker() {
  if (props.disabled) return
  inputRef.value?.click()
}

function setDragging(value: boolean) {
  if (props.disabled) return
  isDragging.value = value
}

function handleDragLeave(event: DragEvent) {
  const related = event.relatedTarget
  const currentTarget = event.currentTarget as HTMLElement | null
  if (related instanceof Node && currentTarget?.contains(related)) return
  isDragging.value = false
}

function handleInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  acceptEntries(filesFromFileList(input.files))
  input.value = ''
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (props.disabled) return
  acceptEntries(await filesFromDataTransfer(event.dataTransfer))
}

function acceptEntries(entries: BaseFileDropzoneEntry[]) {
  const nextEntries = props.multiple || props.directory ? entries : entries.slice(0, 1)
  emit('update:modelValue', nextEntries[0]?.file ?? null)
  emit('select', nextEntries)
}

function filesFromFileList(fileList: FileList | null): BaseFileDropzoneEntry[] {
  if (!fileList) return []
  return Array.from(fileList).map((file) => ({
    file,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }))
}

async function filesFromDataTransfer(dataTransfer: DataTransfer | null): Promise<BaseFileDropzoneEntry[]> {
  if (!dataTransfer) return []
  const itemEntries = Array.from(dataTransfer.items ?? [])
    .map((item) => (item as DataTransferItem & { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry?.())
    .filter(Boolean)

  if (itemEntries.length === 0) return filesFromFileList(dataTransfer.files)
  const nestedFiles = await Promise.all(itemEntries.map((entry) => collectDroppedEntryFiles(entry, '')))
  return nestedFiles.flat()
}

async function collectDroppedEntryFiles(entry: unknown, parentPath: string): Promise<BaseFileDropzoneEntry[]> {
  const item = entry as {
    isFile?: boolean
    isDirectory?: boolean
    name: string
    file?: (callback: (file: File) => void) => void
    createReader?: () => { readEntries: (callback: (entries: unknown[]) => void) => void }
  }
  const relativePath = parentPath ? `${parentPath}/${item.name}` : item.name

  if (item.isFile && item.file) {
    const file = await new Promise<File>((resolve) => item.file?.(resolve))
    return [{ file, relativePath }]
  }

  if (!item.isDirectory || !item.createReader) return []
  const reader = item.createReader()
  const entries = await new Promise<unknown[]>((resolve) => reader.readEntries(resolve))
  const nestedFiles = await Promise.all(entries.map((childEntry) => collectDroppedEntryFiles(childEntry, relativePath)))
  return nestedFiles.flat()
}
</script>

<style scoped>
.base-file-dropzone {
  display: grid;
  place-items: center;
  gap: var(--fabric-space-1);
  min-height: 108px;
  width: 100%;
  padding: var(--fabric-space-4);
  border: 1px dashed var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-muted);
  color: var(--fabric-text-secondary);
  font: inherit;
  cursor: pointer;
  transition:
    border-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    background-color var(--fabric-duration-fast) var(--fabric-ease-standard),
    color var(--fabric-duration-fast) var(--fabric-ease-standard);
}

.base-file-dropzone:hover,
.base-file-dropzone--dragging {
  border-color: var(--fabric-input-border-focus);
  background: var(--fabric-bg-elevated);
  color: var(--fabric-text-primary);
}

.base-file-dropzone:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.base-file-dropzone span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-medium);
}

.base-file-dropzone small {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
}

.base-file-dropzone__input {
  display: none;
}
</style>
