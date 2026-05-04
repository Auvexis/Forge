<template>
  <BaseModal
    :is-open="store.isOpen"
    max-width="1200px"
    height="80vh"
    @close="store.close"
  >
    <div class="global-settings">
      <!-- Header -->
      <header class="global-settings__header">
        <button class="global-settings__back" @click="store.close" title="Back">
          <LucideIcon name="arrow-left" :size="16" />
        </button>
        <span class="global-settings__title">Settings</span>
      </header>

      <!-- Tabs -->
      <nav class="global-settings__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="global-settings__tab"
          :class="{ 'global-settings__tab--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <LucideIcon :name="tab.icon" :size="13" />
          {{ tab.label }}
        </button>
      </nav>

      <!-- Scrollable content -->
      <div class="global-settings__content">

        <!-- ── Variables Tab ───────────────────────────────────────────── -->
        <section v-if="activeTab === 'variables'" class="gs-section">
          <p class="gs-section__desc">
            Use <code class="gs-code" v-pre>{{env.KEY}}</code> in any workflow to reference these values.
          </p>

          <!-- Add form -->
          <div class="gs-card">
            <BaseInput
              v-model="newVar.key"
              label="Key"
              placeholder="MY_VARIABLE"
              :error="newVar.keyError"
            />
            <BaseInput
              v-model="newVar.value"
              label="Value"
              placeholder="my-value"
            />
            <BaseInput
              v-model="newVar.description"
              label="Description (optional)"
              placeholder="What is this for?"
            />
            <BaseButton
              variant="primary"
              icon-left="plus"
              :loading="isSavingVar"
              :disabled="!newVar.key.trim()"
              :full-width="true"
              @click="handleSaveVariable"
            >
              Add Variable
            </BaseButton>
          </div>

          <!-- Loading -->
          <div v-if="store.isLoadingVariables" class="gs-state">
            <LucideIcon name="loader-2" :size="18" class="gs-spin" />
          </div>

          <!-- Empty -->
          <div v-else-if="store.variables.length === 0" class="gs-state">
            <LucideIcon name="variable" :size="24" />
            <p>No variables yet</p>
          </div>

          <!-- List -->
          <ul v-else class="gs-var-list">
            <li v-for="v in store.variables" :key="v.key" class="gs-var-item">
              <div class="gs-var-item__info">
                <code class="gs-var-item__key">{{ v.key }}</code>
                <span class="gs-var-item__value">{{ v.value }}</span>
                <span v-if="v.description" class="gs-var-item__desc">{{ v.description }}</span>
              </div>
              <BaseButton
                variant="ghost"
                size="icon"
                :loading="deletingKey === v.key"
                @click="handleDeleteVariable(v.key)"
                title="Delete"
              >
                <template #left>
                  <LucideIcon name="trash-2" :size="13" />
                </template>
              </BaseButton>
            </li>
          </ul>
        </section>

        <!-- ── Credentials Tab ────────────────────────────────────────── -->
        <section v-if="activeTab === 'credentials'" class="gs-section">
          <p class="gs-section__desc">
            Configure API keys and tokens for your installed plugins. These are stored locally and
            injected automatically when workflows run.
          </p>

          <!-- Loading -->
          <div v-if="isLoadingPlugins" class="gs-state">
            <LucideIcon name="loader-2" :size="18" class="gs-spin" />
          </div>

          <!-- Empty -->
          <div v-else-if="authPlugins.length === 0" class="gs-state">
            <LucideIcon name="key-round" :size="24" />
            <p>No plugins requiring credentials installed.</p>
          </div>

          <!-- Plugin credential list -->
          <div v-else class="gs-cred-list">
            <div
              v-for="plugin in authPlugins"
              :key="plugin.id"
              class="gs-cred-card"
            >
              <!-- Card Header -->
              <div class="gs-cred-card__header">
                <div class="gs-cred-card__title">
                  <span class="gs-cred-card__name">{{ plugin.manifest?.name ?? plugin.id }}</span>
                  <span
                    class="gs-cred-card__badge"
                    :class="hasCredential(plugin.id) ? 'gs-cred-card__badge--ok' : 'gs-cred-card__badge--missing'"
                  >
                    <LucideIcon :name="hasCredential(plugin.id) ? 'check' : 'circle-alert'" :size="10" />
                    {{ hasCredential(plugin.id) ? 'Configured' : 'Not configured' }}
                  </span>
                </div>
                <BaseButton
                  v-if="hasCredential(plugin.id)"
                  variant="ghost"
                  size="icon"
                  :loading="isDeletingCred === plugin.id"
                  title="Remove credential"
                  @click="handleDeleteCredential(plugin.id)"
                >
                  <template #left><LucideIcon name="trash-2" :size="13" /></template>
                </BaseButton>
              </div>

              <!-- Fields -->
              <div class="gs-cred-card__fields">
                <template v-for="(schema, fieldKey) in credentialSchema(plugin)" :key="fieldKey">
                  <BaseInput
                    :model-value="getCredField(plugin.id, String(fieldKey))"
                    :label="(schema as any).title ?? String(fieldKey)"
                    :placeholder="(schema as any).description ?? ''"
                    :type="(schema as any).format === 'password' ? 'password' : 'text'"
                    @update:model-value="setCredField(plugin.id, String(fieldKey), String($event))"
                  />
                </template>
              </div>

              <!-- Save button -->
              <BaseButton
                variant="primary"
                icon-left="save"
                :full-width="true"
                :loading="isSavingCred === plugin.id"
                :disabled="!hasPendingCredFields(plugin.id)"
                @click="handleSaveCredential(plugin.id)"
              >
                Save Credentials
              </BaseButton>
            </div>
          </div>
        </section>

        <!-- ── Preferences Tab ─────────────────────────────────────────── -->
        <section v-if="activeTab === 'preferences'" class="gs-section">
          <p class="gs-section__desc">System preferences for this Nod8 instance.</p>

          <div class="gs-pref-list">
            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="sun-moon" :size="14" />
                <span>Theme</span>
              </div>
              <BaseSelect
                :model-value="themeValue"
                :options="themeOptions"
                @update:model-value="handleThemeChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="database" :size="14" />
                <span>Log Retention</span>
              </div>
              <BaseSelect
                :model-value="logRetentionValue"
                :options="logRetentionOptions"
                @update:model-value="handleLogRetentionChange"
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSettingsStore } from '@/shared/stores/settings.store'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'

