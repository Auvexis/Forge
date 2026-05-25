<template>
  <section
    class="web-page-editor"
    :class="{
      'web-page-editor--left-collapsed': !isLeftPanelOpen,
      'web-page-editor--right-collapsed': !isRightPanelOpen,
    }"
  >
    <PageChromeToolbar
      :is-dirty="editorStore.isDirty || pagesStore.isDirty || sitesStore.isDirty"
      :is-saving="pagesStore.isSaving || sitesStore.isSaving"
      :published-at="activePagePublishedAt"
      @command="handleChromeCommand"
    />
    <PageFloatingAddToolbar
      :model-value="activeTool"
      :left-panel-open="isLeftPanelOpen"
      :right-panel-open="isRightPanelOpen"
      @update:model-value="activeTool = $event"
    />

    <AppPanel
      :is-open="isLeftPanelOpen"
      title="Explorer"
      position="left"
      width="md"
      resizable
      resize-side="right"
      @close="closeLeftPanel"
    >
      <PageExplorerPanel
        :site="sitesStore.activeSite"
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
        @open-file="openCodeFile"
        @create-file="createCodeFile"
      />
    </AppPanel>

    <div
      ref="workspaceRef"
      class="web-page-editor__workspace"
      :class="{
        'web-page-editor__workspace--pan': activeTool === 'pan',
        'web-page-editor__workspace--panning': isPanningWorkspace,
      }"
      @click.self="clearEditorSelection"
      @pointerdown="startWorkspacePan"
      @pointermove="panWorkspace"
      @pointerup="stopWorkspacePan"
      @pointerleave="stopWorkspacePan"
    >
      <SiteCodeCanvas
        v-if="activeCodeFile"
        :file="activeCodeFile"
        :model-value="activeCodeContent"
        :readonly="isActiveCodeFileReadonly"
        @update:model-value="updateActiveCodeContent"
      />

      <template v-else>
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
            :active-tool="activeTool"
            @select="selectCanvasBlock(page.id, $event)"
            @select-body="selectCanvasBody(page.id)"
            @drop-block="handlePageDropBlock(page.id, $event)"
            @drop-root="handlePageDropRoot(page.id, $event)"
            @drag-intent="setPageDragIntent(page.id, $event)"
            @clear-drag-intent="clearPageDragIntent(page.id)"
            @duplicate-block="duplicateBlockFromCanvas"
            @delete-block="deleteBlockFromCanvas"
            @inspect-block="handleInspectBlock(page.id, $event)"
          />
        </template>
      </template>

      <div class="web-page-editor__add-page">
        <BaseButton variant="outline" icon-left="plus" @click="addPageBelowCanvas">
          Add page
        </BaseButton>
      </div>
    </div>

    <AppPanel
      :is-open="isRightPanelOpen"
      title="Inspector"
      position="right"
      width="md"
      resizable
      resize-side="left"
      @close="closeRightPanel"
    >
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
      <template v-if="editorStore.selectedTarget.type === 'block' && editorStore.selectedBlock">
        <FormImportPanel v-if="editorStore.selectedBlock.tag === 'form'" @insert="insertImportedForm" />
        <BlockContentPanel
          :block="editorStore.selectedBlock"
          @patch="editorStore.patchBlock(editorStore.selectedBlock!.id, $event)"
        />
        <BlockAdvancedPanel
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import { API_BASE_URL } from '@/core/constants/app.ts'
import { ENDPOINTS } from '@/core/api/endpoints.ts'
import { usePagesStore } from '../stores/pages.store.ts'
import { usePageEditorStore, type DropEdge } from '../stores/page-editor.store.ts'
import { useSitesStore } from '../stores/sites.store.ts'
import { createBlock } from '../utils/createBlock.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { PageBlock, PageBlockStyles, PageBlockTag, SailorPage, SiteFile } from '../types/page.types.ts'
import PageCanvas from './PageCanvas.vue'
import PageExplorerPanel from './PageExplorerPanel.vue'
import SiteCodeCanvas from './SiteCodeCanvas.vue'
import PageFloatingAddToolbar from './PageFloatingAddToolbar.vue'
import BlockContentPanel from './BlockContentPanel.vue'
import BlockAdvancedPanel from './BlockAdvancedPanel.vue'
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
const sitesStore = useSitesStore()
const isLeftPanelOpen = ref(true)
const isRightPanelOpen = ref(true)
const isPageSwitcherOpen = ref(false)
const editorPageId = ref<string | null>(null)
type PageCanvasTool = 'cursor' | 'pan' | 'delete'
const activeTool = ref<PageCanvasTool>('cursor')
const activeCodeFile = ref<SiteFile | null>(null)
const workspaceRef = ref<HTMLElement | null>(null)
const isPanningWorkspace = ref(false)
const panStart = ref({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, pointerId: -1 })
const activePagePublishedAt = computed(
  () => pagesStore.pages.find((page) => page.id === pagesStore.activePage?.id)?.publishedAt ?? null,
)
const activeCodeContent = computed(() => {
  if (!activeCodeFile.value) return ''
  if (activeCodeFile.value.path.startsWith('pages/')) return renderGeneratedHtml(activeCodeFile.value.path)
  return sitesStore.activeSite?.files.find((file) => file.path === activeCodeFile.value?.path)?.content ?? activeCodeFile.value.content ?? ''
})
const isActiveCodeFileReadonly = computed(() => activeCodeFile.value?.path.endsWith('.html') ?? false)

const bodyStyleBlock = computed<PageBlock>(() => ({
  id: 'body',
  tag: 'div',
  props: { label: 'body' },
  styles: pagesStore.activePage?.bodyStyles ?? { backgroundColor: '#ffffff', color: '#111111' },
  children: [],
}))

