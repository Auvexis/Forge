import { ref, watch, type Ref, toValue, onMounted, onUnmounted } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import type { PluginStatusResponse } from '@/core/types/plugin.types'
import { useToast } from '@/shared/composables/useToast'

export function usePluginAuth(pluginIdOrGetter: Ref<string | null> | (() => string | null) | string | null) {
  const pluginStatus = ref<PluginStatusResponse | null>(null)
  const formValues = ref<Record<string, any>>({})
  const saving = ref(false)
  const authLoading = ref(false)
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
    authLoading.value = true
    try {
      const data = await pluginsApi.getAuthUrl(id)
      if (data?.url) {
        const win = window.open(data.url, '_blank', 'width=600,height=700')
        const timer = setInterval(() => {
          if (win?.closed) {
            clearInterval(timer)
            loadStatus()
          }
        }, 1000)
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

  const handleMessage = (event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return
    
    if (event.data.type === 'oauth-success' && event.data.plugin === getPluginId()) {
      toast.success('OAuth connection successful!', 'Success')
      loadStatus()
    } else if (event.data.type === 'oauth-error' && event.data.plugin === getPluginId()) {
      toast.error(`OAuth connection failed: ${event.data.error}`, 'Error')
      loadStatus()
    }
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

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