// ─── Store ────────────────────────────────────────────────────────────────────

const store = useSettingsStore()

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: 'variables', label: 'Variables', icon: 'variable' },
  { id: 'credentials', label: 'Credentials', icon: 'key-round' },
  { id: 'preferences', label: 'Preferences', icon: 'sliders-horizontal' },
] as const

type TabId = (typeof tabs)[number]['id']
const activeTab = ref<TabId>('variables')

// ─── Load data when opened ────────────────────────────────────────────────────

watch(
  () => store.isOpen,
  (opened) => {
    if (opened) {
      store.fetchVariables()
      store.fetchSettings()
      loadPlugins()
    }
  },
)

// ─── Variables ────────────────────────────────────────────────────────────────

const newVar = ref({ key: '', value: '', description: '', keyError: '' })
const isSavingVar = ref(false)
const deletingKey = ref<string | null>(null)

async function handleSaveVariable() {
  newVar.value.keyError = ''
  const key = newVar.value.key.trim().toUpperCase()

  if (!key) return
  if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
    newVar.value.keyError = 'Must be a valid identifier (letters, digits, underscores)'
    return
  }

  isSavingVar.value = true
  try {
    await store.saveVariable(key, newVar.value.value, newVar.value.description)
    newVar.value = { key: '', value: '', description: '', keyError: '' }
  } catch (err: any) {
    newVar.value.keyError = err.message
  } finally {
    isSavingVar.value = false
  }
}

async function handleDeleteVariable(key: string) {
  deletingKey.value = key
  try {
    await store.deleteVariable(key)
  } finally {
    deletingKey.value = null
  }
}

// ─── Credentials ───────────────────────────────────────────────────────────

const plugins = ref<any[]>([])
const isLoadingPlugins = ref(false)
const pendingCredFields = ref<Record<string, Record<string, string>>>({})
const isSavingCred = ref<string | null>(null)
const isDeletingCred = ref<string | null>(null)

async function loadPlugins() {
  isLoadingPlugins.value = true
  try {
    const { pluginsApi } = await import('@/core/api/plugins.api')
    const list = await pluginsApi.getAll()
    plugins.value = list ?? []
    // Pre-fetch stored credentials for each plugin that requires auth
    for (const p of authPlugins.value) {
      await store.fetchCredential(p.id)
    }
  } catch {
    // ignore
  } finally {
    isLoadingPlugins.value = false
  }
}

const authPlugins = computed(() =>
  plugins.value.filter((p: any) => {
    const schema = p.credential_schema
    return schema && typeof schema === 'object' && Object.keys(schema).length > 0
  })
)

function credentialSchema(plugin: any): Record<string, any> {
  return plugin.credential_schema ?? {}
}

function hasCredential(pluginId: string): boolean {
  const cred = store.credentials[pluginId]
  return !!cred && Object.keys(cred.fields ?? {}).length > 0
}

function getCredField(pluginId: string, fieldKey: string): string {
  return pendingCredFields.value[pluginId]?.[fieldKey]
    ?? store.credentials[pluginId]?.fields?.[fieldKey]
    ?? ''
}

function setCredField(pluginId: string, fieldKey: string, value: string | number) {
  if (!pendingCredFields.value[pluginId]) pendingCredFields.value[pluginId] = {}
  pendingCredFields.value[pluginId][fieldKey] = String(value)
}

function hasPendingCredFields(pluginId: string): boolean {
  const pending = pendingCredFields.value[pluginId]
  return !!pending && Object.values(pending).some((v) => v.trim() !== '')
}

async function handleSaveCredential(pluginId: string) {
  const fields = pendingCredFields.value[pluginId] ?? {}
  if (!Object.keys(fields).length) return
  isSavingCred.value = pluginId
  try {
    await store.saveCredential(pluginId, fields)
    delete pendingCredFields.value[pluginId]
  } finally {
    isSavingCred.value = null
  }
}

