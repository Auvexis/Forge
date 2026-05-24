<template>
  <section
    class="web-page-editor"
    :class="{
      'web-page-editor--left-collapsed': !isLeftPanelOpen,
      'web-page-editor--right-collapsed': !isRightPanelOpen,
    }"
  >
    <PageChromeToolbar @command="handleChromeCommand" />
    <PageFloatingAddToolbar />

    <AppPanel :is-open="isLeftPanelOpen" title="Elements" position="left" width="md" @close="closeLeftPanel">
      <BlockTreePanel
        :pages="pagesStore.pages"
        :active-page-id="pagesStore.activePage?.id"
        :blocks="editorStore.blocks"
        :selected-block-id="editorStore.selectedBlockId"
        @add-page="addPageBelowCanvas"
        @select-page="selectTreePage"
        @select="editorStore.selectBlock"
        @delete-page="deletePageFromTree"
        @duplicate-page="duplicatePageFromTree"
        @delete-block="deleteBlockFromTree"
        @duplicate-block="duplicateBlockFromTree"
        @move-block="moveBlockFromTree"
      />
    </AppPanel>

    <div class="web-page-editor__workspace">
      <template v-for="page in pagesStore.pages" :key="page.id">
        <div class="web-page-editor__page-chip">
          <button
            type="button"
            class="web-page-editor__page-handle"
            :class="{ 'web-page-editor__page-handle--active': page.id === pagesStore.activePage?.id }"
            @click="selectTreePage(page.id)"
          >
            {{ page.title }}
          </button>
          <BaseButton
            variant="ghost"
            size="icon"
            icon-left="trash-2"
            title="Delete page"
            @click.stop="deletePageFromBadge(page.id)"
          />
        </div>
        <PageCanvas
          :blocks="pageBlocks(page.id)"
          :body-styles="pageBodyStyles(page.id)"
          :selected-block-id="page.id === pagesStore.activePage?.id ? editorStore.selectedBlockId : null"
          :drop-intent="page.id === pagesStore.activePage?.id ? editorStore.dragIntent : null"
          :readonly="page.id !== pagesStore.activePage?.id"
          @select="selectCanvasBlock(page.id, $event)"
          @select-body="selectCanvasBody(page.id)"
          @drop-block="handlePageDropBlock(page.id, $event)"
          @drop-root="handlePageDropRoot(page.id, $event)"
          @drag-intent="setPageDragIntent(page.id, $event)"
          @clear-drag-intent="clearPageDragIntent(page.id)"
          @duplicate-block="duplicateBlockFromCanvas"
          @delete-block="deleteBlockFromCanvas"
        />
      </template>

      <div class="web-page-editor__add-page">
        <BaseButton variant="outline" icon-left="plus" @click="addPageBelowCanvas">
          Add page
        </BaseButton>
      </div>
    </div>

    <AppPanel :is-open="isRightPanelOpen" title="Inspector" position="right" width="md" @close="closeRightPanel">
      <PageMetadataPanel
        v-if="pagesStore.activePage && editorStore.selectedTarget.type === 'page'"
        :page="pagesStore.activePage"
        @patch="patchPageMetadata"
      />
      <BlockStylePanel
        v-if="pagesStore.activePage && editorStore.selectedTarget.type === 'body'"
        :block="bodyStyleBlock"
        title="Body"
        @patch="patchBodyStyles"
      />
      <BlockToolbar
        v-if="editorStore.selectedTarget.type === 'block' && editorStore.selectedBlock"
        @delete="deleteSelectedBlock"
        @duplicate="duplicateSelectedBlock"
      />
      <template v-if="editorStore.selectedTarget.type === 'block' && editorStore.selectedBlock">
        <FormImportPanel v-if="editorStore.selectedBlock.tag === 'form'" @insert="insertImportedForm" />
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
      <p v-if="editorStore.selectedTarget.type === 'none'" class="web-page-editor__empty">Select a page, body, or block.</p>
    </AppPanel>

    <PageSwitcherModal
      :is-open="isPageSwitcherOpen"
      :pages="pagesStore.pages"
      :active-page-id="pagesStore.activePage?.id"
      @close="isPageSwitcherOpen = false"
      @select="switchPage"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { usePagesStore } from '../stores/pages.store.ts'
