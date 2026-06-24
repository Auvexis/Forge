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
      :can-undo="editorStore.canUndo"
      :can-redo="editorStore.canRedo"
      :published-at="activePagePublishedAt"
      @command="handleChromeCommand"
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
        :selected-block-ids="editorStore.selectedBlockIds"
        @add-page="addPageAtEnd"
        @select-page="selectTreePage"
        @select="editorStore.selectBlock"
        @delete-page="deletePageFromTree"
        @duplicate-page="duplicatePageFromTree"
        @delete-block="deleteBlockFromTree"
        @duplicate-block="duplicateBlockFromTree"
        @move-block="moveBlockFromTree"
        @open-file="openCodeFile"
        @create-file="createCodeFile"
        @create-folder="createCodeFolder"
        @upload-asset="uploadSiteAsset"
        @delete-file="deleteCodeFile"
      />
    </AppPanel>

    <div
      ref="workspaceRef"
      class="web-page-editor__workspace"
      :class="{
        'web-page-editor__workspace--pan': activeTool === 'pan' || isSpacePanActive,
        'web-page-editor__workspace--panning': isPanningWorkspace,
      }"
      @click.self="clearEditorSelection"
      @pointerdown.self="startWorkspacePan"
      @pointermove="panWorkspace"
      @pointerup="stopWorkspacePan"
      @pointerleave="stopWorkspacePan"
    >
      <Transition name="web-page-code-editor">
        <SiteCodeCanvas
          v-if="activeCodeFile"
          :file="activeCodeFile"
          :model-value="activeCodeContent"
          :readonly="isActiveCodeFileReadonly"
          @update:model-value="updateActiveCodeContent"
          @close="closeCodeCanvas"
        />
      </Transition>

      <template v-if="!activeCodeFile">
        <BaseCanvas
          v-model:selection="pageCanvasSelection"
          v-model:viewport="pageCanvasViewport"
          class="web-page-editor__base-canvas"
          :items="pageCanvasItems"
          :rulers="true"
          :snap-to-grid="false"
          background-color="var(--sailor-bg-canvas)"
          pattern-color="var(--sailor-border)"
          pattern-style="dot"
          :pattern-size="18"
          rulers-bg="var(--sailor-bg-canvas)"
          rulers-text="var(--sailor-text-muted)"
          rulers-lines="var(--sailor-border)"
          @canvas-click="closePageCanvasContextMenu"
          @item-click="closePageCanvasContextMenu"
          @items-move="handlePageCanvasItemsMove"
          @context-menu="openPageCanvasContextMenu"
          @dragover.capture="handlePageDragOver"
          @dragleave.capture="clearPageDropIntent"
          @drop.capture="handlePageDrop"
        >
          <template #item="{ item }">
            <div
              class="web-page-editor__page-shell"
              :data-page-id="item.id"
            >
              <span
                v-if="pageDropIndex === pageIndex(item.id) || pageDropIndex === pageIndex(item.id) + 1"
                class="web-page-editor__page-drop-indicator"
                :class="pageDropIndex === pageIndex(item.id)
                  ? 'web-page-editor__page-drop-indicator--before'
                  : 'web-page-editor__page-drop-indicator--after'"
              />
              <div class="web-page-editor__page-chip">
                <button
                  type="button"
                  class="web-page-editor__page-handle"
                  :class="{ 'web-page-editor__page-handle--active': item.id === pagesStore.activePage?.id }"
                  @click="selectTreePage(item.id)"
                >
                  {{ pageTitle(item.id) }}
                </button>
                <BaseButton
                  variant="ghost"
                  size="icon"
                  icon-left="trash-2"
                  title="Delete page"
                  @click.stop="deletePageFromBadge(item.id)"
                />
              </div>
              <PageCanvas
                :blocks="pageBlocks(item.id)"
                :body-styles="pageBodyStyles(item.id)"
                :selected-block-id="item.id === pagesStore.activePage?.id ? editorStore.selectedBlockId : null"
                :drop-intent="item.id === pagesStore.activePage?.id ? editorStore.dragIntent : null"
                :deleting-block-ids="deletingBlockIds"
                :readonly="item.id !== pagesStore.activePage?.id"
                :active-tool="activeTool"
                @select="selectCanvasBlock(item.id, $event)"
                @select-body="selectCanvasBody(item.id)"
                @drop-block="handlePageDropBlock(item.id, $event)"
                @drop-root="handlePageDropRoot(item.id, $event)"
                @drag-intent="setPageDragIntent(item.id, $event)"
                @clear-drag-intent="clearPageDragIntent(item.id)"
                @duplicate-block="duplicateBlockFromCanvas"
                @delete-block="deleteBlockFromCanvas"
                @inspect-block="handleInspectBlock(item.id, $event)"
                @resize-block="resizeBlockFromCanvas(item.id, $event)"
                @rename-block="renameBlockFromCanvas(item.id, $event)"
                @patch-block="patchBlockFromCanvas(item.id, $event)"
              />
            </div>
          </template>
        </BaseCanvas>
        <div
          v-if="pageCanvasContextMenu"
          class="web-page-canvas-context-menu"
          :style="{ left: `${pageCanvasContextMenu.screen.x}px`, top: `${pageCanvasContextMenu.screen.y}px` }"
          @click.stop
        >
          <BaseButton variant="ghost" icon-left="plus" @click="addPageFromContextMenu">
            Add page
          </BaseButton>
          <BaseButton
            variant="ghost"
            icon-left="copy"
            :disabled="!pageCanvasContextMenuPageId"
            @click="duplicatePageFromContextMenu"
          >
            Duplicate page
          </BaseButton>
          <BaseButton
            variant="ghost"
            icon-left="trash-2"
            :disabled="!pageCanvasContextMenuPageId"
            @click="deletePageFromContextMenu"
          >
            Delete page
          </BaseButton>
        </div>
      </template>
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
        <p v-if="editorStore.selectedBlockIds.length > 1 && selectedBlocksSameType" class="web-page-editor__batch">
          Editing {{ editorStore.selectedBlockIds.length }} {{ editorStore.selectedBlock.tag }} elements
        </p>
        <FormImportPanel v-if="editorStore.selectedBlock.tag === 'form'" @insert="insertImportedForm" />
        <div class="web-page-editor__inspector-tabs">
          <BaseSegmentedSelect
            v-model="blockInspectorTab"
            :options="blockInspectorTabs"
            aria-label="Inspector panel"
            :icon-size="15"
          />
        </div>
        <BlockContentPanel
          v-if="blockInspectorTab === 'content'"
          :block="editorStore.selectedBlock"
          @patch="patchSelectedOrSingleBlock"
          @upload-image="uploadImageForSelectedBlock"
        />
        <BlockAdvancedPanel
          v-if="blockInspectorTab === 'advanced'"
          :block="editorStore.selectedBlock"
          @patch="patchSelectedOrSingleBlock"
        />
        <BlockStylePanel
          v-if="blockInspectorTab === 'style'"
          :block="editorStore.selectedBlock"
          @patch="patchSelectedOrSingleBlock"
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
import BaseSegmentedSelect, { type BaseSegmentedSelectOption } from '@/shared/components/base/BaseSegmentedSelect.vue'
import { BaseCanvas } from '@/shared/base-canvas/components.ts'
import type { BaseCanvasContextMenuEvent, BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
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
import BlockContentPanel from './BlockContentPanel.vue'
import BlockAdvancedPanel from './BlockAdvancedPanel.vue'
import BlockStylePanel from './BlockStylePanel.vue'
import FormImportPanel from './FormImportPanel.vue'
import PageMetadataPanel from './PageMetadataPanel.vue'
import PageSwitcherModal from './PageSwitcherModal.vue'
import PageChromeToolbar, { type PageChromeCommand } from './PageChromeToolbar.vue'

const route = useRoute()
const router = useRouter()
const pagesStore = usePagesStore()
const editorStore = usePageEditorStore()
const sitesStore = useSitesStore()
const INITIAL_CANVAS_TOP_OFFSET = 120
const isLeftPanelOpen = ref(true)
const isRightPanelOpen = ref(true)
const isPageSwitcherOpen = ref(false)
const editorPageId = ref<string | null>(null)
type PageCanvasTool = 'cursor' | 'pan' | 'delete'
const activeTool = ref<PageCanvasTool>('cursor')
const blockInspectorTab = ref<'content' | 'style' | 'advanced'>('content')
const activeCodeFile = ref<SiteFile | null>(null)
const deletingBlockIds = ref<string[]>([])
const workspaceRef = ref<HTMLElement | null>(null)
const isPanningWorkspace = ref(false)
const isSpacePanActive = ref(false)
const panStart = ref({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, pointerId: -1 })
const pageCanvasViewport = ref<BaseCanvasViewport>({ x: 0, y: 88, zoom: 1 })
const pageCanvasSelection = ref<string[]>([])
const pageCanvasOffsets = ref<Record<string, { x: number; y: number }>>({})
const pageCanvasContextMenu = ref<BaseCanvasContextMenuEvent | null>(null)
const pageDropIndex = ref<number | null>(null)
const activePagePublishedAt = computed(
  () => pagesStore.pages.find((page) => page.id === pagesStore.activePage?.id)?.publishedAt ?? null,
)
const blockInspectorTabs: BaseSegmentedSelectOption[] = [
  { value: 'content', label: 'Content', title: 'Content', icon: 'sliders-horizontal' },
  { value: 'style', label: 'Style', title: 'Style', icon: 'palette' },
  { value: 'advanced', label: 'Advanced', title: 'Advanced', icon: 'code-2' },
]
const workspacePlaneStyle = computed(() => ({}))
const pageCanvasItems = computed<BaseCanvasItem[]>(() => pagesStore.pages.map((page, index) => {
  const offset = pageCanvasOffsets.value[page.id] ?? { x: 0, y: 0 }
  return {
    id: page.id,
    x: 120 + offset.x,
    y: index * 1160 + offset.y,
    width: 960,
    height: 1080,
    data: { kind: 'page' },
  }
}))
const pageCanvasContextMenuPageId = computed(() => {
  const target = pageCanvasContextMenu.value?.target
  return target?.type === 'item' ? target.itemId : null
})
const activeCodeContent = computed(() => {
  if (!activeCodeFile.value) return ''
  if (activeCodeFile.value.path.startsWith('pages/')) return renderGeneratedHtml(activeCodeFile.value.path)
  return sitesStore.activeSite?.files.find((file) => file.path === activeCodeFile.value?.path)?.content ?? activeCodeFile.value.content ?? ''
})
const isActiveCodeFileReadonly = computed(() => activeCodeFile.value?.path.endsWith('.html') ?? false)
const selectedBlocksSameType = computed(() => {
  const selected = editorStore.selectedBlocks
  return selected.length > 1 && selected.every((block) => block.tag === selected[0]?.tag)
})

const bodyStyleBlock = computed<PageBlock>(() => ({
  id: 'body',
  tag: 'div',
  props: { label: 'body' },
  styles: pagesStore.activePage?.bodyStyles ?? defaultBodyStyles(),
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

function createCodeFolder(path: string) {
  if (!sitesStore.activeSite) return
  sitesStore.createFolder(path)
}

async function uploadSiteAsset(file: File) {
  await sitesStore.uploadAsset(file)
}

function closeCodeCanvas() {
  activeCodeFile.value = null
}

function patchSelectedOrSingleBlock(patch: Partial<PageBlock>) {
  if (selectedBlocksSameType.value) {
    editorStore.patchSelectedBlocks(patch)
    return
  }
  if (editorStore.selectedBlock) editorStore.patchBlock(editorStore.selectedBlock.id, patch)
}

function resizeBlockFromCanvas(pageId: string, payload: { blockId: string; styles: PageBlockStyles | undefined }) {
  if (pageId !== pagesStore.activePage?.id || !payload.styles) return
  editorStore.patchBlock(payload.blockId, { styles: { ...editorStore.selectedBlock?.styles, ...payload.styles } })
}

function renameBlockFromCanvas(pageId: string, payload: { blockId: string; nextId: string }) {
  if (pageId !== pagesStore.activePage?.id) return
  editorStore.renameBlockId(payload.blockId, payload.nextId)
}

function patchBlockFromCanvas(pageId: string, payload: { blockId: string; patch: Partial<PageBlock> }) {
  if (pageId !== pagesStore.activePage?.id) return
  editorStore.patchBlock(payload.blockId, payload.patch)
}

function deleteCodeFile(path: string) {
  if (!sitesStore.deleteFile(path)) return
  if (activeCodeFile.value?.path === path) closeCodeCanvas()
}

function updateActiveCodeContent(value: string) {
  if (!activeCodeFile.value || isActiveCodeFileReadonly.value) return
  sitesStore.updateFile(activeCodeFile.value.path, value)
}

function renderGeneratedHtml(filePath: string) {
  const slug = filePath.replace(/^pages\//, '').replace(/\.html$/, '')
  const page = pagesStore.activePage?.slug === slug
    ? pagesStore.activePage
    : pagesStore.pages.find((item) => item.slug === slug)
  if (!page) return '<!doctype html>\n<html><body></body></html>'
  const blocks = 'blocks' in page ? page.blocks : []
  const css = [
    renderGeneratedPageCss(blocks),
    ...(sitesStore.activeSite?.files ?? [])
      .filter((file) => file.kind === 'file' && file.path.startsWith('css/') && file.path.endsWith('.css'))
      .map((file) => file.content ?? ''),
  ].filter(Boolean).join('\n')
  const js = [
    renderGeneratedPageJs(blocks),
    ...(sitesStore.activeSite?.files ?? [])
      .filter((file) => file.kind === 'file' && file.path.startsWith('js/') && file.path.endsWith('.js'))
      .map((file) => file.content ?? ''),
  ].filter(Boolean).join('\n')

  const scriptOpen = '<script>'
  const scriptClose = '<' + '/script>'
  const safeJs = js.replace(new RegExp('<' + '/script', 'gi'), '<\\/script')
  return `<!doctype html>\n<html>\n<head>\n  <title>${escapeHtml(page.title)}</title>\n  <style>${css}</style>\n</head>\n<body>\n${blocks.map(renderGeneratedBlockHtml).join('\n')}\n${js ? `${scriptOpen}${safeJs}${scriptClose}` : ''}\n</body>\n</html>`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderGeneratedBlockHtml(block: PageBlock): string {
  const tag = block.tag === 'text' ? 'span' : block.tag === 'image' ? 'img' : block.tag === 'youtube' ? 'iframe' : block.tag
  const className = ['sailor-page-block', blockClass(block.id), block.className].filter(Boolean).join(' ')
  const attrs = [
    `class="${escapeHtml(className)}"`,
    block.elementId ? `id="${escapeHtml(block.elementId)}"` : '',
    ...Object.entries(block.attributes ?? {}).map(([key, value]) => `${key}="${escapeHtml(String(value))}"`),
  ].filter(Boolean).join(' ')
  if (block.tag === 'image') return `<img ${attrs} src="${escapeHtml(resolveGeneratedMediaUrl(String(block.props?.src ?? '')))}" alt="${escapeHtml(String(block.props?.alt ?? ''))}">`
  if (block.tag === 'audio') return `<audio ${attrs} src="${escapeHtml(resolveGeneratedMediaUrl(String(block.props?.src ?? '')))}"${block.props?.controls !== false ? ' controls' : ''}></audio>`
  if (block.tag === 'video') return `<video ${attrs} src="${escapeHtml(resolveGeneratedMediaUrl(String(block.props?.src ?? '')))}" poster="${escapeHtml(resolveGeneratedMediaUrl(String(block.props?.poster ?? '')))}"${block.props?.controls !== false ? ' controls' : ''}></video>`
  if (block.tag === 'youtube') return `<iframe ${attrs} src="${escapeHtml(youtubeEmbedSrc(block.props))}" title="${escapeHtml(String(block.props?.title ?? 'Youtube video'))}" allowfullscreen></iframe>`
  if (block.tag === 'input') return `<input ${attrs} name="${escapeHtml(String(block.props?.name ?? ''))}" placeholder="${escapeHtml(String(block.props?.placeholder ?? ''))}">`
  const text = ['text', 'button', 'link'].includes(block.tag) ? escapeHtml(String(block.props?.text ?? '')) : ''
  return `<${tag} ${attrs}>${text}${(block.children ?? []).map(renderGeneratedBlockHtml).join('')}</${tag}>`
}

function youtubeEmbedSrc(props: PageBlock['props']) {
  const videoId = String(props?.videoId ?? '').trim() || youtubeIdFromUrl(String(props?.url ?? ''))
  return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : ''
}

function youtubeIdFromUrl(value: string) {
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/)
  return match?.[1] ?? ''
}

function resolveGeneratedMediaUrl(value: string) {
  if (value.startsWith('/sites/')) return `${API_BASE_URL}${value}`
  return value
}

function renderGeneratedPageCss(blocks: PageBlock[]): string {
  return blocks.flatMap((block) => {
    const declarations = Object.entries(block.styles ?? {})
      .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`)
      .join(' ')
    const ownCss = [
      declarations ? `.${blockClass(block.id)} { ${declarations} }` : '',
      block.customCss?.includes('{') ? block.customCss : block.customCss ? `.${blockClass(block.id)} { ${block.customCss} }` : '',
    ].filter(Boolean)
    return [...ownCss, ...renderGeneratedPageCss(block.children ?? []).split('\n').filter(Boolean)]
  }).join('\n')
}

function renderGeneratedPageJs(blocks: PageBlock[]): string {
  return blocks.flatMap((block) => {
    const script = block.customJs
      ? `;(() => { const element = document.querySelector('.${blockClass(block.id)}'); const block = element; ${block.customJs} })();`
      : ''
    return [script, renderGeneratedPageJs(block.children ?? [])].filter(Boolean)
  }).join('\n')
}

function blockClass(id: string) {
  return `sailor-block-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function closeLeftPanel() {
  isLeftPanelOpen.value = false
}

function closeRightPanel() {
  isRightPanelOpen.value = false
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyboardShortcuts)
  window.addEventListener('keydown', handleSpacePanKeyDown)
  window.addEventListener('keyup', handleSpacePanKeyUp)
  await openInitialSite()
  await openRoutePage(route.params.pageId)
  await nextTick()
  positionInitialCanvas()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts)
  window.removeEventListener('keydown', handleSpacePanKeyDown)
  window.removeEventListener('keyup', handleSpacePanKeyUp)
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

function positionInitialCanvas() {
  if (!workspaceRef.value) return
  workspaceRef.value.scrollLeft = 0
  workspaceRef.value.scrollTop = INITIAL_CANVAS_TOP_OFFSET
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

function handleDropBlock(payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; preset?: string; draggedId?: string }) {
  if (payload.draggedId) editorStore.moveBlock(payload.draggedId, payload.targetId, payload.position)
  else if (payload.tag) editorStore.insertBlock(payload.targetId, payload.position, createBlock(payload.tag, undefined, payload.preset))
}

function handleDropRoot(payload: { tag?: PageBlockTag; preset?: string; draggedId?: string }) {
  if (payload.draggedId && editorStore.blocks.length > 0) {
    editorStore.moveBlock(payload.draggedId, editorStore.blocks[editorStore.blocks.length - 1]!.id, 'after')
  } else if (payload.tag) {
    editorStore.appendBlock(createBlock(payload.tag, undefined, payload.preset))
  }
}

function insertImportedForm(block: PageBlock) {
  const targetId = editorStore.selectedBlockId ?? editorStore.blocks[editorStore.blocks.length - 1]?.id
  if (targetId) editorStore.insertBlock(targetId, 'after', block)
  else editorStore.appendBlock(block)
}

function pageBlocks(pageId: string) {
  return pagesStore.activePage?.id === pageId ? editorStore.blocks : (pagesStore.pageDocument(pageId)?.blocks ?? [])
}

function pageBodyStyles(pageId: string): PageBlockStyles | undefined {
  return pagesStore.activePage?.id === pageId ? pagesStore.activePage.bodyStyles : pagesStore.pageDocument(pageId)?.bodyStyles
}

function pageTitle(pageId: string) {
  return pagesStore.pages.find((page) => page.id === pageId)?.title ?? 'Untitled'
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
  pageCanvasSelection.value = []
  closePageCanvasContextMenu()
}

function handlePageCanvasItemsMove(event: BaseCanvasItemsMoveEvent) {
  pageCanvasOffsets.value = event.itemIds.reduce((offsets, itemId) => {
    const current = offsets[itemId] ?? { x: 0, y: 0 }
    return {
      ...offsets,
      [itemId]: {
        x: current.x + event.delta.x,
        y: current.y + event.delta.y,
      },
    }
  }, { ...pageCanvasOffsets.value })
}

function openPageCanvasContextMenu(event: BaseCanvasContextMenuEvent) {
  pageCanvasContextMenu.value = event
  if (event.target.type === 'item') {
    pageCanvasSelection.value = [event.target.itemId]
    void ensurePageActive(event.target.itemId).then(() => editorStore.selectPage())
  }
}

function closePageCanvasContextMenu() {
  pageCanvasContextMenu.value = null
}

async function addPageFromContextMenu() {
  closePageCanvasContextMenu()
  await addPageBelowCanvas()
}

function pageIndex(pageId: string) {
  return pagesStore.pages.findIndex((page) => page.id === pageId)
}

function handlePageDragOver(event: DragEvent) {
  const dataTransfer = event.dataTransfer
  if (!dataTransfer || !isPageDrag(event)) return
  event.preventDefault()
  event.stopPropagation()
  pageDropIndex.value = closestPageDropIndex(event)
  dataTransfer.dropEffect = 'copy'
}

function clearPageDropIntent(event?: DragEvent) {
  const related = event?.relatedTarget
  const currentTarget = event?.currentTarget as HTMLElement | null | undefined
  if (related instanceof Node && currentTarget?.contains(related)) return
  pageDropIndex.value = null
}

async function handlePageDrop(event: DragEvent) {
  if (!isPageDrag(event)) return
  event.preventDefault()
  event.stopPropagation()
  const index = pageDropIndex.value ?? closestPageDropIndex(event)
  pageDropIndex.value = null
  if (pagesStore.isDirty) await savePage()
  const page = await pagesStore.createPageAt(index)
  await activateCreatedPage(page)
}

function isPageDrag(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('application/x-sailor-page')
}

function closestPageDropIndex(event: DragEvent) {
  const canvas = event.currentTarget as HTMLElement | null
  const shells = Array.from(canvas?.querySelectorAll<HTMLElement>('[data-page-id]') ?? [])
    .map((shell) => ({
      index: pageIndex(shell.dataset.pageId ?? ''),
      middle: shell.getBoundingClientRect().top + shell.getBoundingClientRect().height / 2,
    }))
    .filter((item) => item.index >= 0)
    .sort((left, right) => left.index - right.index)
  const next = shells.find((item) => event.clientY < item.middle)
  return next?.index ?? pagesStore.pages.length
}

async function duplicatePageFromContextMenu() {
  const pageId = pageCanvasContextMenuPageId.value
  closePageCanvasContextMenu()
  if (!pageId) return
  await duplicatePageFromTree(pageId)
}

async function deletePageFromContextMenu() {
  const pageId = pageCanvasContextMenuPageId.value
  closePageCanvasContextMenu()
  if (!pageId) return
  await deletePageFromTree(pageId)
}

function startWorkspacePan(event: PointerEvent) {
  const shouldPan = activeTool.value === 'pan' || isSpacePanActive.value || event.button === 1
  if (!shouldPan || !workspaceRef.value) return
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
  payload: { targetId: string; position: InsertPosition; tag?: PageBlockTag; preset?: string; draggedId?: string },
) {
  if (pageId !== pagesStore.activePage?.id) return
  handleDropBlock(payload)
}

function handlePageDropRoot(pageId: string, payload: { tag?: PageBlockTag; preset?: string; draggedId?: string }) {
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
  requestAnimatedBlockDelete(blockId)
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
  requestAnimatedBlockDelete(blockId)
}

function deleteSelectedTarget() {
  if (editorStore.selectedBlockId) {
    requestAnimatedBlockDelete(editorStore.selectedBlockId)
    return
  }
  if (editorStore.selectedTarget.type === 'page') void deleteActivePageAndChooseNext()
}

async function uploadImageForSelectedBlock(file: File) {
  if (!editorStore.selectedBlockId) return
  const asset = await sitesStore.uploadAsset(file)
  if (!asset?.url) return
  editorStore.patchBlock(editorStore.selectedBlockId, {
    props: { ...(editorStore.selectedBlock?.props ?? {}), src: asset.url },
  })
}

function requestAnimatedBlockDelete(blockId: string) {
  if (deletingBlockIds.value.includes(blockId)) return
  deletingBlockIds.value = [...deletingBlockIds.value, blockId]
  window.setTimeout(() => {
    editorStore.deleteBlock(blockId)
    deletingBlockIds.value = deletingBlockIds.value.filter((id) => id !== blockId)
  }, 140)
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
  await activateCreatedPage(page)
}

async function addPageAtEnd() {
  if (pagesStore.isDirty) await savePage()
  const page = await pagesStore.createPageAt(pagesStore.pages.length)
  await activateCreatedPage(page)
}

async function activateCreatedPage(page: SailorPage) {
  await router.replace(`/pages/${page.id}`)
  editorPageId.value = page.id
  editorStore.setBlocks(page.blocks)
  editorStore.selectPage()
  await nextTick()
  positionInitialCanvas()
}

function handleChromeCommand(command: PageChromeCommand) {
  if (command === 'go.pages') void router.push('/pages')
  if (command === 'file.save') void saveActiveDocument()
  if (command === 'file.preview') previewPage()
  if (command === 'file.togglePublish') void togglePagePublication()
  if (command === 'file.openLive') openLivePage()
  if (command === 'file.exportProject') void exportActiveProject()
  if (command === 'edit.undo') undoPageEdit()
  if (command === 'edit.redo') redoPageEdit()
  if (command === 'edit.rename') editorStore.selectPage()
  if (command === 'edit.duplicate') {
    if (editorStore.selectedBlockId) editorStore.duplicateBlock(editorStore.selectedBlockId)
    else void duplicateActivePage()
  }
  if (command === 'edit.delete') {
    if (editorStore.selectedBlockId) requestAnimatedBlockDelete(editorStore.selectedBlockId)
    else void deleteActivePageAndChooseNext()
  }
  if (command === 'view.switch') void openPageSwitcher()
  if (command === 'view.left-panel') toggleLeftPanel()
  if (command === 'view.right-panel') toggleRightPanel()
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if (!event.ctrlKey && !event.metaKey) return
  if (isTypingInField(event.target) && event.key.toLowerCase() !== 's') return
  if (event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault()
    undoPageEdit()
    return
  }
  if (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey)) {
    event.preventDefault()
    redoPageEdit()
    return
  }
  if (event.key.toLowerCase() !== 's') return
  event.preventDefault()
  void saveActiveDocument()
}

function undoPageEdit() {
  if (activeCodeFile.value || !editorStore.canUndo) return
  editorStore.undo()
}

function redoPageEdit() {
  if (activeCodeFile.value || !editorStore.canRedo) return
  editorStore.redo()
}

function handleSpacePanKeyDown(event: KeyboardEvent) {
  if (event.code !== 'Space' || isTypingInField(event.target)) return
  isSpacePanActive.value = true
}

function handleSpacePanKeyUp(event: KeyboardEvent) {
  if (event.code !== 'Space') return
  isSpacePanActive.value = false
}

function isTypingInField(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
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

async function togglePagePublication() {
  if (activePagePublishedAt.value) await unpublishPage()
  else await publishPage()
}

function openLivePage() {
  const slug = pagesStore.activePage?.slug
  if (!slug || !activePagePublishedAt.value) return
  window.open(`${API_BASE_URL}${ENDPOINTS.PUBLISHED_PAGE(slug)}`, '_blank', 'noopener')
}

async function exportActiveProject() {
  await saveProjectBeforeExport()
  const zip = await sitesStore.exportActiveSiteProject()
  if (!zip) return
  downloadBlobFile(`${sitesStore.activeSite?.slug ?? 'site'}.sailor-site.zip`, zip)
}

async function saveProjectBeforeExport() {
  if (pagesStore.isDirty || editorStore.isDirty) await savePage()
  if (sitesStore.isDirty) await sitesStore.saveActiveSite()
}

function downloadBlobFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
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

function defaultBodyStyles(): PageBlockStyles {
  return {
    width: '100vw',
    minHeight: '100vh',
    margin: '0',
    padding: '0',
    gap: '0',
    backgroundColor: '#ffffff',
    color: '#111111',
  }
}
</script>
