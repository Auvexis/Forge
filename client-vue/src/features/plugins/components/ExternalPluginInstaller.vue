<template>
  <BaseModal :is-open="isOpen" max-width="1040px" height="78vh" @close="close">
    <div class="plugin-installer-modal">
      <aside class="plugin-installer-modal__aside">
        <header class="plugin-installer-modal__aside-header">
          <button
            class="plugin-installer-modal__close"
            type="button"
            title="Close"
            @click="close"
          >
            <LucideIcon name="arrow-left" :size="15" />
          </button>
          <span class="plugin-installer-modal__title">Plugin Installer</span>
        </header>

        <div class="plugin-installer-modal__form">
          <section class="plugin-installer-modal__block">
            <div class="plugin-installer-modal__block-head">
              <LucideIcon name="link" :size="15" />
              <span>Repository URL</span>
            </div>
            <BaseInput
              v-model="repositoryUrl"
              type="url"
              placeholder="https://github.com/org/plugin"
              :disabled="loading"
            />
          </section>

          <section class="plugin-installer-modal__block">
            <div class="plugin-installer-modal__block-head">
              <LucideIcon name="folder-open" :size="15" />
              <span>Extracted folder</span>
            </div>
            <button
              type="button"
              class="plugin-installer-modal__dropzone"
              :class="{ 'is-dragging': isDraggingFolder }"
              :disabled="loading"
              @click="openFolderPicker"
              @dragenter.prevent="isDraggingFolder = true"
              @dragover.prevent="isDraggingFolder = true"
              @dragleave.prevent="isDraggingFolder = false"
              @drop.prevent="handleFolderDrop"
            >
              <LucideIcon name="folder-up" :size="20" />
              <span>{{ selectedUploadLabel || 'Drop plugin files here' }}</span>
              <small>Select folder or files</small>
            </button>
            <input
              ref="folderInputRef"
              class="plugin-installer-modal__file-input"
              type="file"
              multiple
              webkitdirectory
              directory
              @change="handleFolderInputChange"
            />
          </section>

          <section class="plugin-installer-modal__block">
            <div class="plugin-installer-modal__block-head">
              <LucideIcon name="users" :size="15" />
              <span>Install target</span>
            </div>
            <BaseSelect
              v-model="installTarget"
              :options="installTargetOptions"
              aria-label="Install target"
              :disabled="loading"
            />
            <p class="plugin-installer-modal__hint">
              Installs for {{ installTargetLabel }}.
            </p>
          </section>

          <BaseButton
            variant="primary"
            full-width
            icon-left="download"
            :disabled="loading || !canInstall"
            :loading="loading && activeAction === 'install'"
            @click="install"
          >
            Install plugin
          </BaseButton>

          <div v-if="error" class="plugin-installer-modal__install-error">
            <LucideIcon name="circle-alert" :size="14" />
            <span>{{ error }}</span>
          </div>

          <div v-if="result" class="plugin-installer-modal__result">
            <LucideIcon name="check" :size="14" />
            <span>Installed for {{ resultTargetLabel }}: {{ result.installId }} ({{ result.reloadStatus }})</span>
          </div>
        </div>
      </aside>

      <main class="plugin-installer-modal__main">
        <header class="plugin-installer-modal__main-head">
          <div>
            <h2>Manifest preview</h2>
            <p>Review plugin metadata before installing.</p>
          </div>
          <span
            v-if="preview"
            class="plugin-installer-modal__status"
            :class="`is-${preview.status}`"
          >
            {{ preview.status }}
          </span>
        </header>

        <div v-if="loading" class="plugin-installer-modal__state">
          <LucideIcon name="loader-2" :size="20" class="plugin-installer-modal__spin" />
          <p>Loading plugin preview...</p>
        </div>

        <div v-else-if="preview?.manifest" class="plugin-installer-modal__preview">
          <div class="plugin-installer-modal__plugin">
            <div class="plugin-installer-modal__plugin-icon">
              <img v-if="isIconUrl(manifest.metadata.icon)" :src="manifest.metadata.icon" alt="" />
              <LucideIcon v-else :name="manifest.metadata.icon || 'package'" :size="22" />
            </div>
            <div>
              <h3>{{ manifest.metadata.name }}</h3>
              <p>{{ manifest.metadata.description }}</p>
            </div>
          </div>

          <dl class="plugin-installer-modal__meta">
            <div>
              <dt>ID</dt>
              <dd>{{ manifest.metadata.id }}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{{ manifest.metadata.version }}</dd>
            </div>
            <div>
              <dt>Author</dt>
              <dd>{{ manifest.metadata.author }}</dd>
            </div>
            <div>
              <dt>Auth</dt>
              <dd>{{ preview.authType || 'runtime' }}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{{ preview.source.originalValue }}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{{ preview.expiresAt }}</dd>
            </div>
          </dl>

          <section class="plugin-installer-modal__section">
            <h4>Methods</h4>
            <ul v-if="preview.methodNames.length">
              <li v-for="method in preview.methodNames" :key="method">{{ method }}</li>
            </ul>
            <span v-else>No methods declared</span>
          </section>

          <section class="plugin-installer-modal__section">
            <h4>Triggers</h4>
            <ul v-if="preview.triggerNames.length">
              <li v-for="trigger in preview.triggerNames" :key="trigger">{{ trigger }}</li>
            </ul>
            <span v-else>No triggers declared</span>
          </section>

          <section v-if="preview.warnings.length" class="plugin-installer-modal__section is-warning">
            <h4>Warnings</h4>
            <ul>
              <li v-for="warning in preview.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </section>

          <section v-if="preview.errors.length" class="plugin-installer-modal__section is-error">
            <h4>Errors</h4>
            <ul>
              <li v-for="previewError in preview.errors" :key="previewError">{{ previewError }}</li>
            </ul>
          </section>
        </div>

        <div v-else-if="error" class="plugin-installer-modal__state is-error">
          <LucideIcon name="circle-alert" :size="22" />
          <p>{{ error }}</p>
        </div>

        <div v-else class="plugin-installer-modal__state">
          <LucideIcon name="package-search" :size="24" />
          <p>No plugin preview yet</p>
        </div>
      </main>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import type {
  ExternalPluginInstallResult,
  ExternalPluginPreview,
  PluginManifest,
} from '@/core/types/plugin.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useProfileStore } from '@/shared/stores/profile.store'
import { useStartGuide } from '@/shared/start-guide/useStartGuide'
import {
  buildPluginInstallTargetOptions,
  describePluginInstallTarget,
  installTargetToPayload,
  profileInstallTargetValue,
} from './pluginInstallTargetOptions'

