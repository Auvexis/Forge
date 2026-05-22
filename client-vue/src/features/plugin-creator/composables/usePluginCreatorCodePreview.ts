import { ref, watch, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'

import { pluginCreatorApi } from '@/core/api/plugin-creator.api'
import type { PluginBlueprint } from '@/core/types/plugin-creator.types'

export function usePluginCreatorCodePreview(blueprint: Ref<PluginBlueprint | null | undefined>) {
  const code = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const refresh = useDebounceFn(async () => {
    if (!blueprint.value) {
      code.value = ''
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const preview = await pluginCreatorApi.previewCode(blueprint.value)
      code.value = preview.files.find((file) => file.relativePath === 'methods.ts')?.content ?? ''
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to preview generated code'
    } finally {
      isLoading.value = false
    }
  }, 350)

  watch(blueprint, () => void refresh(), { deep: true, immediate: true })

  return { code, isLoading, error, refresh }
}
