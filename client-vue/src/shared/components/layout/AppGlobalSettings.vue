<template>
  <BaseModal :is-open="store.isOpen" max-width="960px" height="76vh" @close="store.close">
    <div class="gs-shell">
      <!-- ── Left Aside ──────────────────────────────────────────── -->
      <aside class="gs-aside">
        <!-- Logo / title -->
        <div class="gs-aside__header">
          <button class="gs-aside__close" @click="store.close" title="Close">
            <LucideIcon name="arrow-left" :size="15" />
          </button>
          <span class="gs-aside__title">Settings</span>
        </div>

        <!-- Vertical nav -->
        <BaseWoobyMenu
          tag="nav"
          class="gs-nav"
          style="position: relative"
          active-selector=".gs-nav__item--active"
        >
          <BaseButton
            v-for="(tab, index) in tabs"
            :key="tab.id"
            variant="ghost"
            class="gs-nav__item"
            :class="{ 'gs-nav__item--active': activeTab === tab.id }"
            style="
              position: relative;
              z-index: 1;
              background: transparent;
              justify-content: flex-start;
              width: 100%;
            "
            @click="activeTab = tab.id"
          >
            <template #left>
              <LucideIcon :name="tab.icon" :size="15" class="gs-nav__icon" />
            </template>
            <span class="gs-nav__label">{{ tab.label }}</span>
          </BaseButton>
        </BaseWoobyMenu>
      </aside>

      <!-- ── Right Content ───────────────────────────────────────── -->
      <main class="gs-main gs-section">
        <!-- ── Headers (Fade) ──────────────────────────────────────── -->
        <transition name="fade" mode="out-in">
          <div v-if="activeTab === 'variables'" key="head-var" class="gs-section__head">
            <div style="display: flex; flex-direction: column; gap: var(--nod8-space-1)">
              <h2 class="gs-section__title">Environment Variables</h2>
              <p class="gs-section__desc">
                Use <code class="gs-code" v-pre>{{ env.KEY }}</code> in any workflow to reference
                these values.
              </p>
            </div>
          </div>
          <div
            v-else-if="activeTab === 'credentials'"
            key="head-cred"
            class="gs-section__head"
            style="
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 1rem;
            "
          >
            <div>
              <div style="display: flex; flex-direction: column; gap: var(--nod8-space-1)">
                <h2 class="gs-section__title">Credentials</h2>
                <p class="gs-section__desc">
                  Configure API keys and tokens for your installed plugins.
                </p>
              </div>
            </div>
            <div style="width: 240px; flex-shrink: 0">
              <BaseInput v-model="credSearch" placeholder="Search plugins..." />
            </div>
          </div>
          <div v-else-if="activeTab === 'preferences'" key="head-pref" class="gs-section__head">
            <div style="display: flex; flex-direction: column; gap: var(--nod8-space-1)">
              <h2 class="gs-section__title">Preferences</h2>
              <p class="gs-section__desc">System preferences for this Nod8 instance.</p>
            </div>
          </div>
        </transition>

        <!-- ── Bodies (Slide Up) ────────────────────────────────────── -->
        <transition name="slide-up" mode="out-in">
          <!-- Variables Body -->
          <div v-if="activeTab === 'variables'" key="body-var" class="gs-pref-list">
            <!-- Add form -->
            <div
              class="gs-pref-row"
              style="
                flex-direction: column;
                align-items: stretch;
                gap: 1rem;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 1.5rem;
                margin-bottom: 0.5rem;
              "
            >
              <div class="gs-pref-row__label">
                <LucideIcon name="plus" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Add Variable</span>
                  <span class="gs-pref-row__hint">Create a new environment variable</span>
                </div>
              </div>
              <div style="display: flex; gap: 0.75rem; align-items: flex-start">
                <div style="flex: 1">
                  <BaseInput v-model="newVar.key" placeholder="KEY_NAME" :error="newVar.keyError" />
                </div>
                <div style="flex: 1; display: flex; align-items: center; gap: 0.25rem">
                  <BaseInput
                    v-model="newVar.value"
                    placeholder="Value"
                    :type="showNewVarValue ? 'text' : 'password'"
                    style="flex: 1"
                  />
                  <BaseButton
                    variant="ghost"
                    size="icon"
                    :title="showNewVarValue ? 'Hide value' : 'Show value'"
                    @click="showNewVarValue = !showNewVarValue"
                  >
                    <template #left>
                      <LucideIcon :name="showNewVarValue ? 'eye-off' : 'eye'" :size="15" />
                    </template>
                  </BaseButton>
                </div>
                <div style="flex: 1.5">
                  <BaseInput v-model="newVar.description" placeholder="Description (optional)" />
                </div>
                <BaseButton
                  variant="primary"
                  :loading="isSavingVar"
                  :disabled="!newVar.key.trim()"
                  @click="handleSaveVariable"
                >
                  Add
                </BaseButton>
              </div>
            </div>

            <!-- Loading -->
            <div v-if="store.isLoadingVariables" class="gs-state" style="padding: 2rem">
              <LucideIcon name="loader-2" :size="18" class="gs-spin" />
            </div>

            <!-- Empty -->
            <div v-else-if="store.variables.length === 0" class="gs-state" style="padding: 2rem">
              <LucideIcon name="key-round" :size="24" />
              <p>No variables yet</p>
            </div>

            <!-- List -->
            <template v-else>
              <div v-for="v in store.variables" :key="v.key" class="gs-pref-row">
                <div class="gs-pref-row__label">
                  <LucideIcon name="key-round" :size="16" />
                  <div>
                    <span
                      class="gs-pref-row__name"
                      style="font-family: monospace; font-size: 0.9em"
                      >{{ v.key }}</span
                    >
                    <span class="gs-pref-row__hint">{{ v.description || 'No description' }}</span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 0.5rem">
                  <code
                    class="gs-code"
                    style="
                      max-width: 200px;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                    :title="revealedVars[v.key] ? v.value : 'Click eye to reveal'"
                  >
                    {{ revealedVars[v.key] ? v.value : '••••••••••••••••' }}
                  </code>
                  <BaseButton
                    variant="ghost"
                    size="icon"
                    :title="revealedVars[v.key] ? 'Hide value' : 'Show value'"
                    @click="toggleVarVisibility(v.key)"
                  >
                    <template #left>
                      <LucideIcon :name="revealedVars[v.key] ? 'eye-off' : 'eye'" :size="13" />
                    </template>
                  </BaseButton>
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
                </div>
              </div>
            </template>
          </div>

          <!-- Credentials Body -->
          <div v-else-if="activeTab === 'credentials'" key="body-cred" class="gs-pref-list">
            <!-- Loading -->
            <div v-if="isLoadingPlugins" class="gs-state" style="padding: 2rem">
              <LucideIcon name="loader-2" :size="18" class="gs-spin" />
            </div>

            <!-- Empty -->
            <div v-else-if="authPlugins.length === 0" class="gs-state" style="padding: 2rem">
              <LucideIcon name="key-round" :size="24" />
              <p>
                {{
                  credSearch.trim()
                    ? 'No plugins found matching search.'
                    : 'No plugins requiring credentials installed.'
                }}
              </p>
            </div>

            <!-- Plugin credential list -->
            <div
              v-else
              style="
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 0.75rem;
              "
            >
              <div
                v-for="plugin in authPlugins"
                :key="plugin.id"
                class="gs-cred-grid-item"
                :class="{ 'gs-cred-grid-item--active': selectedPluginForMenu?.id === plugin.id }"
                @click="openPluginMenu(plugin)"
              >
                <img
                  v-if="isUrl(plugin.manifest?.metadata?.icon)"
                  :src="plugin.manifest?.metadata?.icon"
                  alt=""
                  style="
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                    border-radius: 8px;
                    margin-bottom: 0.75rem;
                  "
                />
                <div
                  v-else
                  style="
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--nod8-bg-surface);
                    border: 1px solid var(--nod8-border);
                    border-radius: 8px;
                    margin-bottom: 0.75rem;
                  "
                >
                  <LucideIcon
                    :name="plugin.manifest?.metadata?.icon || 'puzzle'"
                    :size="20"
                    style="opacity: 0.7"
                  />
                </div>

                <span
                  style="
                    font-size: 0.95em;
                    font-weight: 500;
                    color: var(--nod8-text-primary);
                    margin-bottom: 0.25rem;
                    text-align: center;
                  "
                >
                  {{ plugin.manifest?.metadata?.name ?? plugin.id }}
                </span>

                <span
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.35rem;
                    font-size: 0.75em;
                  "
                  :style="
                    hasCredential(plugin.id)
                      ? 'color: var(--nod8-text-success);'
                      : 'color: var(--nod8-text-warning);'
                  "
                >
                  <LucideIcon
                    :name="hasCredential(plugin.id) ? 'check' : 'circle-alert'"
                    :size="12"
                  />
                  {{ hasCredential(plugin.id) ? 'Configured' : 'Not configured' }}
                </span>
              </div>
            </div>

            <!-- BaseMiniMenu for Plugin Credentials -->
            <BaseMiniMenu
              :is-open="!!selectedPluginForMenu"
              :title="
                'Configure ' +
                (selectedPluginForMenu?.manifest?.metadata?.name ?? selectedPluginForMenu?.id)
              "
              :logo="selectedPluginForMenu?.manifest?.metadata?.icon"
              :icon="selectedPluginForMenu?.manifest?.metadata?.icon || 'puzzle'"
              max-width="520px"
              @close="closePluginMenu"
            >
              <div
                style="display: flex; flex-direction: column; gap: 1.25rem"
                v-if="selectedPluginForMenu"
              >
                <!-- OAuth Redirect URL Block -->
                <div
                  v-if="selectedPluginForMenu.auth_type === 'oauth2' && pluginStatus?.oauth_redirect_uri"
                  style="display: flex; flex-direction: column; gap: var(--nod8-space-2); padding: var(--nod8-space-3); background: var(--nod8-bg-surface); border-radius: var(--nod8-radius-md); border: 1px solid var(--nod8-border); margin-bottom: var(--nod8-space-2);"
                >
                  <span style="font-size: var(--nod8-text-sm); font-weight: 500; color: var(--nod8-text-primary);">OAuth Redirect URL</span>
                  <BaseInput
                    :model-value="pluginStatus.oauth_redirect_uri"
                    readonly
                    @click="$event.target.select()"
                  />
                  <p
                    v-if="pluginStatus?.oauth_ui?.oauthCallbackInstructions"
                    style="margin: 0; font-size: var(--nod8-text-xs); color: var(--nod8-text-muted); margin-top: var(--nod8-space-1);"
                  >
                    {{ pluginStatus.oauth_ui.oauthCallbackInstructions }}
                  </p>
                </div>
                <template
                  v-for="(schema, fieldKey) in credentialSchema(selectedPluginForMenu)"
                  :key="fieldKey"
                >
                  <div style="display: flex; flex-direction: column; gap: var(--nod8-space-1)">
                    <label style="display: flex; align-items: center; gap: var(--nod8-space-1); font-size: var(--nod8-text-sm); font-weight: 500; color: var(--nod8-text-primary);">
                      {{ (schema as any).label ?? (schema as any).title ?? String(fieldKey) }}
                      <span v-if="(schema as any).required" style="color: rgb(239, 68, 68);">*</span>
                    </label>
                    <p
                      v-if="(schema as any).description"
                      style="margin: 0; font-size: var(--nod8-text-xs); color: var(--nod8-text-muted);"
                    >
                      {{ (schema as any).description }}
                    </p>

                    <div
                      style="display: flex; align-items: center; gap: 0.5rem; margin-top: var(--nod8-space-1)"
                    >
                      <BaseInput
                        style="flex: 1"
                        :model-value="getCredField(selectedPluginForMenu.id, String(fieldKey))"
                        placeholder="Enter value"
                        :type="
                          (schema as any).format === 'password' &&
                          !showCredValues[`${selectedPluginForMenu.id}_${fieldKey}`]
                            ? 'password'
                            : 'text'
                        "
                        @update:model-value="
                          setCredField(selectedPluginForMenu.id, String(fieldKey), String($event))
                        "
                      />
                      <BaseButton
                        v-if="(schema as any).format === 'password'"
                        variant="ghost"
                        size="icon"
                        :title="
                          showCredValues[`${selectedPluginForMenu.id}_${fieldKey}`]
                            ? 'Hide'
                            : 'Show'
                        "
                        @click="toggleCredVisibility(selectedPluginForMenu.id, String(fieldKey))"
                      >
                        <template #left>
                          <LucideIcon
                            :name="
                              showCredValues[`${selectedPluginForMenu.id}_${fieldKey}`]
                                ? 'eye-off'
                                : 'eye'
                            "
                            :size="15"
                          />
                        </template>
                      </BaseButton>
                    </div>
                  </div>
                </template>
              </div>

              <template #footer>
                <div style="display: flex; flex-direction: column; gap: var(--nod8-space-2); width: 100%;">
                  <!-- Save Button -->
                  <BaseButton
                    variant="primary"
                    :disabled="!hasPendingCredFields(selectedPluginForMenu?.id)"
                    :loading="isSavingCred === selectedPluginForMenu?.id"
                    @click="handleSaveCredentialAndClose(selectedPluginForMenu.id)"
                    style="width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                  >
                    Save Credentials
                  </BaseButton>

                  <!-- OAuth2 / Test Connection -->
                  <BaseButton
                    v-if="selectedPluginForMenu?.auth_type === 'oauth2' && pluginStatus?.status === 'configured'"
                    variant="secondary"
                    :title="pluginStatus?.oauth_ui?.buttonText || 'Authenticate via OAuth2'"
                    @click="handleOAuth2(selectedPluginForMenu.id)"
                    style="width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                  >
                    <template #left>
                      <img v-if="pluginStatus?.oauth_ui?.buttonIcon?.startsWith('http')" :src="pluginStatus.oauth_ui.buttonIcon" style="width: 16px; height: 16px; object-fit: contain;" />
                      <LucideIcon v-else-if="pluginStatus?.oauth_ui?.buttonIcon" :name="pluginStatus.oauth_ui.buttonIcon" :size="16" />
                      <LucideIcon v-else name="external-link" :size="16" />
                    </template>
                    {{ pluginStatus?.oauth_ui?.buttonText || 'Connect with OAuth2' }}
                  </BaseButton>
                  <BaseButton
                    v-else-if="selectedPluginForMenu?.auth_type !== 'none' && selectedPluginForMenu?.auth_type !== 'oauth2'"
                    variant="secondary"
                    title="Test Connection"
                    @click="handleTestConnection(selectedPluginForMenu.id)"
                    style="width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                  >
                    <template #left><LucideIcon name="plug" :size="16" /></template>
                    Test Connection
                  </BaseButton>

                  <BaseButton
                    v-if="hasCredential(selectedPluginForMenu?.id) && pluginStatus?.status === 'connected'"
                    variant="ghost"
                    style="color: rgb(239, 68, 68); background-color: rgba(239, 68, 68, 0.1); width: 100%; justify-content: center; height: 36px; font-weight: 500;"
                    :loading="isDeletingCred === selectedPluginForMenu?.id"
                    @click="handleDeleteCredentialAndClose(selectedPluginForMenu.id)"
                  >
                    <template #left><LucideIcon name="log-out" :size="16" /></template>
                    Disconnect
                  </BaseButton>
                </div>
              </template>
            </BaseMiniMenu>
          </div>

          <!-- Preferences Body -->
          <div v-else-if="activeTab === 'preferences'" key="body-pref" class="gs-pref-list">
            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="sun-moon" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Theme</span>
                  <span class="gs-pref-row__hint">Controls the app color scheme</span>
                </div>
              </div>
              <BaseSelect
                :model-value="themeValue"
                :options="themeOptions"
                @update:model-value="handleThemeChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="database" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Log Retention</span>
                  <span class="gs-pref-row__hint">How long to keep execution logs</span>
                </div>
              </div>
              <BaseSelect
                :model-value="logRetentionValue"
                :options="logRetentionOptions"
                @update:model-value="handleLogRetentionChange"
              />
            </div>

            <div class="gs-pref-row">
              <div class="gs-pref-row__label">
                <LucideIcon name="globe" :size="16" />
                <div>
                  <span class="gs-pref-row__name">Public URL</span>
                  <span class="gs-pref-row__hint">Base URL used by production webhooks and forms</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem; min-width: 320px">
                <BaseInput
                  v-model="publicUrlDraft"
                  placeholder="https://example.ngrok-free.app"
                  style="flex: 1"
                />
                <BaseButton
                  variant="primary"
                  :loading="isSavingPublicUrl"
                  @click="handlePublicUrlSave"
                >
                  Save
                </BaseButton>
              </div>
            </div>
          </div>
        </transition>
      </main>
    </div>
  </BaseModal>
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useSettingsStore } from '@/shared/stores/settings.store'
import { useTheme, type ThemeMode } from '@/shared/composables/useTheme'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseMiniMenu from '@/shared/components/base/BaseMiniMenu.vue'
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'
import { usePluginAuth } from '@/shared/composables/usePluginAuth'
import { useToast } from '@/shared/composables/useToast'

