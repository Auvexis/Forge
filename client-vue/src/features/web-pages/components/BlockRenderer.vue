<template>
  <component
    :is="renderTag"
    class="web-page-block"
    :class="{ 'web-page-block--selected': selectedBlockId === block.id }"
    @click.stop="$emit('select', block.id)"
  >
    <button type="button" class="web-page-drop-zone" @click.stop="emitDrop('before', 'section')">
      before
    </button>
    <button
      v-if="isContainer"
      type="button"
      class="web-page-drop-zone"
      @click.stop="emitDrop('inside', 'text')"
    >
      inside
    </button>
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
      @drop-block="$emit('drop-block', $event)"
    />
    <button type="button" class="web-page-drop-zone" @click.stop="emitDrop('after', 'section')">
      after
    </button>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'

const props = defineProps<{
  block: PageBlock
  selectedBlockId: string | null
}>()

const emit = defineEmits<{
  select: [blockId: string]
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag: PageBlockTag }]
}>()

const isContainer = computed(() =>
  ['header', 'section', 'div', 'footer', 'form'].includes(props.block.tag),
)

const renderTag = computed(() => {
  if (props.block.tag === 'text') return 'span'
  if (props.block.tag === 'image') return 'div'
  if (props.block.tag === 'link') return 'a'
  return props.block.tag
})

function emitDrop(position: InsertPosition, tag: PageBlockTag) {
  emit('drop-block', { targetId: props.block.id, position, tag })
}
</script>