import { usePageEditorStore, type DropEdge } from '../stores/page-editor.store.ts'
import { createBlock } from '../utils/createBlock.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { PageBlock, PageBlockStyles, PageBlockTag, SailorPage } from '../types/page.types.ts'
import PageCanvas from './PageCanvas.vue'
import BlockToolbar from './BlockToolbar.vue'
import BlockTreePanel from './BlockTreePanel.vue'
import PageFloatingAddToolbar from './PageFloatingAddToolbar.vue'
import BlockContentPanel from './BlockContentPanel.vue'
import BlockStylePanel from './BlockStylePanel.vue'
import BlockActionPanel from './BlockActionPanel.vue'
import FormImportPanel from './FormImportPanel.vue'
import PageMetadataPanel from './PageMetadataPanel.vue'
import PageSwitcherModal from './PageSwitcherModal.vue'
import PageChromeToolbar, { type PageChromeCommand } from './PageChromeToolbar.vue'

const route = useRoute()
const router = useRouter()
const pagesStore = usePagesStore()
const editorStore = usePageEditorStore()
const isLeftPanelOpen = ref(true)
const isRightPanelOpen = ref(true)
const isPageSwitcherOpen = ref(false)
const editorPageId = ref<string | null>(null)

const bodyStyleBlock = computed<PageBlock>(() => ({
  id: 'body',
  tag: 'div',
  props: { label: 'body' },
  styles: pagesStore.activePage?.bodyStyles ?? { backgroundColor: '#ffffff', color: '#111111' },
  children: [],
}))

function toggleLeftPanel() {
  isLeftPanelOpen.value = !isLeftPanelOpen.value
}

function toggleRightPanel() {
  isRightPanelOpen.value = !isRightPanelOpen.value
}

function closeLeftPanel() {
  isLeftPanelOpen.value = false
}

function closeRightPanel() {
  isRightPanelOpen.value = false
}

onMounted(async () => {
  await openRoutePage(route.params.pageId)
})

watch(
  () => route.params.pageId,
  (pageId) => {
    void openRoutePage(pageId)
  },
)

async function openRoutePage(pageId: unknown) {
  if (typeof pageId === 'string') {
    if (pagesStore.pages.length === 0) await pagesStore.listPages()
    await pagesStore.loadPageDocuments()
    if (pagesStore.activePage?.id !== pageId) await pagesStore.openPage(pageId)
  }
}

watch(
  () => pagesStore.activePage,
  (page) => {
    if (page?.id === editorPageId.value) return
    editorPageId.value = page?.id ?? null
    editorStore.setBlocks(page?.blocks ?? [])
  },
  { immediate: true },
)

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

function pageBlocks(pageId: string) {
  return pagesStore.activePage?.id === pageId ? editorStore.blocks : (pagesStore.pageDocument(pageId)?.blocks ?? [])
}

function pageBodyStyles(pageId: string): PageBlockStyles | undefined {
  return pagesStore.activePage?.id === pageId ? pagesStore.activePage.bodyStyles : pagesStore.pageDocument(pageId)?.bodyStyles
}

async function ensurePageActive(pageId: string) {
  if (pagesStore.activePage?.id !== pageId) await switchPage(pageId)
  await nextTick()
}

function selectCanvasBlock(pageId: string, blockId: string) {
  void ensurePageActive(pageId).then(() => editorStore.selectBlock(blockId))
}

function selectCanvasBody(pageId: string) {
  void ensurePageActive(pageId).then(() => editorStore.selectBody())
}

function handlePageDropBlock(
  pageId: string,
  payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; draggedId?: string },
) {
  if (pageId !== pagesStore.activePage?.id) return
  handleDropBlock(payload)
}

function handlePageDropRoot(pageId: string, payload: { tag?: PageBlockTag; draggedId?: string }) {
  if (pageId !== pagesStore.activePage?.id) return
  handleDropRoot(payload)
}

function setPageDragIntent(pageId: string, payload: { targetId: string | 'root'; position: InsertPosition; dropEdge?: DropEdge }) {
  if (pageId !== pagesStore.activePage?.id) return
  editorStore.setDragIntent(payload)
}

function clearPageDragIntent(pageId: string) {
  if (pageId !== pagesStore.activePage?.id) return
  editorStore.clearDragIntent()
}

function patchBodyStyles(patch: Partial<PageBlock>) {
  if (!pagesStore.activePage) return
  pagesStore.setActivePage({
    ...pagesStore.activePage,
    bodyStyles: patch.styles ?? pagesStore.activePage.bodyStyles,
  })
}