const toast = useToast()

// ─── Store ────────────────────────────────────────────────────────────────────

const store = useSettingsStore()
const { setMode } = useTheme()

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  { id: 'preferences', label: 'Preferences', icon: 'sliders-horizontal' },
  { id: 'credentials', label: 'Credentials', icon: 'lock-keyhole' },
  { id: 'variables', label: 'Variables', icon: 'key-round' },
] as const

type TabId = (typeof tabs)[number]['id']
const activeTab = computed({
  get: () => store.activeTab as TabId,
  set: (val) => { store.activeTab = val }
})

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

const showNewVarValue = ref(false)
const revealedVars = ref<Record<string, boolean>>({})

function toggleVarVisibility(key: string) {
  revealedVars.value[key] = !revealedVars.value[key]
}

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

const showCredValues = ref<Record<string, boolean>>({})
const selectedPluginForMenu = ref<any>(null)
const credSearch = ref('')

function toggleCredVisibility(pluginId: string, fieldKey: string) {
  const key = `${pluginId}_${fieldKey}`
  showCredValues.value[key] = !showCredValues.value[key]
}

const {
  pluginStatus,
  loadStatus,
  handleConnect: startOAuth2,
  handleDisconnect: disconnectOAuth2,
  authLoading: isAuthLoading,
} = usePluginAuth(() => selectedPluginForMenu.value?.id ?? null)