const props = withDefaults(
  defineProps<{
    isOpen?: boolean
  }>(),
  {
    isOpen: false,
  },
)

const emit = defineEmits<{
  close: []
  preview: [preview: ExternalPluginPreview]
  installed: [result: ExternalPluginInstallResult]
}>()

interface UploadFileEntry {
  file: File
  relativePath: string
}

const repositoryUrl = ref('')
const profileStore = useProfileStore()
const startGuide = useStartGuide()
const installTarget = ref('profile:default')
const preview = ref<ExternalPluginPreview | null>(null)
const result = ref<ExternalPluginInstallResult | null>(null)
const loading = ref(false)
const error = ref('')
const activeAction = ref<'url' | 'upload' | 'install' | null>(null)
const folderInputRef = ref<HTMLInputElement | null>(null)
const selectedUploadLabel = ref('')
const isDraggingFolder = ref(false)
let repositoryPreviewTimer: number | undefined

const emptyManifest: PluginManifest = {
  metadata: {
    id: '',
    name: '',
    description: '',
    icon: 'package',
    categories: [],
    author: '',
    version: '',
    repository: '',
  },
  methods: {},
}

const canInstall = computed(() => preview.value?.status === 'ready')
const manifest = computed(() => preview.value?.manifest ?? emptyManifest)
const installTargetOptions = computed(() =>
  buildPluginInstallTargetOptions(profileStore.sortedProfiles, profileStore.currentProfile?.id),
)
const installTargetLabel = computed(() =>
  describePluginInstallTarget(installTarget.value, profileStore.profiles),
)
const resultTargetLabel = computed(() => {
  if (!result.value) return installTargetLabel.value
  if (result.value.scope === 'all_profiles') return 'all profiles'
  if (result.value.profileId) {
    return profileStore.profiles.find((profile) => profile.id === result.value?.profileId)?.name ?? result.value.profileId
  }
  return 'current profile'
})

