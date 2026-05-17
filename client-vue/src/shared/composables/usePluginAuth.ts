import { ref, watch, type Ref, toValue, onMounted, onUnmounted } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import type { PluginStatusResponse } from '@/core/types/plugin.types'
import { useToast } from '@/shared/composables/useToast'

export function usePluginAuth(pluginIdOrGetter: Ref<string | null> | (() => string | null) | string | null) {
  const pluginStatus = ref<PluginStatusResponse | null>(null)
  const formValues = ref<Record<string, any>>({})
  const saving = ref(false)
  const authLoading = ref(false)
  const awaitingOAuthReturn = ref(false)
  const toast = useToast()

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
    if (pluginStatus.value?.oauth_public_url_required) {
      toast.error(
        'Public URL required',
        'Set Public URL in Settings or PUBLIC_URL on the Sailor server before connecting.',
      )
      return
    }

    authLoading.value = true
    try {
      const data = await pluginsApi.getAuthUrl(id)
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
        awaitingOAuthReturn.value = true
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

  const checkConnection = async () => {
    await loadStatus()
    if (pluginStatus.value?.status === 'connected') {
      awaitingOAuthReturn.value = false
      toast.success('OAuth connection successful!', 'Success')
    }
  }

  const handleFocus = () => {
    if (awaitingOAuthReturn.value) {
      void checkConnection()
    }
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && awaitingOAuthReturn.value) {
      void checkConnection()
    }
  }

  onMounted(() => {
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    window.removeEventListener('focus', handleFocus)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    pluginStatus,
    formValues,
    saving,
    authLoading,
    awaitingOAuthReturn,
    loadStatus,
    isLocked,
    handleSaveCredentials,
    handleConnect,
    handleDisconnect,
    checkConnection
  }
}
