<template>
  <component
    :is="icon"
    v-if="icon"
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

const icon = computed(() => {
  // Lucide icon names are PascalCase (e.g., FileVideo) or camelCase depending on import
  // But usage might be "file-video" or "FileVideo". Normalize to PascalCase.
  const pascalName = String(props.name).replace(/(^\w|-\w)/g, (match) =>
    match.replace('-', '').toUpperCase(),
  )

  return (LucideIcons as any)[pascalName] || (LucideIcons as any)['HelpCircle']
})
</script>