function patchPageMetadata(patch: Partial<SailorPage>) {
  if (!pagesStore.activePage) return
  pagesStore.setActivePage({ ...pagesStore.activePage, ...patch })
}

async function openPageSwitcher() {
  if (pagesStore.pages.length === 0) await pagesStore.listPages()
  isPageSwitcherOpen.value = true
}

async function switchPage(pageId: string) {
  if (pagesStore.isDirty) await savePage()
  await pagesStore.switchPage(pageId)
  await router.replace(`/pages/${pageId}`)
  isPageSwitcherOpen.value = false
}

async function selectTreePage(pageId: string) {
  await switchPage(pageId)
  await nextTick()
  editorStore.selectPage()
}

async function duplicateActivePage() {
  const page = await pagesStore.duplicateActivePage()
  if (page) await router.replace(`/pages/${page.id}`)
  editorStore.selectPage()
}

async function deleteActivePageAndChooseNext() {
  const page = await pagesStore.deleteActivePageAndChooseNext()
  if (page) {
    await router.replace(`/pages/${page.id}`)
    editorStore.selectPage()
  } else {
    await router.push('/pages')
  }
}

function deleteSelectedBlock() {
  if (!editorStore.selectedBlockId) return
  editorStore.deleteBlock(editorStore.selectedBlockId)
}

function duplicateSelectedBlock() {
  if (!editorStore.selectedBlockId) return
  editorStore.duplicateBlock(editorStore.selectedBlockId)
}

async function deletePageFromTree(pageId: string) {
  if (pagesStore.activePage?.id === pageId) {
    await deleteActivePageAndChooseNext()
    return
  }
  await pagesStore.deletePage(pageId)
}

async function deletePageFromBadge(pageId: string) {
  await deletePageFromTree(pageId)
}

async function duplicatePageFromTree(pageId: string) {
  if (pagesStore.activePage?.id !== pageId) await switchPage(pageId)
  await duplicateActivePage()
}

function deleteBlockFromTree(blockId: string) {
  editorStore.deleteBlock(blockId)
}

function duplicateBlockFromTree(blockId: string) {
  editorStore.duplicateBlock(blockId)
}

function moveBlockFromTree(payload: { targetId: string; position: InsertPosition; draggedId: string }) {
  editorStore.moveBlock(payload.draggedId, payload.targetId, payload.position)
}

function duplicateBlockFromCanvas(blockId: string) {
  editorStore.duplicateBlock(blockId)
}

function deleteBlockFromCanvas(blockId: string) {
  editorStore.deleteBlock(blockId)
}

async function addPageBelowCanvas() {
  if (pagesStore.isDirty) await savePage()
  const page = await pagesStore.createPageAfterActive()
  await router.replace(`/pages/${page.id}`)
  editorPageId.value = page.id
  editorStore.setBlocks(page.blocks)
  editorStore.selectPage()
}

function handleChromeCommand(command: PageChromeCommand) {
  if (command === 'go.pages') void router.push('/pages')
  if (command === 'file.save') void savePage()
  if (command === 'file.preview') previewPage()
  if (command === 'file.publish') void publishPage()
  if (command === 'edit.rename') editorStore.selectPage()
  if (command === 'edit.duplicate') {
    if (editorStore.selectedBlockId) duplicateSelectedBlock()
    else void duplicateActivePage()
  }
  if (command === 'edit.delete') {
    if (editorStore.selectedBlockId) deleteSelectedBlock()
    else void deleteActivePageAndChooseNext()
  }
  if (command === 'view.switch') void openPageSwitcher()
  if (command === 'view.left-panel') toggleLeftPanel()
  if (command === 'view.right-panel') toggleRightPanel()
}

async function savePage() {
  if (!pagesStore.activePage) return
  const selection = editorStore.selectedTarget
  pagesStore.setActivePage({ ...pagesStore.activePage, blocks: editorStore.blocks })
  await pagesStore.saveActivePage()
  editorStore.markSaved()
  restoreSelection(selection)
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

function restoreSelection(selection: typeof editorStore.selectedTarget) {
  if (selection.type === 'page') editorStore.selectPage()
  if (selection.type === 'body') editorStore.selectBody()
  if (selection.type === 'block') editorStore.selectBlock(selection.blockId)
}
</script>
