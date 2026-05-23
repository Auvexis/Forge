<template>
  <section class="web-page-editor">
    <AppPanel :is-open="true" title="Blocks" position="left" width="md" :show-close="false">
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
    />

    <AppPanel :is-open="true" title="Inspector" position="right" width="md" :show-close="false">
      <BlockToolbar
        v-if="editorStore.selectedBlock"
        @delete="editorStore.deleteBlock(editorStore.selectedBlock.id)"
        @duplicate="editorStore.duplicateBlock(editorStore.selectedBlock.id)"
      />
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
import PageCanvas from './PageCanvas.vue'
import BlockToolbar from './BlockToolbar.vue'
import BlockTreePanel from './BlockTreePanel.vue'

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
</script>