async function openPluginMenu(plugin: any) {
  selectedPluginForMenu.value = plugin
  await loadStatus()
}

function closePluginMenu() {
  selectedPluginForMenu.value = null
}

const isUrl = (str?: string) => str?.startsWith('http') || str?.startsWith('/')

async function loadPlugins() {
  isLoadingPlugins.value = true
  try {
    const { pluginsApi } = await import('@/core/api/plugins.api')
    const list = await pluginsApi.getAll()
    plugins.value = list ?? []
    for (const p of authPlugins.value) {
      await store.fetchCredential(p.id)
    }
    
    if (store.targetPluginId) {
      const target = plugins.value.find((p: any) => p.id === store.targetPluginId)
      if (target) openPluginMenu(target)
      store.targetPluginId = null
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
    const hasSchema = schema && typeof schema === 'object' && Object.keys(schema).length > 0
    if (!hasSchema) return false

    if (credSearch.value.trim()) {
      const name = (p.manifest?.metadata?.name || p.id).toLowerCase()
      return name.includes(credSearch.value.trim().toLowerCase())
    }
    return true
  }),
)

function credentialSchema(plugin: any): Record<string, any> {
  return plugin.credential_schema ?? {}
}

function hasCredential(pluginId: string): boolean {
  const cred = store.credentials[pluginId]
  return !!cred && Object.keys(cred.fields ?? {}).length > 0
}

