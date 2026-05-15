<template>
  <section class="external-installer">
    <header class="external-installer__header">
      <h1>External installer</h1>
      <span v-if="result">Instalado: {{ result.installId }}</span>
    </header>

    <div class="installer-grid">
      <div class="installer-block">
        <label>Repository URL</label>
        <div class="installer-row">
          <input v-model="repositoryUrl" type="url" placeholder="https://github.com/org/plugin" />
          <button type="button" :disabled="loading || !repositoryUrl" @click="previewUrl">
            <LinkIcon :size="15" />
            Preview
          </button>
        </div>
      </div>

      <div class="installer-block">
        <label>Extracted folder</label>
        <div class="installer-row">
          <input v-model="folderPath" type="text" placeholder="C:\\plugins\\my-plugin" />
          <button type="button" :disabled="loading || !folderPath" @click="previewFolder">
            <FolderOpen :size="15" />
            Preview
          </button>
        </div>
      </div>

      <div class="installer-actions">
        <div class="scope-switch">
          <button
            type="button"
            :class="{ active: scope === 'current_profile' }"
            @click="scope = 'current_profile'"
          >
            Profile atual
          </button>
          <button type="button" :class="{ active: scope === 'all_profiles' }" @click="scope = 'all_profiles'">
            Todos profiles
          </button>
        </div>

        <button class="install-button" type="button" :disabled="loading || !canInstall" @click="install">
          <Download :size="15" />
          Install
        </button>
      </div>
    </div>

    <p v-if="error" class="installer-message is-error">{{ error }}</p>
    <p v-else-if="loading" class="installer-message">Processando...</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, FolderOpen, Link as LinkIcon } from 'lucide-vue-next'
import { pluginsApi } from '@/core/api/plugins.api'
import type {
  ExternalPluginInstallResult,
  ExternalPluginInstallScope,
  ExternalPluginPreview,
} from '@/core/types/plugin.types'

const emit = defineEmits<{
  preview: [preview: ExternalPluginPreview]
  installed: [result: ExternalPluginInstallResult]
}>()

const repositoryUrl = ref('')
const folderPath = ref('')
const scope = ref<ExternalPluginInstallScope>('current_profile')
const preview = ref<ExternalPluginPreview | null>(null)
const result = ref<ExternalPluginInstallResult | null>(null)
const loading = ref(false)
const error = ref('')

const canInstall = computed(() => preview.value?.status === 'ready')

async function run(action: () => Promise<void>) {
  loading.value = true
  error.value = ''
  try {
    await action()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha inesperada'
  } finally {
    loading.value = false
  }
}

function acceptPreview(nextPreview: ExternalPluginPreview) {
  preview.value = nextPreview
  result.value = null
  emit('preview', nextPreview)
}

function previewUrl() {
  void run(async () => {
    acceptPreview(await pluginsApi.previewExternalUrl(repositoryUrl.value.trim()))
  })
}

function previewFolder() {
  void run(async () => {
    acceptPreview(await pluginsApi.previewExternalFolder(folderPath.value.trim()))
  })
}

function install() {
  if (!preview.value) return
  void run(async () => {
    result.value = await pluginsApi.installExternal(preview.value!.previewId, scope.value)
    emit('installed', result.value)
  })
}
</script>

<style scoped>
.external-installer {
  display: grid;
  gap: var(--nod8-space-6);
  padding: var(--nod8-space-6);
}

.external-installer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-4);
}

.external-installer__header h1 {
  margin: 0;
  font-size: var(--nod8-text-2xl);
  font-weight: var(--nod8-font-semibold);
}

.external-installer__header span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--nod8-text-success);
  font-size: var(--nod8-text-xs);
}

.installer-grid {
  display: grid;
  gap: var(--nod8-space-4);
  max-width: 760px;
}

.installer-block {
  display: grid;
  gap: var(--nod8-space-2);
}

.installer-block label {
  color: var(--nod8-text-secondary);
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-medium);
}

.installer-row,
.installer-actions {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-3);
}

.installer-row input {
  flex: 1;
  min-width: 0;
  height: 38px;
  border: 1px solid var(--nod8-input-border);
  border-radius: var(--nod8-radius-sm);
  background: var(--nod8-input-bg);
  color: var(--nod8-input-text);
  padding: 0 var(--nod8-space-3);
  font: inherit;
  font-size: var(--nod8-text-sm);
}

.installer-row button,
.install-button,
.scope-switch button {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--nod8-space-2);
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-button-secondary-border);
  background: var(--nod8-button-secondary-bg);
  color: var(--nod8-button-secondary-text);
  padding: 0 var(--nod8-space-4);
  font-size: var(--nod8-text-sm);
}

.installer-row button:disabled,
.install-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scope-switch {
  display: inline-flex;
  padding: 3px;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid var(--nod8-border);
}

.scope-switch button {
  border-color: transparent;
  background: transparent;
  color: var(--nod8-text-secondary);
}

.scope-switch button.active {
  background: var(--nod8-bg-elevated);
  color: var(--nod8-text-primary);
}

.install-button {
  background: var(--nod8-button-primary-bg);
  color: var(--nod8-button-primary-text);
}

.installer-message {
  color: var(--nod8-text-secondary);
  font-size: var(--nod8-text-sm);
}

.installer-message.is-error {
  color: var(--nod8-text-error);
}

@media (max-width: 900px) {
  .installer-row,
  .installer-actions,
  .external-installer__header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