async function handleDeleteCredential(pluginId: string) {
  isDeletingCred.value = pluginId
  try {
    await store.deleteCredential(pluginId)
    delete pendingCredFields.value[pluginId]
  } finally {
    isDeletingCred.value = null
  }
}

// ─── Preferences ──────────────────────────────────────────────────────────────

const themeOptions = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light (coming soon)' },
]

const logRetentionOptions = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '0', label: 'Keep forever' },
]

const themeValue = computed(() => String(store.settings.theme ?? 'dark'))
const logRetentionValue = computed(() => String(store.settings.log_retention_days ?? '30'))

async function handleThemeChange(value: string | number) {
  await store.saveSetting('theme', String(value))
}

async function handleLogRetentionChange(value: string | number) {
  await store.saveSetting('log_retention_days', String(value))
}
</script>

<style scoped>
/* ─── Main container ─── */
.global-settings {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--nod8-bg-surface);
  z-index: 50; /* Above regular editor, below toasts */
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.global-settings__header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  height: 48px;
  padding: 0 var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.global-settings__back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--nod8-radius-sm);
  color: var(--nod8-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color var(--nod8-duration-fast), color var(--nod8-duration-fast);
  flex-shrink: 0;
}

.global-settings__back:hover {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

.global-settings__title {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
}

/* ─── Tabs ───────────────────────────────────────────────────────────────── */
.global-settings__tabs {
  display: flex;
  gap: 2px;
  padding: var(--nod8-space-2) var(--nod8-space-3);
  border-bottom: 1px solid var(--nod8-border);
  flex-shrink: 0;
}

.global-settings__tab {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: 4px var(--nod8-space-3);
  border-radius: var(--nod8-radius-sm);
  font-size: var(--nod8-text-xs);
  font-weight: var(--nod8-font-medium);
  color: var(--nod8-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: all var(--nod8-duration-fast);
}

.global-settings__tab:hover {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-secondary);
}

.global-settings__tab--active {
  background: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

/* ─── Scrollable content ─────────────────────────────────────────────────── */
.global-settings__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.global-settings__content::-webkit-scrollbar { width: 4px; }
.global-settings__content::-webkit-scrollbar-track { background: transparent; }
.global-settings__content::-webkit-scrollbar-thumb {
  background: var(--nod8-border);
  border-radius: 4px;
}

/* ─── Section ────────────────────────────────────────────────────────────── */
.gs-section {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-5);
  padding: var(--nod8-space-8) var(--nod8-space-6);
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.gs-section__desc {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  line-height: 1.5;
  margin: 0;
}

.gs-code {
  font-family: monospace;
  font-size: 11px;
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: 3px;
  padding: 1px 4px;
  color: var(--nod8-text-secondary);
}

/* ─── Add variable card ──────────────────────────────────────────────────── */
.gs-card {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border-radius: var(--nod8-radius-md);
  border: 1px solid var(--nod8-border);
}

/* ─── State (loading / empty) ────────────────────────────────────────────── */
.gs-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-6) 0;
  color: var(--nod8-text-muted);
  font-size: var(--nod8-text-xs);
}

.gs-spin {
  animation: gs-spin 1s linear infinite;
}

@keyframes gs-spin {
  to { transform: rotate(360deg); }
}

/* ─── Variable list ──────────────────────────────────────────────────────── */
.gs-var-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
}

.gs-var-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-2);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.gs-var-item__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex: 1;
}

.gs-var-item__key {
  font-family: monospace;
  font-size: 11px;
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-var-item__value {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-var-item__desc {
  font-size: 11px;
  color: var(--nod8-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── Preferences ────────────────────────────────────────────────────────── */
.gs-pref-list {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.gs-pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-2) var(--nod8-space-3);
  background: var(--nod8-bg-muted);
  border: 1px solid var(--nod8-border);
  border-radius: var(--nod8-radius-sm);
}

.gs-pref-row__label {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-secondary);
  flex-shrink: 0;
}
.gs-cred-list {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-4);
}

.gs-cred-card {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-4);
  background: var(--nod8-bg-muted);
  border-radius: var(--nod8-radius-md);
  border: 1px solid var(--nod8-border);
}

.gs-cred-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--nod8-space-2);
}

.gs-cred-card__title {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  min-width: 0;
}

.gs-cred-card__name {
  font-size: var(--nod8-text-sm);
  font-weight: var(--nod8-font-semibold);
  color: var(--nod8-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gs-cred-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: var(--nod8-font-semibold);
  padding: 2px 6px;
  border-radius: var(--nod8-radius-full);
  white-space: nowrap;
}

.gs-cred-card__badge--ok {
  background: color-mix(in srgb, var(--nod8-green-400) 15%, transparent);
  color: var(--nod8-green-400);
}

.gs-cred-card__badge--missing {
  background: color-mix(in srgb, var(--nod8-text-muted) 10%, transparent);
  color: var(--nod8-text-muted);
}

.gs-cred-card__fields {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

</style>