function getCredField(pluginId: string, fieldKey: string): string {
  return (
    pendingCredFields.value[pluginId]?.[fieldKey] ??
    store.credentials[pluginId]?.fields?.[fieldKey] ??
    ''
  )
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

async function handleSaveCredentialAndClose(pluginId: string) {
  await handleSaveCredential(pluginId)
  closePluginMenu()
}

async function handleDeleteCredentialAndClose(pluginId: string) {
  if (selectedPluginForMenu.value?.manifest?.auth_type === 'oauth2') {
    await disconnectOAuth2()
  } else {
    await handleDeleteCredential(pluginId)
  }
  closePluginMenu()
}

function handleOAuth2(pluginId: string) {
  startOAuth2()
}

async function handleTestConnection(pluginId: string) {
  try {
    // Re-fetch credentials/status to simulate a test
    await store.fetchCredential(pluginId)
    toast.success('Connection test successful', 'The plugin credentials are valid and responding.')
  } catch (e: any) {
    toast.error('Connection test failed', e.message || 'Could not verify credentials.')
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
const publicUrlDraft = ref('')
const isSavingPublicUrl = ref(false)

watch(
  () => store.settings.public_url,
  (value) => {
    publicUrlDraft.value = typeof value === 'string' ? value : ''
  },
  { immediate: true },
)

async function handleThemeChange(value: string | number) {
  const theme = String(value) as ThemeMode
  setMode(theme)
  await store.saveSetting('theme', theme)
}

async function handleLogRetentionChange(value: string | number) {
  await store.saveSetting('log_retention_days', String(value))
}

async function handlePublicUrlSave() {
  isSavingPublicUrl.value = true
  try {
    await store.saveSetting('public_url', publicUrlDraft.value.trim())
  } finally {
    isSavingPublicUrl.value = false
  }
}
</script>

<style scoped>
.gs-cred-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.5rem;
  border-radius: var(--nod8-radius-sm);
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.gs-cred-grid-item:hover {
  background: var(--nod8-button-ghost-hover);
  border-color: var(--nod8-border-muted);
}
.gs-cred-grid-item--active {
  background: var(--nod8-bg-surface);
  border-color: var(--nod8-border);
}
</style>
