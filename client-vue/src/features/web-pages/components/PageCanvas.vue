<template>
  <main class="web-page-canvas">
    <div v-if="blocks.length === 0" class="web-page-canvas__empty">
      Empty canvas
    </div>
    <BlockRenderer
      v-for="block in blocks"
      :key="block.id"
      :block="block"
      :selected-block-id="selectedBlockId"
      @select="$emit('select', $event)"
    />
  </main>
</template>

<script setup lang="ts">
import type { PageBlock } from '../types/page.types.ts'
import BlockRenderer from './BlockRenderer.vue'

defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
}>()

defineEmits<{
  select: [blockId: string]
}>()
</script>
