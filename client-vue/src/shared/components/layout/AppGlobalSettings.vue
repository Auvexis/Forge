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
import { useTheme, type ThemeMode } from '@/shared/composables/useTheme'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'

// ─── Store ────────────────────────────────────────────────────────────────────

const store = useSettingsStore()
const { setMode } = useTheme()

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
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System (auto)' },
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
  const theme = String(value) as ThemeMode
  // Apply immediately to the DOM (no reload needed)
  setMode(theme)
  // Persist to server for cross-session sync
  await store.saveSetting('theme', theme)
}

async function handleLogRetentionChange(value: string | number) {
  await store.saveSetting('log_retention_days', String(value))
}
</script>

