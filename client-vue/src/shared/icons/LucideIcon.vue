<template>
  <div v-if="isUrl" class="lucide-icon-img" :style="{ width: sizeCss, height: sizeCss }">
    <img
      :src="name"
      alt="icon"
      :class="className"
      style="max-width: 100%; max-height: 100%; object-fit: contain"
    />
  </div>
  <component
    :is="icon"
    v-else-if="icon"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
    :class="className"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import * as LucideIcons from 'lucide-vue-next'
import { isIconUrl } from './iconRendering'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number | string
    color?: string
    strokeWidth?: number | string
    className?: string
  }>(),
  {
    size: 24,
    color: 'currentColor',
    strokeWidth: 2,
    className: '',
  },
)

const isUrl = computed(() => {
  return isIconUrl(props.name)
})

const sizeCss = computed(() => {
  return typeof props.size === 'number' ? `${props.size}px` : String(props.size)
})

const icon = computed(() => {
  if (isUrl.value) return null

  // Lucide icon names are PascalCase (e.g., FileVideo) or camelCase depending on import
  // But usage might be "file-video" or "FileVideo". Normalize to PascalCase.
  const pascalName = String(props.name).replace(/(^\w|-\w)/g, (match) =>
    match.replace('-', '').toUpperCase(),
  )

  return (LucideIcons as any)[pascalName] || (LucideIcons as any)['HelpCircle']
})
</script>

<style scoped>
.lucide-icon-img {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
