<template>
  <img
    v-if="icon.kind === 'image' && !imageFailed && !isTintableIcon"
    :src="icon.value"
    alt=""
    @error="imageFailed = true"
  />
  <LucideIcon v-else :name="iconName" :size="size" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { isTintableExternalIcon } from '@/shared/icons/iconRendering'
import type { UniversePluginNode } from '../types/universe.types'

const props = withDefaults(
  defineProps<{
    icon: UniversePluginNode['icon']
    fallback?: string
    size?: number
  }>(),
  {
    fallback: 'blocks',
    size: 22,
  },
)

const imageFailed = ref(false)
const fallbackIcon = computed(() => props.fallback || 'blocks')
const isTintableIcon = computed(() => props.icon.kind === 'image' && isTintableExternalIcon(props.icon.value))
const iconName = computed(() => {
  if (props.icon.kind === 'image' && isTintableIcon.value && !imageFailed.value) {
    return props.icon.value
  }

  return fallbackIcon.value
})

watch(
  () => props.icon.value,
  () => {
    imageFailed.value = false
  },
)
</script>
