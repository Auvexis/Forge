import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiRequest } from '@/core/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlobalVariable {
  key: string
  value: string
  description: string
  created_at: string
  updated_at: string
}

export interface AppSettings {
  theme?: string
  public_url?: string
  [key: string]: unknown
}

export interface PluginCredential {
  plugin_id: string
  fields: Record<string, string>
}

// ─── Store ────────────────────────────────────────────────────────────────────

/**
 * useSettingsStore — Independent state for the Global Settings panel.
 *
 * This store owns:
 *  - The open/close state of the slide-over menu
 *  - The list of global environment variables
 *  - App preferences (theme, etc.)
 *
 * It does NOT depend on sidebar-panel.store, app-panel.store, or any plugin store.
 */
export const useSettingsStore = defineStore('settings', () => {
  // ── Panel Visibility ──────────────────────────────────────────────────────

  const isOpen = ref(false)

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  // ── Global Variables ──────────────────────────────────────────────────────

  const variables = ref<GlobalVariable[]>([])
  const isLoadingVariables = ref(false)
  const variablesError = ref<string | null>(null)

  async function fetchVariables() {
    isLoadingVariables.value = true
    variablesError.value = null
    try {
      variables.value = await apiRequest<GlobalVariable[]>('/app/variables')
    } catch (err: any) {
      variablesError.value = err.message
    } finally {
      isLoadingVariables.value = false
    }
  }

  async function saveVariable(key: string, value: string, description = '') {
    await apiRequest(`/app/variables/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value, description },
    })
    await fetchVariables()
  }

  async function deleteVariable(key: string) {
    await apiRequest(`/app/variables/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    })
    await fetchVariables()
  }

  // ── App Settings / Preferences ────────────────────────────────────────────

  const settings = ref<AppSettings>({})
  const isLoadingSettings = ref(false)

  async function fetchSettings() {
    isLoadingSettings.value = true
    try {
      const data = await apiRequest<AppSettings>('/app/settings')
      settings.value = data ?? {}
    } catch {
      // ignore
    } finally {
      isLoadingSettings.value = false
    }
  }

  async function saveSetting(key: string, value: unknown) {
    await apiRequest(`/app/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { value },
    })
    settings.value[key] = value
  }

  // ── Credentials ───────────────────────────────────────────────────────────

  const credentials = ref<Record<string, PluginCredential>>({})
  const isLoadingCredential = ref<Record<string, boolean>>({})

  async function fetchCredential(pluginId: string) {
    isLoadingCredential.value[pluginId] = true
    try {
      const data = await apiRequest<PluginCredential>(`/credentials/${encodeURIComponent(pluginId)}`)
      credentials.value[pluginId] = data
    } catch {
      // not found or error — remove from map
      delete credentials.value[pluginId]
    } finally {
      isLoadingCredential.value[pluginId] = false
    }
  }

  async function saveCredential(pluginId: string, fields: Record<string, string>) {
    await apiRequest(`/credentials/${encodeURIComponent(pluginId)}`, {
      method: 'PUT',
      body: { fields },
    })
    await fetchCredential(pluginId)
  }

  async function deleteCredential(pluginId: string) {
    await apiRequest(`/credentials/${encodeURIComponent(pluginId)}`, {
      method: 'DELETE',
    })
    delete credentials.value[pluginId]
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  const activeTab = ref<string>('preferences')
  const targetPluginId = ref<string | null>(null)

  function openCredentialsFor(pluginId: string) {
    activeTab.value = 'credentials'
    targetPluginId.value = pluginId
    isOpen.value = true
  }

  return {
    // Panel state
    isOpen,
    open,
    close,
    toggle,
    activeTab,
    targetPluginId,
    openCredentialsFor,
    // Variables
    variables,
    isLoadingVariables,
    variablesError,
    fetchVariables,
    saveVariable,
    deleteVariable,
    // Settings
    settings,
    isLoadingSettings,
    fetchSettings,
    saveSetting,
    // Credentials
    credentials,
    isLoadingCredential,
    fetchCredential,
    saveCredential,
    deleteCredential,
  }
})
