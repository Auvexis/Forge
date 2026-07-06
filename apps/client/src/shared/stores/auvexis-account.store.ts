import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  auvexisAccountApi,
  type AuvexisAccountConnectionStatus,
  type AuvexisAccountProfile,
} from '@/core/api/auvexis-account.api'

export const useAuvexisAccountStore = defineStore('auvexis-account', () => {
  const status = ref<AuvexisAccountConnectionStatus>('disconnected')
  const account = ref<AuvexisAccountProfile | null>(null)
  const lastValidatedAt = ref<string | null>(null)
  const isLoading = ref(false)
  const isConnecting = ref(false)
  const isDisconnecting = ref(false)
  const error = ref<string | null>(null)

  async function loadStatus() {
    isLoading.value = true
    error.value = null
    try {
      const result = await auvexisAccountApi.getStatus()
      status.value = result.status
      account.value = result.account
      lastValidatedAt.value = result.lastValidatedAt
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load Auvexis account'
    } finally {
      isLoading.value = false
    }
  }

  async function connect() {
    isConnecting.value = true
    error.value = null
    try {
      const result = await auvexisAccountApi.startConnect()
      window.open(result.authorizationUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start Auvexis connection'
    } finally {
      isConnecting.value = false
    }
  }

  async function logout() {
    isDisconnecting.value = true
    error.value = null
    try {
      await auvexisAccountApi.revoke()
      clearProfileScopedState()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect Auvexis account'
    } finally {
      isDisconnecting.value = false
    }
  }

  function clearProfileScopedState() {
    status.value = 'disconnected'
    account.value = null
    lastValidatedAt.value = null
  }

  return {
    status,
    account,
    lastValidatedAt,
    isLoading,
    isConnecting,
    isDisconnecting,
    error,
    loadStatus,
    connect,
    logout,
    clearProfileScopedState,
  }
})
