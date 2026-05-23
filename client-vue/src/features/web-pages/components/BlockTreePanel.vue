<template>
  <nav class="web-page-tree">
    <button
      v-for="block in blocks"
      :key="block.id"
      class="web-page-tree__item"
      :class="{ 'web-page-tree__item--selected': block.id === selectedBlockId }"
      type="button"
      @click="$emit('select', block.id)"
    >
      {{ block.tag }} <span>{{ block.id }}</span>
    </button>
    <div v-for="block in blocks" :key="`${block.id}-children`" class="web-page-tree__children">
      <BlockTreePanel
        v-if="block.children?.length"
        :blocks="block.children"
        :selected-block-id="selectedBlockId"
        @select="$emit('select', $event)"
      />
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { PageBlock } from '../types/page.types.ts'

defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
}>()

defineEmits<{
  select: [blockId: string]
}>()
</script>
