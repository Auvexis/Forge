import { ref, type Ref, toValue, onMounted, onUnmounted } from 'vue'
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
  let connectionPollTimer: number | null = null

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
    const isDesktop = window.fabricDesktop?.isDesktop === true
    const browserTab = isDesktop ? null : window.open('about:blank', '_blank')
    authLoading.value = true
    try {
      const { url } = await pluginsApi.getAuthUrl(id)
      const providerUrl = new URL(url)
      if (providerUrl.protocol !== 'https:' && providerUrl.protocol !== 'http:') {
        throw new Error('OAuth provider returned an unsupported authorization URL.')
      }

      if (isDesktop) {
        await window.fabricDesktop!.openExternal(providerUrl.toString())
      } else if (browserTab) {
        browserTab.opener = null
        browserTab.location.replace(providerUrl.toString())
      } else {
        throw new Error('The browser blocked the OAuth tab. Allow popups for Fabric and try again.')
      }
      awaitingOAuthReturn.value = true
      scheduleConnectionCheck()
    } catch (error) {
      browserTab?.close()
      const message = error instanceof Error ? error.message : 'Could not start OAuth.'
      toast.error('OAuth connection failed', message)
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
      stopConnectionPolling()
      toast.success('OAuth connection successful!', 'Success')
      return
    }
    scheduleConnectionCheck()
  }

  const stopConnectionPolling = () => {
    if (connectionPollTimer !== null) {
      window.clearTimeout(connectionPollTimer)
      connectionPollTimer = null
    }
  }

  const scheduleConnectionCheck = () => {
    stopConnectionPolling()
    if (!awaitingOAuthReturn.value) return
    connectionPollTimer = window.setTimeout(() => {
      connectionPollTimer = null
      void checkConnection()
    }, 1500)
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
    stopConnectionPolling()
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