onMounted(async () => {
  if (!profileStore.currentProfile && !profileStore.isLoading) {
    await profileStore.loadProfiles()
  }
})

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) startGuide.openIfNeeded('plugin-external-installer')
  },
)

watch(
  () => profileStore.currentProfile?.id,
  (profileId) => {
    if (profileId) installTarget.value = profileInstallTargetValue(profileId)
  },
  { immediate: true },
)

watch(repositoryUrl, (value) => {
  window.clearTimeout(repositoryPreviewTimer)
  const nextUrl = value.trim()
  if (!nextUrl) return

  repositoryPreviewTimer = window.setTimeout(() => {
    previewUrl()
  }, 650)
})

onUnmounted(() => {
  window.clearTimeout(repositoryPreviewTimer)
})

async function run(actionName: typeof activeAction.value, action: () => Promise<void>) {
  loading.value = true
  activeAction.value = actionName
  error.value = ''
  try {
    await action()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unexpected failure'
  } finally {
    loading.value = false
    activeAction.value = null
  }
}

function acceptPreview(nextPreview: ExternalPluginPreview) {
  preview.value = nextPreview
  result.value = null
  emit('preview', nextPreview)
}

function previewUrl() {
  const nextUrl = repositoryUrl.value.trim()
  if (!nextUrl) return

  void run('url', async () => {
    acceptPreview(await pluginsApi.previewExternalUrl(nextUrl))
  })
}

function previewUpload(files: UploadFileEntry[]) {
  if (files.length === 0) return

  selectedUploadLabel.value =
    files.length === 1 ? (files[0]?.relativePath ?? 'Selected file') : `${files.length} selected files`

  void run('upload', async () => {
    acceptPreview(await pluginsApi.previewExternalUpload(files))
  })
}

function install() {
  if (!preview.value) return
  void run('install', async () => {
    const target = installTargetToPayload(installTarget.value)
    result.value = await pluginsApi.installExternal(
      preview.value!.previewId,
      target.scope,
      target.profileId,
    )
    emit('installed', result.value)
  })
}

function close() {
  emit('close')
}

function isIconUrl(icon?: string) {
  return Boolean(icon?.startsWith('http') || icon?.startsWith('/'))
}

function openFolderPicker() {
  if (loading.value) return
  folderInputRef.value?.click()
}

function filesFromFileList(fileList: FileList | null): UploadFileEntry[] {
  if (!fileList) return []

  return Array.from(fileList).map((file) => ({
    file,
    relativePath:
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }))
}

function handleFolderInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  previewUpload(filesFromFileList(input.files))
  input.value = ''
}

async function handleFolderDrop(event: DragEvent) {
  isDraggingFolder.value = false
  const files = await filesFromDataTransfer(event.dataTransfer)
  previewUpload(files)
}

async function filesFromDataTransfer(dataTransfer: DataTransfer | null): Promise<UploadFileEntry[]> {
  if (!dataTransfer) return []

  const itemEntries = Array.from(dataTransfer.items ?? [])
    .map((item) => {
      const maybeItem = item as DataTransferItem & {
        webkitGetAsEntry?: () => unknown
      }
      return maybeItem.webkitGetAsEntry?.()
    })
    .filter(Boolean)

  if (itemEntries.length > 0) {
    const nestedFiles = await Promise.all(
      itemEntries.map((entry) => collectDroppedEntryFiles(entry, '')),
    )
    return nestedFiles.flat()
  }

  return filesFromFileList(dataTransfer.files)
}