function openCodeFile(file: SiteFile) {
  activeCodeFile.value = file
  editorStore.clearSelection()
}

function createCodeFile(path: string) {
  if (!sitesStore.activeSite) return
  if (!sitesStore.activeSite.files.some((file) => file.path === path)) {
    sitesStore.createFile(path, '')
  }
  const file = sitesStore.activeSite.files.find((item) => item.path === path) ?? { path, kind: 'file' as const, content: '', updatedAt: '' }
  openCodeFile(file)
}

function updateActiveCodeContent(value: string) {
  if (!activeCodeFile.value || isActiveCodeFileReadonly.value) return
  sitesStore.updateFile(activeCodeFile.value.path, value)
}

function renderGeneratedHtml(filePath: string) {
  const slug = filePath.replace(/^pages\//, '').replace(/\.html$/, '')
  const page = pagesStore.pages.find((item) => item.slug === slug)
  if (!page) return '<!doctype html>\n<html><body></body></html>'
  return `<!doctype html>\n<html>\n<head>\n  <title>${escapeHtml(page.title)}</title>\n</head>\n<body>\n  <!-- Generated preview for ${escapeHtml(page.title)} -->\n</body>\n</html>`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function closeLeftPanel() {
  isLeftPanelOpen.value = false
}

function closeRightPanel() {
  isRightPanelOpen.value = false
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyboardSave)
  await openInitialSite()
  await openRoutePage(route.params.pageId)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardSave)
})

async function openInitialSite() {
  if (sitesStore.activeSite) return
  const sites = await sitesStore.listSites()
  if (sites[0]) {
    sitesStore.setActiveSite(sites[0])
    pagesStore.setActiveSiteId(sites[0].id)
  }
}

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

function clearEditorSelection() {
  editorStore.clearSelection()
}

function startWorkspacePan(event: PointerEvent) {
  if (activeTool.value !== 'pan' || !workspaceRef.value) return
  event.preventDefault()
  isPanningWorkspace.value = true
  panStart.value = {
    x: event.clientX,
    y: event.clientY,
    scrollLeft: workspaceRef.value.scrollLeft,
    scrollTop: workspaceRef.value.scrollTop,
    pointerId: event.pointerId,
  }
  workspaceRef.value.setPointerCapture?.(event.pointerId)
}

function panWorkspace(event: PointerEvent) {
  if (!isPanningWorkspace.value || !workspaceRef.value) return
  workspaceRef.value.scrollLeft = panStart.value.scrollLeft - (event.clientX - panStart.value.x)
  workspaceRef.value.scrollTop = panStart.value.scrollTop - (event.clientY - panStart.value.y)
}

function stopWorkspacePan(event?: PointerEvent) {
  if (!isPanningWorkspace.value) return
  if (event && workspaceRef.value?.hasPointerCapture?.(event.pointerId)) {
    workspaceRef.value.releasePointerCapture?.(event.pointerId)
  }
  isPanningWorkspace.value = false
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
  activeCodeFile.value = null
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

function deleteSelectedTarget() {
  if (editorStore.selectedBlockId) {
    editorStore.deleteBlock(editorStore.selectedBlockId)
    return
  }
  if (editorStore.selectedTarget.type === 'page') void deleteActivePageAndChooseNext()
}

function handleInspectBlock(pageId: string, blockId: string) {
  void ensurePageActive(pageId).then(() => {
    editorStore.selectBlock(blockId)
    isRightPanelOpen.value = true
  })
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
  if (command === 'file.save') void saveActiveDocument()
  if (command === 'file.preview') previewPage()
  if (command === 'file.publish') void publishPage()
  if (command === 'file.unpublish') void unpublishPage()
  if (command === 'file.openLive') openLivePage()
  if (command === 'edit.rename') editorStore.selectPage()
  if (command === 'edit.duplicate') {
    if (editorStore.selectedBlockId) editorStore.duplicateBlock(editorStore.selectedBlockId)
    else void duplicateActivePage()
  }
  if (command === 'edit.delete') {
    if (editorStore.selectedBlockId) editorStore.deleteBlock(editorStore.selectedBlockId)
    else void deleteActivePageAndChooseNext()
  }
  if (command === 'view.switch') void openPageSwitcher()
  if (command === 'view.left-panel') toggleLeftPanel()
  if (command === 'view.right-panel') toggleRightPanel()
}

function handleKeyboardSave(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== 's') return
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  void saveActiveDocument()
}

async function saveActiveDocument() {
  if (activeCodeFile.value) {
    await sitesStore.saveActiveSite()
    return
  }
  await savePage()
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
  window.open(`${API_BASE_URL}${ENDPOINTS.PAGE_PREVIEW(pagesStore.activePage.id)}`, '_blank', 'noopener')
}

async function publishPage() {
  await savePage()
  await pagesStore.publishActivePage()
}

async function unpublishPage() {
  if (!pagesStore.activePage || !activePagePublishedAt.value) return
  await pagesStore.unpublishActivePage()
}

function openLivePage() {
  const slug = pagesStore.activePage?.slug
  if (!slug || !activePagePublishedAt.value) return
  window.open(`${API_BASE_URL}${ENDPOINTS.PUBLISHED_PAGE(slug)}`, '_blank', 'noopener')
}

function restoreSelection(selection: typeof editorStore.selectedTarget) {
  if (selection.type === 'page') editorStore.selectPage()
  if (selection.type === 'body') editorStore.selectBody()
  if (selection.type === 'block') editorStore.selectBlock(selection.blockId)
}

function toggleLeftPanel() {
  isLeftPanelOpen.value = !isLeftPanelOpen.value
}

function toggleRightPanel() {
  isRightPanelOpen.value = !isRightPanelOpen.value
}
</script>
