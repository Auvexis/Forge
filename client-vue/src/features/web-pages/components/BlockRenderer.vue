<template>
  <component
    :is="renderTag"
    class="web-page-block"
    :class="{ 'web-page-block--selected': selectedBlockId === block.id }"
    @click.stop="$emit('select', block.id)"
  >
    <template v-if="block.tag === 'text' || block.tag === 'button' || block.tag === 'link'">
      {{ block.props?.text ?? block.tag }}
    </template>
    <template v-else-if="block.tag === 'image'">
      <span>{{ block.props?.alt || 'Image' }}</span>
    </template>
    <template v-else-if="block.tag === 'input'">
      <span>{{ block.props?.label || block.props?.name || 'Input' }}</span>
    </template>
    <BlockRenderer
      v-for="child in block.children ?? []"
      :key="child.id"
      :block="child"
      :selected-block-id="selectedBlockId"
      @select="$emit('select', $event)"
    />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlock } from '../types/page.types.ts'

const props = defineProps<{
  block: PageBlock
  selectedBlockId: string | null
}>()

defineEmits<{
  select: [blockId: string]
}>()

const renderTag = computed(() => {
  if (props.block.tag === 'text') return 'span'
  if (props.block.tag === 'image') return 'div'
  if (props.block.tag === 'link') return 'a'
  return props.block.tag
})
</script>