async function collectDroppedEntryFiles(entry: unknown, parentPath: string): Promise<UploadFileEntry[]> {
  const item = entry as {
    isFile?: boolean
    isDirectory?: boolean
    name: string
    file?: (callback: (file: File) => void) => void
    createReader?: () => {
      readEntries: (callback: (entries: unknown[]) => void) => void
    }
  }
  const relativePath = parentPath ? `${parentPath}/${item.name}` : item.name

  if (item.isFile && item.file) {
    const file = await new Promise<File>((resolve) => item.file?.(resolve))
    return [{ file, relativePath }]
  }

  if (!item.isDirectory || !item.createReader) return []

  const reader = item.createReader()
  const entries = await new Promise<unknown[]>((resolve) => reader.readEntries(resolve))
  const nestedFiles = await Promise.all(
    entries.map((childEntry) => collectDroppedEntryFiles(childEntry, relativePath)),
  )
  return nestedFiles.flat()
}
</script>

<style scoped>
:deep(.base-modal-container) {
  border-radius: var(--sailor-radius-md);
}

.plugin-installer-modal {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  color: var(--sailor-text-primary);
}

.plugin-installer-modal__aside {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-right: 1px solid var(--sailor-border);
  background: var(--sailor-bg-surface);
}

.plugin-installer-modal__aside-header {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  height: 48px;
  padding: 0 var(--sailor-space-3);
  border-bottom: 1px solid var(--sailor-border);
  flex: 0 0 auto;
}

.plugin-installer-modal__close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
}

.plugin-installer-modal__close:hover {
  background: var(--sailor-button-ghost-hover);
  color: var(--sailor-text-primary);
}

.plugin-installer-modal__title {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-medium);
}

.plugin-installer-modal__form {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-4);
  padding: var(--sailor-space-4);
  overflow-y: auto;
}

.plugin-installer-modal__block {
  display: flex;
  flex-direction: column;
  gap: var(--sailor-space-2);
}

.plugin-installer-modal__block-head {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-medium);
}

.plugin-installer-modal__dropzone {
  display: grid;
  place-items: center;
  gap: var(--sailor-space-1);
  min-height: 108px;
  padding: var(--sailor-space-4);
  border: 1px dashed var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-base);
  color: var(--sailor-text-secondary);
  font: inherit;
  cursor: pointer;
  transition:
    border-color var(--sailor-duration-fast) var(--sailor-ease-standard),
    background-color var(--sailor-duration-fast) var(--sailor-ease-standard),
    color var(--sailor-duration-fast) var(--sailor-ease-standard);
}

.plugin-installer-modal__dropzone:hover,
.plugin-installer-modal__dropzone.is-dragging {
  border-color: var(--sailor-input-border-focus);
  background: var(--sailor-bg-elevated);
  color: var(--sailor-text-primary);
}

.plugin-installer-modal__dropzone:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.plugin-installer-modal__dropzone span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-medium);
}

.plugin-installer-modal__dropzone small {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.plugin-installer-modal__file-input {
  display: none;
}

.plugin-installer-modal__hint {
  margin: 0;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  line-height: 1.4;
}

.plugin-installer-modal__result {
  display: flex;
  align-items: center;
  gap: var(--sailor-space-2);
  min-width: 0;
  padding: var(--sailor-space-3);
  border: 1px solid rgba(34, 197, 94, 0.28);
  border-radius: var(--sailor-radius-sm);
  background: rgba(34, 197, 94, 0.08);
  color: var(--sailor-text-success);
  font-size: var(--sailor-text-xs);
}

.plugin-installer-modal__result span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plugin-installer-modal__install-error {
  display: flex;
  align-items: flex-start;
  gap: var(--sailor-space-2);
  min-width: 0;
  padding: var(--sailor-space-3);
  border: 1px solid color-mix(in srgb, var(--sailor-text-error) 30%, transparent);
  border-radius: var(--sailor-radius-sm);
  background: color-mix(in srgb, var(--sailor-text-error) 9%, transparent);
  color: var(--sailor-text-error);
  font-size: var(--sailor-text-xs);
  line-height: 1.45;
}

.plugin-installer-modal__install-error span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.plugin-installer-modal__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--sailor-bg-base);
}

