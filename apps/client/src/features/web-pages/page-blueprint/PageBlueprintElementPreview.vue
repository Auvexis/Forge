<template>
  <component
    :is="renderTag"
    class="web-page-blueprint-preview__element"
    :style="block.styles"
    :src="block.tag === 'image' ? String(block.props?.src ?? '') : undefined"
  >
    <template v-if="['text', 'button', 'link'].includes(block.tag)">{{ block.props?.text ?? block.tag }}</template>
    <template v-else-if="block.tag === 'input'">{{ block.props?.label ?? block.props?.name ?? 'Input' }}</template>
    <template v-else-if="!block.children?.length && block.tag !== 'image'">{{ block.props?.label ?? block.tag }}</template>
    <PageBlueprintElementPreview
      v-for="child in block.children ?? []"
      :key="child.id"
      :block="child"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlock } from '../types/page.types.ts'

defineOptions({ name: 'PageBlueprintElementPreview' })

const props = defineProps<{ block: PageBlock }>()

const renderTag = computed(() => {
  if (props.block.tag === 'text') return 'p'
  if (props.block.tag === 'image') return 'img'
  if (props.block.tag === 'youtube') return 'div'
  return props.block.tag
})
</script>
