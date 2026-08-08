import { ref, watch, type Ref } from 'vue'
import { apiRequest } from '@/core/api/client'
import { ENDPOINTS } from '@/core/api/endpoints'
import { useTheme } from '@/shared/composables/useTheme'
import { resolvePluginIcon } from '@/shared/icons/pluginIconResolver'

export function usePluginNodePresentation(pluginId: Ref<string>, fallback = 'box') {
  const pluginIcon = ref(fallback)
  const customBg = ref<string>()
  const customBorder = ref<string>()
  const customIconColor = ref<string>()
  const { iconVariant } = useTheme()

  async function load() {
    pluginIcon.value = fallback
    customBg.value = undefined
    customBorder.value = undefined
    customIconColor.value = undefined
    if (!pluginId.value) return
    try {
      const plugin = await apiRequest<any>(ENDPOINTS.PLUGIN_BY_ID(pluginId.value))
      const metadata = plugin?.manifest?.metadata
      if (!metadata) return
      customBg.value = metadata.style?.bgColor
      customBorder.value = metadata.style?.borderColor
      customIconColor.value = metadata.style?.iconColor
      pluginIcon.value = resolvePluginIcon(metadata, { iconVariant: iconVariant.value, fallback })
    } catch (error) {
      console.warn(`Failed to load plugin presentation for ${pluginId.value}`, error)
    }
  }

  watch(pluginId, load, { immediate: true })
  watch(iconVariant, load)
  return { pluginIcon, customBg, customBorder, customIconColor }
}
