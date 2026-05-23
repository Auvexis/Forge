<template>
  <nav class="web-page-tree" role="tree">
    <template v-if="pages.length">
      <div v-for="page in pages" :key="page.id" class="web-page-tree__node web-page-tree__node--page">
        <span class="web-page-tree__depth-guide" aria-hidden="true"></span>
        <div
          class="web-page-tree__item web-page-tree__item--page"
          :class="{ 'web-page-tree__item--selected': page.id === activePageId }"
          role="treeitem"
          @click="$emit('select-page', page.id)"
        >
          <button type="button" class="web-page-tree__collapse" :disabled="page.id !== activePageId">
            <LucideIcon :name="page.id === activePageId ? 'chevron-down' : 'chevron-right'" :size="14" />
          </button>
          <span class="web-page-tree__drag-handle web-page-tree__drag-handle--muted">
            <LucideIcon name="file" :size="14" />
          </span>
          <span class="web-page-tree__icon">
            <LucideIcon name="panel-top" :size="15" />
          </span>
          <span class="web-page-tree__main">
            <span class="web-page-tree__tag">page</span>
            <span class="web-page-tree__name">{{ page.title }}</span>
          </span>
          <span v-if="page.id === activePageId" class="web-page-tree__child-count">{{ blocks.length }}</span>
          <button type="button" class="web-page-tree__row-action" @click.stop>
            <LucideIcon name="ellipsis" :size="14" />
          </button>
        </div>
        <div v-if="page.id === activePageId" class="web-page-tree__children" role="group">
          <BlockTreePanel
            :blocks="blocks"
            :selected-block-id="selectedBlockId"
            @select="$emit('select', $event)"
          />
        </div>
      </div>
    </template>

    <div v-for="block in pages.length ? [] : blocks" :key="block.id" class="web-page-tree__node">
      <span class="web-page-tree__depth-guide" aria-hidden="true"></span>
      <div
        class="web-page-tree__item"
        :class="{ 'web-page-tree__item--selected': block.id === selectedBlockId }"
        draggable="true"
        role="treeitem"
        @dragstart="onDragStart($event, block.id)"
        @click="$emit('select', block.id)"
      >
        <button
          type="button"
          class="web-page-tree__collapse"
          :disabled="blockChildCount(block) === 0"
          @click.stop="editorStore.toggleBlockCollapsed(block.id)"
        >
          <LucideIcon :name="editorStore.isBlockCollapsed(block.id) ? 'chevron-right' : 'chevron-down'" :size="14" />
        </button>
        <span class="web-page-tree__drag-handle">
          <LucideIcon name="grip-vertical" :size="14" />
        </span>
        <span class="web-page-tree__icon">
          <LucideIcon :name="iconFor(block)" :size="15" />
        </span>
        <span class="web-page-tree__main">
          <span class="web-page-tree__tag">{{ block.tag }}</span>
          <span class="web-page-tree__name">{{ blockDisplayName(block) }}</span>
        </span>
        <span v-if="blockChildCount(block)" class="web-page-tree__child-count">{{ blockChildCount(block) }}</span>
        <button type="button" class="web-page-tree__row-action" @click.stop>
          <LucideIcon name="ellipsis" :size="14" />
        </button>
      </div>
      <div
        v-if="block.children?.length && !editorStore.isBlockCollapsed(block.id)"
        class="web-page-tree__children"
        role="group"
      >
        <BlockTreePanel
          :blocks="block.children"
          :selected-block-id="selectedBlockId"
          @select="$emit('select', $event)"
        />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PageBlock, SailorPageSummary } from '../types/page.types.ts'
import { blockChildCount, blockDisplayName } from '../utils/blockTree.ts'
import { usePageEditorStore } from '../stores/page-editor.store.ts'

withDefaults(defineProps<{
  blocks: PageBlock[]
  selectedBlockId: string | null
  pages?: SailorPageSummary[]
  activePageId?: string
}>(), {
  pages: () => [],
  activePageId: undefined,
})

const editorStore = usePageEditorStore()

defineEmits<{
  select: [blockId: string]
  'select-page': [pageId: string]
}>()

function onDragStart(event: DragEvent, blockId: string) {
  event.dataTransfer?.setData('application/x-sailor-page-block', JSON.stringify({ blockId }))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function iconFor(block: PageBlock): string {
  if (block.tag === 'image') return 'image'
  if (block.tag === 'form') return 'clipboard-list'
  if (block.tag === 'button') return 'square-mouse-pointer'
  if (block.tag === 'input') return 'text-cursor-input'
  if (block.tag === 'link') return 'link'
  if (block.tag === 'text') return 'type'
  return 'box'
}
</script>
