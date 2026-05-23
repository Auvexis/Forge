<template>
  <section class="web-page-editor">
    <AppPanel :is-open="true" title="Elements" position="left" width="md" :show-close="false">
      <BlockTreePanel
        :blocks="editorStore.blocks"
        :selected-block-id="editorStore.selectedBlockId"
        @select="editorStore.selectBlock"
      />
    </AppPanel>

    <PageCanvas
      :blocks="editorStore.blocks"
      :body-styles="pagesStore.activePage?.bodyStyles"
      :selected-block-id="editorStore.selectedBlockId"
      @select="editorStore.selectBlock"
      @drop-block="handleDropBlock"
      @drop-root="handleDropRoot"
    />

    <div class="web-page-editor__actions">
      <BaseButton variant="secondary" icon-left="save" :loading="pagesStore.isSaving" @click="savePage">
        Save
      </BaseButton>
      <BaseButton variant="outline" icon-left="eye" @click="previewPage">
        Preview
      </BaseButton>
      <BaseButton variant="primary" icon-left="send" @click="publishPage">
        Publish
      </BaseButton>
    </div>

    <AppPanel :is-open="true" title="Inspector" position="right" width="md" :show-close="false">
      <BlockLibrary @add="addBlock" />
      <FormImportPanel @insert="insertImportedForm" />
      <BlockStylePanel
        v-if="pagesStore.activePage"
        :block="bodyStyleBlock"
        title="Body"
        @patch="patchBodyStyles"
      />
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
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { usePagesStore } from '../stores/pages.store.ts'
import { usePageEditorStore } from '../stores/page-editor.store.ts'
import { createBlock } from '../utils/createBlock.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { PageBlock, PageBlockTag } from '../types/page.types.ts'
import PageCanvas from './PageCanvas.vue'
import BlockToolbar from './BlockToolbar.vue'
import BlockTreePanel from './BlockTreePanel.vue'
import BlockLibrary from './BlockLibrary.vue'
import BlockContentPanel from './BlockContentPanel.vue'
import BlockStylePanel from './BlockStylePanel.vue'
import BlockActionPanel from './BlockActionPanel.vue'
import FormImportPanel from './FormImportPanel.vue'

const route = useRoute()
const pagesStore = usePagesStore()
const editorStore = usePageEditorStore()

const bodyStyleBlock = computed<PageBlock>(() => ({
  id: 'body',
  tag: 'div',
  props: { label: 'body' },
  styles: pagesStore.activePage?.bodyStyles ?? { backgroundColor: '#ffffff', color: '#111111' },
  children: [],
}))

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

function handleDropBlock(payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; draggedId?: string }) {
  if (payload.draggedId) editorStore.moveBlock(payload.draggedId, payload.targetId, payload.position)
  else if (payload.tag) editorStore.insertBlock(payload.targetId, payload.position, createBlock(payload.tag))
}

function handleDropRoot(payload: { tag?: PageBlockTag; draggedId?: string }) {
  if (payload.draggedId && editorStore.blocks.length > 0) {
    editorStore.moveBlock(payload.draggedId, editorStore.blocks[editorStore.blocks.length - 1]!.id, 'after')
  } else if (payload.tag) {
    editorStore.setBlocks([...editorStore.blocks, createBlock(payload.tag)])
  }
}

function insertImportedForm(block: PageBlock) {
  const targetId = editorStore.selectedBlockId ?? editorStore.blocks[editorStore.blocks.length - 1]?.id
  if (targetId) editorStore.insertBlock(targetId, 'after', block)
  else editorStore.setBlocks([block])
}

function patchBodyStyles(patch: Partial<PageBlock>) {
  if (!pagesStore.activePage) return
  pagesStore.setActivePage({
    ...pagesStore.activePage,
    bodyStyles: patch.styles ?? pagesStore.activePage.bodyStyles,
  })
}

async function savePage() {
  if (!pagesStore.activePage) return
  pagesStore.setActivePage({ ...pagesStore.activePage, blocks: editorStore.blocks })
  await pagesStore.saveActivePage()
  editorStore.markSaved()
}

function previewPage() {
  if (!pagesStore.activePage) return
  window.open(`/pages/${pagesStore.activePage.id}/preview`, '_blank')
}

async function publishPage() {
  await savePage()
  const published = await pagesStore.publishActivePage()
  if (published) window.open(`/p/${published.slug}`, '_blank')
}
</script>
