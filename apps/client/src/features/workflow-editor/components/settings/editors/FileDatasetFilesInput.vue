<template>
  <div class="file-dataset-files">
    <div
      v-for="(item, index) in normalizedFiles"
      :key="index"
      class="file-dataset-files__row"
    >
      <div class="file-dataset-files__input">
        <div v-if="typeof item === 'object'" class="file-dataset-files__uploaded editor-input">
          <LucideIcon name="file" :size="14" />
          <span>{{ item.filename }}</span>
        </div>

        <ExpressionInput
          v-else
          :model-value="item"
          placeholder="e.g. {{ trigger.file }}"
          @update:model-value="updateFile(index, $event as string)"
        />

        <input
          :ref="(element) => setFileInput(index, element)"
          type="file"
          hidden
          @change="uploadFile(index, $event)"
        />
        <button
          type="button"
          class="file-dataset-files__button"
          title="Upload static file"
          @click="fileInputs[index]?.click()"
        >
          <LucideIcon name="upload" :size="14" />
        </button>
      </div>

      <button
        type="button"
        class="file-dataset-files__button file-dataset-files__button--remove"
        title="Remove file"
        @click="removeFile(index)"
      >
        <LucideIcon name="trash" :size="14" />
      </button>
    </div>

    <button
      type="button"
      class="file-dataset-files__add"
      @click="emitFiles([...normalizedFiles, ''])"
    >
      <LucideIcon name="plus" :size="14" />
      <span>Add File</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { FileDatasetFile } from '@/core/types/workflow.types'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'

const props = defineProps<{
  modelValue?: FileDatasetFile[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: FileDatasetFile[]]
}>()

const fileInputs = ref<Array<HTMLInputElement | undefined>>([])
const normalizedFiles = computed<FileDatasetFile[]>(() =>
  props.modelValue?.length ? props.modelValue : [''],
)

function emitFiles(files: FileDatasetFile[]) {
  emit('update:modelValue', files)
}

function updateFile(index: number, value: string) {
  const files = [...normalizedFiles.value]
  files[index] = value
  emitFiles(files)
}

function removeFile(index: number) {
  const files = normalizedFiles.value.filter((_, fileIndex) => fileIndex !== index)
  emitFiles(files.length ? files : [''])
}

function setFileInput(index: number, element: Element | ComponentPublicInstance | null) {
  fileInputs.value[index] = element instanceof HTMLInputElement ? element : undefined
}

function uploadFile(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result ?? '')
    const files = [...normalizedFiles.value]
    files[index] = {
      filename: file.name,
      content: result.includes(',') ? result.slice(result.indexOf(',') + 1) : result,
      mimeType: file.type || undefined,
      size: file.size,
    }
    emitFiles(files)
    input.value = ''
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.file-dataset-files {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
}

.file-dataset-files__row,
.file-dataset-files__input {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.file-dataset-files__input {
  flex: 1;
  min-width: 0;
}

.file-dataset-files__input :deep(.expression-input) {
  flex: 1;
  min-width: 0;
}

.file-dataset-files__uploaded {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: var(--fabric-space-2);
}

.file-dataset-files__uploaded span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-dataset-files__button,
.file-dataset-files__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--fabric-file-dataset-files-input-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-file-dataset-files-input-text-muted);
  background: var(--fabric-file-dataset-files-input-bg-surface);
  cursor: pointer;
}

.file-dataset-files__button {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
}

.file-dataset-files__button:hover,
.file-dataset-files__add:hover {
  color: var(--fabric-file-dataset-files-input-text-primary);
  background: var(--fabric-file-dataset-files-input-bg-surface-hover);
}

.file-dataset-files__button--remove:hover {
  color: rgb(239, 68, 68);
  border-color: rgba(239, 68, 68, 0.5);
}

.file-dataset-files__add {
  align-self: flex-start;
  gap: 6px;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
</style>
