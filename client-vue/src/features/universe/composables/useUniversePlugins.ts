import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import { mapPluginsToUniverse } from '../utils/pluginUniverseMapper'
import type { UniversePluginMap } from '../types/universe.types'
import { PROFILE_SWITCH_REFRESH_EVENT } from '@/features/profiles/profileSwitchRefresh'

export function useUniversePlugins() {
  const plugins = shallowRef<UniversePluginMap>(mapPluginsToUniverse([]))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const hasPlugins = computed(() => plugins.value.totalPlugins > 0)

  async function loadPlugins() {
    isLoading.value = true
    error.value = null

    try {
      const pluginSummaries = await pluginsApi.getAll()
      plugins.value = mapPluginsToUniverse(pluginSummaries)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to load Universe plugins.'
      plugins.value = mapPluginsToUniverse([])
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    loadPlugins()
    window.addEventListener(PROFILE_SWITCH_REFRESH_EVENT, loadPlugins)
  })

  onBeforeUnmount(() => {
    window.removeEventListener(PROFILE_SWITCH_REFRESH_EVENT, loadPlugins)
  })

  return {
    plugins,
    isLoading,
    error,
    hasPlugins,
    loadPlugins,
  }
}
