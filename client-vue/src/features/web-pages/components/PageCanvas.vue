<template>
  <main class="web-page-canvas">
    <span class="web-page-canvas__drop-contract" hidden>before inside after</span>
    <div v-if="blocks.length === 0" class="web-page-canvas__empty">
      Empty canvas
    </div>
    <BlockRenderer
      v-for="block in blocks"
      :key="block.id"
      :block="block"
      :selected-block-id="selectedBlockId"
      @select="$emit('select', $event)"
      @drop-block="$emit('drop-block', $event)"
    />
  </main>
</template>

<script setup lang="ts">
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import BlockRenderer from './BlockRenderer.vue'

defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
}>()

defineEmits<{
  select: [blockId: string]
  'drop-block': [payload: { targetId: string; position: InsertPosition; tag: PageBlockTag }]
}>()
</script>