.plugin-installer-modal__main-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sailor-space-4);
  padding: var(--sailor-space-5);
  border-bottom: 1px solid var(--sailor-border);
  flex: 0 0 auto;
}

.plugin-installer-modal__main-head h2,
.plugin-installer-modal__plugin h3,
.plugin-installer-modal__section h4 {
  margin: 0;
}

.plugin-installer-modal__main-head h2 {
  font-size: var(--sailor-text-lg);
  font-weight: var(--sailor-font-semibold);
}

.plugin-installer-modal__main-head p {
  margin: var(--sailor-space-1) 0 0;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
}

.plugin-installer-modal__status {
  flex: 0 0 auto;
  padding: 3px var(--sailor-space-2);
  border-radius: var(--sailor-radius-sm);
  color: var(--sailor-text-success);
  background: rgba(34, 197, 94, 0.08);
  font-size: var(--sailor-text-xs);
  text-transform: capitalize;
}

.plugin-installer-modal__status.is-invalid,
.plugin-installer-modal__state.is-error {
  color: var(--sailor-text-error);
}

.plugin-installer-modal__preview {
  display: grid;
  gap: var(--sailor-space-4);
  padding: var(--sailor-space-5);
  overflow-y: auto;
}

.plugin-installer-modal__plugin {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: var(--sailor-space-3);
  align-items: flex-start;
}

.plugin-installer-modal__plugin-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
}

.plugin-installer-modal__plugin-icon img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.plugin-installer-modal__plugin h3 {
  font-size: var(--sailor-text-xl);
  font-weight: var(--sailor-font-semibold);
}

.plugin-installer-modal__plugin p,
.plugin-installer-modal__section span,
.plugin-installer-modal__state p {
  margin: var(--sailor-space-1) 0 0;
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
  line-height: var(--sailor-leading-normal);
}

.plugin-installer-modal__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sailor-space-3);
  margin: 0;
}

.plugin-installer-modal__meta div {
  min-width: 0;
  padding: var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
}

.plugin-installer-modal__meta dt {
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
}

.plugin-installer-modal__meta dd {
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
}

.plugin-installer-modal__section {
  display: grid;
  gap: var(--sailor-space-2);
}

.plugin-installer-modal__section h4 {
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-sm);
  font-weight: var(--sailor-font-medium);
}

.plugin-installer-modal__section ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plugin-installer-modal__section li {
  padding: 8px var(--sailor-space-3);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-xs);
}

.plugin-installer-modal__section.is-warning li {
  color: var(--sailor-text-warning);
}

.plugin-installer-modal__section.is-error li {
  color: var(--sailor-text-error);
}

.plugin-installer-modal__state {
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--sailor-space-2);
  min-height: 0;
  height: 100%;
  padding: var(--sailor-space-6);
  color: var(--sailor-text-muted);
  text-align: center;
}

.plugin-installer-modal__spin {
  animation: plugin-installer-spin 1s linear infinite;
}

@keyframes plugin-installer-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 820px) {
  .plugin-installer-modal {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .plugin-installer-modal__aside {
    border-right: 0;
    border-bottom: 1px solid var(--sailor-border);
  }

  .plugin-installer-modal__main {
    min-height: 420px;
  }

  .plugin-installer-modal__meta {
    grid-template-columns: 1fr;
  }
}
</style>
