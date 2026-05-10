<template>
  <img
    v-if="icon.kind === 'image' && !imageFailed"
    :src="icon.value"
    alt=""
    @error="imageFailed = true"
  />
  <LucideIcon v-else :name="fallbackIcon" :size="size" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
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

watch(
  () => props.icon.value,
  () => {
    imageFailed.value = false
  },
)
</script>
