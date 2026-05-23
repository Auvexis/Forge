<template>
  <section class="web-page-editor">
    <AppPanel :is-open="true" title="Blocks" position="left" width="md" :show-close="false">
      <BlockLibrary @add="addBlock" />
      <BlockTreePanel
        :blocks="pagesStore.activePage?.blocks ?? []"
        :selected-block-id="editorStore.selectedBlockId"
        @select="editorStore.selectBlock"
      />
    </AppPanel>

    <PageCanvas
      :blocks="editorStore.blocks"
      :selected-block-id="editorStore.selectedBlockId"
      @select="editorStore.selectBlock"
      @drop-block="handleDropBlock"
    />

    <AppPanel :is-open="true" title="Inspector" position="right" width="md" :show-close="false">
      <BlockToolbar
        v-if="editorStore.selectedBlock"
        @delete="editorStore.deleteBlock(editorStore.selectedBlock.id)"
        @duplicate="editorStore.duplicateBlock(editorStore.selectedBlock.id)"
      />
      <template v-if="editorStore.selectedBlock">
        <BlockContentPanel
          :block="editorStore.selectedBlock"
          @patch="editorStore.patchBlock(editorStore.selectedBlock!.id, $event)"
        />
        <BlockStylePanel
          :block="editorStore.selectedBlock"
          @patch="editorStore.patchBlock(editorStore.selectedBlock!.id, $event)"
        />
        <BlockActionPanel
          :block="editorStore.selectedBlock"
          @patch="editorStore.patchBlock(editorStore.selectedBlock!.id, $event)"
        />
      </template>
      <p v-else class="web-page-editor__empty">Select a block.</p>
    </AppPanel>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import { usePagesStore } from '../stores/pages.store.ts'
import { usePageEditorStore } from '../stores/page-editor.store.ts'
import { createBlock } from '../utils/createBlock.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { PageBlockTag } from '../types/page.types.ts'
import PageCanvas from './PageCanvas.vue'
import BlockToolbar from './BlockToolbar.vue'
import BlockTreePanel from './BlockTreePanel.vue'
import BlockLibrary from './BlockLibrary.vue'
import BlockContentPanel from './BlockContentPanel.vue'
import BlockStylePanel from './BlockStylePanel.vue'
import BlockActionPanel from './BlockActionPanel.vue'

const route = useRoute()
const pagesStore = usePagesStore()
const editorStore = usePageEditorStore()

onMounted(async () => {
  const pageId = route.params.pageId
  if (typeof pageId === 'string') {
    await pagesStore.openPage(pageId)
  }
})

watch(
  () => pagesStore.activePage,
  (page) => {
    editorStore.setBlocks(page?.blocks ?? [])
  },
  { immediate: true },
)

function addBlock(tag: PageBlockTag) {
  const block = createBlock(tag)
  const targetId = editorStore.selectedBlockId ?? editorStore.blocks[editorStore.blocks.length - 1]?.id
  if (targetId) editorStore.insertBlock(targetId, 'after', block)
  else editorStore.setBlocks([block])
}

function handleDropBlock(payload: { targetId: string; position: InsertPosition; tag: PageBlockTag }) {
  editorStore.insertBlock(payload.targetId, payload.position, createBlock(payload.tag))
}
</script>
