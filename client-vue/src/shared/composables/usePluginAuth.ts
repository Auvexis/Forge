import { ref, watch, type Ref, toValue } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import type { PluginStatusResponse } from '@/core/types/plugin.types'

export function usePluginAuth(pluginIdOrGetter: Ref<string | null> | (() => string | null) | string | null) {
  const pluginStatus = ref<PluginStatusResponse | null>(null)
  const formValues = ref<Record<string, any>>({})
  const saving = ref(false)
  const authLoading = ref(false)

  const getPluginId = () => {
    return toValue(pluginIdOrGetter)
  }

  const loadStatus = async () => {
    const id = getPluginId()
    if (!id) {
      pluginStatus.value = null
      formValues.value = {}
      return
    }
    
    try {
      const data = await pluginsApi.getStatus(id)
      pluginStatus.value = data
      if (data?.credentials) {
        formValues.value = { ...data.credentials }
      }
    } catch (error) {
      console.error('Failed to load plugin status', error)
    }
  }

  const isLocked = (key: string) => {
    return (pluginStatus.value?.locked_fields ?? []).includes(key)
  }

  const handleSaveCredentials = async () => {
    const id = getPluginId()
    if (!id) return
    saving.value = true
    try {
      await pluginsApi.saveCredentials(id, formValues.value)
      await loadStatus()
    } catch (err) {
      console.error(err)
    } finally {
      saving.value = false
    }
  }

  const handleConnect = async () => {
    const id = getPluginId()
    if (!id) return
    authLoading.value = true
    try {
      const data = await pluginsApi.getAuthUrl(id)
      if (data?.url) {
        window.open(data.url, '_blank', 'width=600,height=700')
        // Simple mockup to reload status after the window opens
        setTimeout(() => loadStatus(), 3000)
      }
    } catch (err) {
      console.error(err)
    } finally {
      authLoading.value = false
    }
  }

  const handleDisconnect = async () => {
    const id = getPluginId()
    if (!id) return
    try {
      await pluginsApi.disconnectAuth(id)
      await loadStatus()
    } catch (err) {
      console.error(err)
    }
  }

  return {
    pluginStatus,
    formValues,
    saving,
    authLoading,
    loadStatus,
    isLocked,
    handleSaveCredentials,
    handleConnect,
    handleDisconnect
  }
}
