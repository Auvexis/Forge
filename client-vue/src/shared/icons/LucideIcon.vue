<template>
  <div v-if="isUrl" class="lucide-icon-img" :style="{ width: `${size}px`, height: `${size}px` }">
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
  const n = String(props.name).toLowerCase()
  return (
    n.startsWith('http') ||
    n.startsWith('/') ||
    n.startsWith('data:image/') ||
    /\.(png|jpg|jpeg|svg|webp|gif|avif)$/.test(n)
  )
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
