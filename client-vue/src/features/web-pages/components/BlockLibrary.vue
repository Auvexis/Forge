<template>
  <div class="web-page-library">
    <BaseButton
      v-for="tag in blockTags"
      :key="tag"
      variant="outline"
      size="sm"
      icon-left="plus"
      @click="$emit('add', tag)"
    >
      {{ tag }}
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import type { PageBlockTag } from '../types/page.types.ts'

const blockTags: PageBlockTag[] = [
  'header',
  'section',
  'div',
  'footer',
  'form',
  'button',
  'input',
  'text',
  'image',
  'link',
]

defineEmits<{
  add: [tag: PageBlockTag]
}>()
</script>
