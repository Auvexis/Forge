<template>
  <section
    class="web-page-editor"
    :class="{
      'web-page-editor--left-collapsed': !isLeftWorkspacePanelVisible,
      'web-page-editor--right-collapsed': !isInspectorVisible,
    }"
    :style="pageEditorLayoutStyle"
  >
    <Teleport defer to="#fabric-topbar-context">
      <PageProjectTopbarDropdown
        :active-project="sitesStore.activeSite"
        :projects="sitesStore.sites"
        :is-open="isOpenProjectModalOpen"
        :is-dirty="editorStore.isDirty || pagesStore.isDirty || sitesStore.isDirty || blueprintStore.isDirty"
        :is-saving="pagesStore.isSaving || sitesStore.isSaving"
        @open="openProjectFromTopbar"
        @select-project="openProject"
      />
    </Teleport>

    <PageChromeToolbar
      :is-dirty="editorStore.isDirty || pagesStore.isDirty || sitesStore.isDirty || blueprintStore.isDirty"
      :is-saving="pagesStore.isSaving || sitesStore.isSaving"
      :can-undo="activePageDocument === 'blueprint' ? blueprintStore.canUndo : editorStore.canUndo"
      :can-redo="activePageDocument === 'blueprint' ? blueprintStore.canRedo : editorStore.canRedo"
      :published-at="activePagePublishedAt"
      :is-autosave-enabled="isPagesAutosaveEnabled"
      :is-explorer-open="isExplorerVisible"
      :is-inspector-open="isInspectorVisible"
      :is-blueprint-toolbox-open="isBlueprintToolboxVisible"
      :show-panel-controls="activePageDocument === 'design'"
      :show-blueprint-toolbox-control="activePageDocument === 'blueprint'"
      :show-blueprint-inspector-control="activePageDocument === 'blueprint'"
      :can-save="canSaveActiveDocument"
      :can-use-project-actions="hasCreatedProject"
      @command="handleChromeCommand"
      @toggle-autosave="setPagesAutosaveEnabled"
    />
    <PageBlueprintDocumentTabs
      v-model="activePageDocument"
      :tabs="pageDocumentTabs"
    />
    <AppPanel
      v-if="activePageDocument === 'design'"
      :is-open="isExplorerVisible"
      title="Explorer"
      position="left"
      width="md"
      resizable
      resize-side="right"
      @close="closeLeftPanel"
      @resize="handleLeftPanelResize"
      @resize-reset="resetLeftPanelResize"
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

    <AppPanel
      v-if="activePageDocument === 'blueprint'"
      :is-open="isBlueprintToolboxVisible"
      title="Toolbox"
      position="left"
      width="md"
      resizable
      resize-side="right"
      @close="closeBlueprintToolbox"
      @resize="handleLeftPanelResize"
      @resize-reset="resetLeftPanelResize"
    >
      <PageBlueprintToolboxPanel @add-utility-node="addBlueprintUtilityNode" />
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
        <BaseModal
          :is-open="Boolean(activeCodeFile)"
          max-width="min(1180px, calc(100vw - 64px))"
          height="min(760px, calc(100vh - 72px))"
          :dim-backdrop="false"
          @close="closeCodeCanvas"
        >
          <SiteCodeCanvas
            v-if="activeCodeFile"
            :file="activeCodeFile"
            :model-value="activeCodeContent"
            :readonly="isActiveCodeFileReadonly"
            @update:model-value="updateActiveCodeContent"
            @close="closeCodeCanvas"
          />
        </BaseModal>
      </Transition>

      <BaseCanvas
          v-if="activePageDocument === 'design'"
          v-model:selection="pageCanvasSelection"
          v-model:viewport="pageCanvasViewport"
          class="web-page-editor__base-canvas"
          :items="pageCanvasItems"
          :rulers="true"
          :snap-to-grid="false"
          background-color="var(--fabric-bg-canvas)"
          pattern-color="var(--fabric-border)"
          pattern-style="dot"
          :pattern-size="30"
          rulers-bg="var(--fabric-bg-canvas)"
          rulers-text="var(--fabric-text-muted)"
          rulers-lines="var(--fabric-border)"
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
                  icon-left="eye"
                  title="Preview page"
                  @click.stop="previewCanvasPage(item.id)"
                />
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
                :canvas-viewport="pageCanvasViewport"
                :canvas-zoom="pageCanvasViewport.zoom"
                :selected-block-id="item.id === pagesStore.activePage?.id ? editorStore.selectedBlockId : null"
                :selected-block-ids="item.id === pagesStore.activePage?.id ? editorStore.selectedBlockIds : []"
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
        <PageBlueprintWorkbench
          v-else
          :blocks="editorStore.blocks"
          :workflows="pageActionsStore.workflows"
          :output-bindings="pageActionBindingsStore.outputBindingsByAction"
          :collection-bindings="pageActionBindingsStore.collectionBindingsByAction"
          @select-node="blueprintSelectedNodeId = $event"
        />
        <PageSelectionGroupOverlay
          v-if="activePageDocument === 'design'"
          :selected-block-ids="editorStore.selectedBlockIds"
          :viewport-key="selectionOverlayViewportKey"
          @inspect="inspectGroupSelection"
          @duplicate="duplicateGroupSelection"
          @delete="deleteGroupSelection"
        />
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
    </div>

    <AppPanel
      v-if="activePageDocument === 'design'"
      :is-open="isInspectorVisible"
      title="Inspector"
      position="right"
      width="md"
      resizable
      resize-side="left"
      @close="closeRightPanel"
      @resize="handleRightPanelResize"
      @resize-reset="resetRightPanelResize"
    >
      <template v-if="pagesStore.activePage && editorStore.selectedTarget.type === 'page'">
        <div class="web-page-editor__inspector-tabs">
          <BaseSegmentedSelect
            v-model="pageInspectorTab"
            :options="pageInspectorTabs"
            aria-label="Page inspector panel"
            :icon-size="15"
          />
        </div>
        <PageMetadataPanel
          v-if="pageInspectorTab === 'content'"
          :page="pagesStore.activePage"
          @patch="patchPageMetadata"
        />
        <BlockStylePanel
          v-if="pageInspectorTab === 'style'"
          :block="bodyStyleBlock"
          title="Body"
          @patch="patchBodyStyles"
        />
        <p v-if="pageInspectorTab === 'advanced'" class="web-page-editor__empty">No advanced page settings.</p>
      </template>
      <BlockStylePanel
        v-if="pagesStore.activePage && editorStore.selectedTarget.type === 'body'"
        :block="bodyStyleBlock"
        title="Body"
        @patch="patchBodyStyles"
      />
      <template v-if="editorStore.selectedTarget.type === 'block' && editorStore.selectedBlock">
        <div class="web-page-editor__inspector-tabs">
          <BaseSegmentedSelect
            v-model="blockInspectorTab"
            :options="blockInspectorTabs"
            aria-label="Inspector panel"
            :icon-size="15"
          />
        </div>
        <template v-if="blockInspectorTab === 'content'">
          <FormImportPanel v-if="editorStore.selectedBlock.tag === 'form'" @insert="insertImportedForm" />
          <BlockContentPanel
            :block="editorStore.selectedBlock"
            @patch="patchActiveBlock"
            @upload-image="uploadImageForSelectedBlock"
          />
        </template>
        <BlockAdvancedPanel
          v-if="blockInspectorTab === 'advanced'"
          :block="editorStore.selectedBlock"
          @patch="patchActiveBlock"
        />
        <BlockStylePanel
          v-if="blockInspectorTab === 'style'"
          :block="editorStore.selectedBlock"
          @patch="patchSelectedStyle"
        />
      </template>
      <p v-if="editorStore.selectedTarget.type === 'none'" class="web-page-editor__empty">Select a page, body, or block.</p>
    </AppPanel>

    <AppPanel
      v-if="activePageDocument === 'blueprint'"
      :is-open="isInspectorVisible"
      title="Inspector"
      position="right"
      width="md"
      resizable
      resize-side="left"
      @close="closeRightPanel"
      @resize="handleRightPanelResize"
      @resize-reset="resetRightPanelResize"
    >
      <PageBlueprintInspectorPanel
        :document="blueprintStore.document"
        :selected-node-id="blueprintSelectedNodeId"
        @update-node-label="blueprintStore.setNodeLabel"
        @update-field-value="blueprintStore.setNodeFieldValue"
        @add-node-field="blueprintStore.addNodeField"
        @test-run-workflow="blueprintStore.applyRunWorkflowTestResult"
      />
    </AppPanel>

    <PageSwitcherModal
      :is-open="isPageSwitcherOpen"
      :pages="pagesStore.pages"
      :active-page-id="pagesStore.activePage?.id"
      @close="isPageSwitcherOpen = false"
      @select="switchPage"
    />
    <PageActionPickWhipOverlay />

    <BaseModal :is-open="isNewProjectModalOpen" max-width="480px" height="auto" @close="closeProjectModals">
      <div class="web-page-project-modal">
        <header class="web-page-project-modal__header">
          <div>
            <h2>New project</h2>
            <p>Create a clean Fabric Pages project.</p>
          </div>
          <BaseButton variant="ghost" size="icon" icon-left="x" title="Close" @click="closeProjectModals" />
        </header>
        <div class="web-page-project-modal__body">
          <BaseInput v-model="newProjectName" label="Project name" placeholder="Marketing site" required />
          <BaseInput v-model="newProjectSlug" label="Slug" placeholder="marketing-site" hint="Optional. Fabric can generate it." />
          <p v-if="projectModalError" class="web-page-project-modal__error">{{ projectModalError }}</p>
        </div>
        <footer class="web-page-project-modal__footer">
          <BaseButton variant="ghost" @click="closeProjectModals">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="isProjectActionRunning" :disabled="!newProjectName.trim()" @click="createProject">
            Create project
          </BaseButton>
        </footer>
      </div>
    </BaseModal>

    <BaseModal :is-open="isOpenProjectModalOpen" max-width="720px" height="70vh" @close="closeProjectModals">
      <div class="web-page-project-modal web-page-project-modal--list">
        <header class="web-page-project-modal__header">
          <div>
            <h2>Open project</h2>
            <p>Select a project from your workspace.</p>
          </div>
          <BaseInput v-model="projectSearch" icon-left="search" placeholder="Search projects" />
          <BaseButton variant="ghost" size="icon" icon-left="x" title="Close" @click="closeProjectModals" />
        </header>
        <div class="web-page-project-modal__list">
          <article
            v-for="site in filteredProjects"
            :key="site.id"
            class="web-page-project-modal__project"
            :class="{ 'web-page-project-modal__project--active': site.id === sitesStore.activeSite?.id }"
          >
            <button
              type="button"
              class="web-page-project-modal__project-main"
              @click="openProject(site.id)"
            >
              <span class="web-page-project-modal__preview">
                <span
                  v-for="(block, blockIndex) in previewBlocks(site.id)"
                  :key="`${site.id}:${block.id}:${blockIndex}`"
                  class="web-page-project-modal__preview-block"
                  :style="previewBlockStyle(block, blockIndex)"
                />
              </span>
              <span>
                <strong>{{ site.name }}</strong>
                <small>{{ site.slug }} - {{ site.files.length }} files</small>
              </span>
            </button>
            <span class="web-page-project-modal__project-actions">
              <BaseButton
                variant="ghost"
                size="icon"
                icon-left="download"
                title="Export project"
                @click.stop="exportProject(site.id)"
              />
              <BaseButton
                variant="ghost"
                size="icon"
                icon-left="trash-2"
                title="Delete project"
                @click.stop="deleteProject(site.id)"
              />
            </span>
          </article>
          <p v-if="filteredProjects.length === 0" class="web-page-project-modal__empty">No projects found.</p>
        </div>
      </div>
    </BaseModal>

    <BaseModal :is-open="isImportProjectModalOpen" max-width="520px" height="auto" @close="closeProjectModals">
      <div class="web-page-project-modal">
        <header class="web-page-project-modal__header">
          <div>
            <h2>Import project</h2>
            <p>Drop a Fabric project zip to add it to your projects.</p>
          </div>
          <BaseButton variant="ghost" size="icon" icon-left="x" title="Close" @click="closeProjectModals" />
        </header>
        <div class="web-page-project-modal__body">
          <BaseFileDropzone
            v-model="importProjectFile"
            accept=".zip,.json,application/zip,application/json"
            icon="folder-up"
            title="Drop project zip here"
            description="Choose a .fabric-site.zip file"
            :disabled="isProjectActionRunning"
          />
          <p v-if="projectModalError" class="web-page-project-modal__error">{{ projectModalError }}</p>
        </div>
        <footer class="web-page-project-modal__footer">
          <BaseButton variant="ghost" @click="closeProjectModals">Cancel</BaseButton>
          <BaseButton variant="primary" :loading="isProjectActionRunning" :disabled="!importProjectFile" @click="importProjectArchive">
            Import project
          </BaseButton>
        </footer>
      </div>
    </BaseModal>

    <BaseModal :is-open="isProjectSettingsModalOpen" max-width="500px" height="auto" @close="isProjectSettingsModalOpen = false">
      <div class="web-page-project-modal">
        <header class="web-page-project-modal__header">
          <div>
            <h2>Project settings</h2>
            <p>Configure the active Fabric Pages project.</p>
          </div>
          <BaseButton variant="ghost" size="icon" icon-left="x" title="Close" @click="isProjectSettingsModalOpen = false" />
        </header>
        <div class="web-page-project-modal__body">
          <BaseInput v-model="projectSettingsName" label="Project name" placeholder="Marketing site" required />
          <BaseInput v-model="projectSettingsSlug" label="Slug" placeholder="marketing-site" />
          <p v-if="projectModalError" class="web-page-project-modal__error">{{ projectModalError }}</p>
        </div>
        <footer class="web-page-project-modal__footer">
          <BaseButton variant="ghost" @click="isProjectSettingsModalOpen = false">Cancel</BaseButton>
          <BaseButton
            variant="primary"
            :loading="isProjectActionRunning"
            :disabled="!projectSettingsName.trim()"
            @click="saveProjectSettings"
          >
            Save settings
          </BaseButton>
        </footer>
      </div>
    </BaseModal>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import AppPanel from '@/shared/components/layout/AppPanel.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseFileDropzone from '@/shared/components/base/BaseFileDropzone.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseModal from '@/shared/components/base/BaseModal.vue'
import BaseSegmentedSelect, { type BaseSegmentedSelectOption } from '@/shared/components/base/BaseSegmentedSelect.vue'
import { BaseCanvas } from '@/shared/base-canvas/components.ts'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { BaseCanvasContextMenuEvent, BaseCanvasItem, BaseCanvasItemsMoveEvent, BaseCanvasViewport } from '@/shared/base-canvas/index.ts'
import { useConfirm } from '@/shared/composables/useConfirm.ts'
import { API_BASE_URL } from '@/core/constants/app.ts'
import { ENDPOINTS } from '@/core/api/endpoints.ts'
import { pagesApi } from '@/core/api/pages.api.ts'
import { usePagesStore } from '../stores/pages.store.ts'
import { usePageEditorStore, type DropEdge } from '../stores/page-editor.store.ts'
import { usePageActionBindingsStore } from '../data-actions/stores/page-action-bindings.store.ts'
import { usePageActionsStore } from '../data-actions/stores/page-actions.store.ts'
import PageActionPickWhipOverlay from '../data-actions/components/PageActionPickWhipOverlay.vue'
import { useSitesStore } from '../stores/sites.store.ts'
import { createBlock } from '../utils/createBlock.ts'
import type { InsertPosition } from '../utils/blockTree.ts'
import type { PageBlock, PageBlockStyles, PageBlockTag, FabricPage, SiteFile } from '../types/page.types.ts'
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
import PageSelectionGroupOverlay from './PageSelectionGroupOverlay.vue'
import PageProjectTopbarDropdown from './PageProjectTopbarDropdown.vue'
import PageBlueprintWorkbench from '../page-blueprint/PageBlueprintWorkbench.vue'
import { usePageBlueprintStore } from '../page-blueprint/pageBlueprint.store.ts'
import type { PageBlueprintUtilityNodeType } from '../page-blueprint/pageBlueprintSchema.ts'
import PageBlueprintDocumentTabs from '../page-blueprint/components/PageBlueprintDocumentTabs.vue'
import PageBlueprintInspectorPanel from '../page-blueprint/components/PageBlueprintInspectorPanel.vue'
import PageBlueprintToolboxPanel from '../page-blueprint/components/PageBlueprintToolboxPanel.vue'

const route = useRoute()
const router = useRouter()
const pagesStore = usePagesStore()
const editorStore = usePageEditorStore()
const pageActionBindingsStore = usePageActionBindingsStore()
const pageActionsStore = usePageActionsStore()
const sitesStore = useSitesStore()
const blueprintStore = usePageBlueprintStore()
const { confirm } = useConfirm()
const INITIAL_CANVAS_TOP_OFFSET = 120
const PAGE_CANVAS_X = 120
const PAGE_CANVAS_WIDTH = typeof window === 'undefined' ? 1440 : window.innerWidth
const PAGE_CANVAS_HEIGHT = typeof window === 'undefined' ? 900 : window.innerHeight
const PAGE_CANVAS_GAP = 80
const isLeftPanelOpen = ref(true)
const isRightPanelOpen = ref(true)
const isBlueprintToolboxOpen = ref(true)
const blueprintSelectedNodeId = ref<string | null>(null)
const leftPanelWidth = ref<number | null>(null)
const rightPanelWidth = ref<number | null>(null)
const isPageSwitcherOpen = ref(false)
const isNewProjectModalOpen = ref(false)
const isOpenProjectModalOpen = ref(false)
const isImportProjectModalOpen = ref(false)
const isProjectSettingsModalOpen = ref(false)
const newProjectName = ref('')
const newProjectSlug = ref('')
const projectSettingsName = ref('')
const projectSettingsSlug = ref('')
const projectSearch = ref('')
const projectPreviews = ref<Record<string, FabricPage | null>>({})
const projectModalError = ref('')
const importProjectFile = ref<File | null>(null)
const isProjectActionRunning = ref(false)
const pendingCreateProjectSave = ref(false)
const editorPageId = ref<string | null>(null)
type PageCanvasTool = 'cursor' | 'pan' | 'delete'
const activeTool = ref<PageCanvasTool>('cursor')
const isPagesAutosaveEnabled = ref(false)
const pageInspectorTab = ref<'content' | 'style' | 'advanced'>('content')
const blockInspectorTab = ref<'content' | 'style' | 'advanced'>('content')
const activePageDocument = ref<'design' | 'blueprint'>('design')
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
let pagesAutosaveTimer: number | null = null
let isHydratingPageActionBindings = false
const activePagePublishedAt = computed(
  () => pagesStore.pages.find((page) => page.id === pagesStore.activePage?.id)?.publishedAt ?? null,
)
const hasUnsavedProjectChanges = computed(() =>
  editorStore.isDirty || pagesStore.isDirty || sitesStore.isDirty,
)
const hasCreatedProject = computed(() => Boolean(sitesStore.activeSite && pagesStore.activePage))
const hasDraftPageWithoutProject = computed(() => Boolean(!sitesStore.activeSite && pagesStore.activePage))
const canSaveActiveDocument = computed(() =>
  activePageDocument.value === 'blueprint'
    ? hasCreatedProject.value && (blueprintStore.isDirty || sitesStore.isDirty)
    : hasCreatedProject.value ? hasUnsavedProjectChanges.value : hasDraftPageWithoutProject.value,
)
const blockInspectorTabs: BaseSegmentedSelectOption[] = [
  { value: 'content', label: 'Content', title: 'Content', icon: 'sliders-horizontal' },
  { value: 'style', label: 'Style', title: 'Style', icon: 'palette' },
  { value: 'advanced', label: 'Advanced', title: 'Advanced', icon: 'code-2' },
]
const pageInspectorTabs: BaseSegmentedSelectOption[] = [
  { value: 'content', label: 'Content', title: 'Content', icon: 'sliders-horizontal' },
  { value: 'style', label: 'Style', title: 'Style', icon: 'palette' },
  { value: 'advanced', label: 'Advanced', title: 'Advanced', icon: 'code-2' },
]
const pageDocumentTabs = [
  { id: 'design', label: 'Design', icon: 'layout-template' },
  { id: 'blueprint', label: 'Blueprint', icon: 'workflow' },
]
const isDesignDocumentActive = computed(() => activePageDocument.value === 'design')
const isBlueprintDocumentActive = computed(() => activePageDocument.value === 'blueprint')
const isExplorerVisible = computed(() => isDesignDocumentActive.value && isLeftPanelOpen.value)
const isBlueprintToolboxVisible = computed(() => isBlueprintDocumentActive.value && isBlueprintToolboxOpen.value)
const isLeftWorkspacePanelVisible = computed(() => isExplorerVisible.value || isBlueprintToolboxVisible.value)
const isInspectorVisible = computed(() =>
  (isDesignDocumentActive.value || isBlueprintDocumentActive.value) && isRightPanelOpen.value,
)
const workspacePlaneStyle = computed(() => ({}))
const pageEditorLayoutStyle = computed(() => ({
  ...(leftPanelWidth.value === null ? {} : { '--web-page-left-panel-width': `${leftPanelWidth.value}px` }),
  ...(rightPanelWidth.value === null ? {} : { '--web-page-right-panel-width': `${rightPanelWidth.value}px` }),
}))
const pageCanvasItems = computed<BaseCanvasItem[]>(() => pagesStore.pages.map((page, index) => {
  const offset = pageCanvasOffsets.value[page.id] ?? { x: 0, y: 0 }
  return {
    id: page.id,
    x: PAGE_CANVAS_X + offset.x,
    y: index * (PAGE_CANVAS_HEIGHT + PAGE_CANVAS_GAP) + offset.y,
    width: PAGE_CANVAS_WIDTH,
    height: PAGE_CANVAS_HEIGHT,
    data: { kind: 'page' },
  }
}))
const pageCanvasContextMenuPageId = computed(() => {
  const target = pageCanvasContextMenu.value?.target
  return target?.type === 'item' ? target.itemId : null
})
const selectionOverlayViewportKey = computed(() =>
  `${pageCanvasViewport.value.x}:${pageCanvasViewport.value.y}:${pageCanvasViewport.value.zoom}:${editorStore.selectedBlockIds.join(',')}`,
)
const activeCodeContent = computed(() => {
  if (!activeCodeFile.value) return ''
  if (isGeneratedPageHtmlFile(activeCodeFile.value.path)) return renderGeneratedHtml(activeCodeFile.value.path)
  return sitesStore.activeSite?.files.find((file) => file.path === activeCodeFile.value?.path)?.content ?? activeCodeFile.value.content ?? ''
})
const isActiveCodeFileReadonly = computed(() => activeCodeFile.value?.path.endsWith('.html') ?? false)
const filteredProjects = computed(() => {
  const query = projectSearch.value.trim().toLowerCase()
  if (!query) return sitesStore.sites
  return sitesStore.sites.filter((site) =>
    `${site.name} ${site.slug} ${site.id}`.toLowerCase().includes(query),
  )
})
const bodyStyleBlock = computed<PageBlock>(() => ({
  id: 'body',
  tag: 'div',
  props: { label: 'body' },
  styles: pagesStore.activePage?.bodyStyles ?? defaultBodyStyles(),
  children: [],
}))

function previewBlocks(siteId: string) {
  return projectPreviews.value[siteId]?.blocks.slice(0, 5) ?? []
}

function previewBlockStyle(block: PageBlock, index: number) {
  const width = typeof block.styles?.width === 'string' && block.styles.width.endsWith('%')
    ? block.styles.width
    : `${Math.max(28, 88 - index * 12)}%`
  return {
    width,
    height: block.tag === 'image' || block.tag === 'video' ? '28px' : '8px',
  }
}

function openCodeFile(file: SiteFile) {
  if (!isGeneratedPageHtmlFile(file.path)) ensureEditablePageAssetFile(file)
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

function patchActiveBlock(patch: Partial<PageBlock>) {
  if (editorStore.selectedBlock) editorStore.patchBlock(editorStore.selectedBlock.id, patch)
}

function patchSelectedStyle(patch: Partial<PageBlock>) {
  if (editorStore.selectedBlockIds.length > 1) {
    editorStore.patchSelectedBlocks(patch)
    return
  }
  patchActiveBlock(patch)
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

function isGeneratedPageHtmlFile(path: string) {
  return /^pages\/[^/]+\/index\.html$/.test(path)
}

function ensureEditablePageAssetFile(file: SiteFile) {
  if (!sitesStore.activeSite || file.kind === 'folder' || file.kind === 'asset') return
  if (!file.path.startsWith('pages/')) return
  if (sitesStore.activeSite.files.some((item) => item.path === file.path && item.kind !== 'folder')) return
  sitesStore.createFile(file.path, file.content ?? '')
}

function renderGeneratedHtml(filePath: string) {
  const slug = filePath.replace(/^pages\//, '').replace(/\/index\.html$/, '').replace(/\.html$/, '')
  const page = pagesStore.activePage?.slug === slug
    ? pagesStore.activePage
    : pagesStore.pages.find((item) => item.slug === slug)
  if (!page) return '<!doctype html>\n<html><body></body></html>'
  const blocks = 'blocks' in page ? page.blocks : []
  const css = [
    renderGeneratedPageCss(blocks),
    ...(sitesStore.activeSite?.files ?? [])
      .filter((file) => file.kind === 'file' && isAutoImportedPageFile(file.path, slug, 'css'))
      .map((file) => file.content ?? ''),
  ].filter(Boolean).join('\n')
  const js = [
    renderGeneratedPageJs(blocks),
    ...(sitesStore.activeSite?.files ?? [])
      .filter((file) => file.kind === 'file' && isAutoImportedPageFile(file.path, slug, 'js'))
      .map((file) => file.content ?? ''),
  ].filter(Boolean).join('\n')

  const scriptOpen = '<script>'
  const scriptClose = '<' + '/script>'
  const safeJs = js.replace(new RegExp('<' + '/script', 'gi'), '<\\/script')
  const cssImports = autoImportedPagePaths(slug, 'css')
    .map((path) => `  <link rel="stylesheet" href="./${escapeHtml(path.split('/').pop() ?? path)}">`)
    .join('\n')
  const jsImports = autoImportedPagePaths(slug, 'js')
    .map((path) => `  <script src="./${escapeHtml(path.split('/').pop() ?? path)}"></${'script'}>`)
    .join('\n')

  return `<!doctype html>\n<html>\n<head>\n  <title>${escapeHtml(page.title)}</title>\n${cssImports ? `${cssImports}\n` : ''}  <style>${css}</style>\n</head>\n<body>\n${blocks.map(renderGeneratedBlockHtml).join('\n')}\n${js ? `${scriptOpen}${safeJs}${scriptClose}` : ''}\n${jsImports}\n</body>\n</html>`
}

function isAutoImportedPageFile(path: string, slug: string, extension: 'css' | 'js') {
  return path.endsWith(`.${extension}`)
    && (path.startsWith(`pages/${slug}/`) || path.startsWith(`${extension}/`))
}

function autoImportedPagePaths(slug: string, extension: 'css' | 'js') {
  return (sitesStore.activeSite?.files ?? [])
    .filter((file) => file.kind === 'file' && file.path.startsWith(`pages/${slug}/`) && file.path.endsWith(`.${extension}`))
    .map((file) => file.path)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderGeneratedBlockHtml(block: PageBlock): string {
  const tag = block.tag === 'text' ? 'span' : block.tag === 'image' ? 'img' : block.tag === 'youtube' ? 'iframe' : block.tag
  const className = ['fabric-page-block', blockClass(block.id), block.className].filter(Boolean).join(' ')
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
  return `fabric-block-${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function closeLeftPanel() {
  isLeftPanelOpen.value = false
}

function closeRightPanel() {
  isRightPanelOpen.value = false
}

function closeBlueprintToolbox() {
  isBlueprintToolboxOpen.value = false
}

function addBlueprintUtilityNode(type: PageBlueprintUtilityNodeType) {
  blueprintStore.addUtilityNode(type)
}

function handleLeftPanelResize(size: { width: number | null }) {
  leftPanelWidth.value = size.width
}

function handleRightPanelResize(size: { width: number | null }) {
  rightPanelWidth.value = size.width
}

function resetLeftPanelResize() {
  leftPanelWidth.value = null
}

function resetRightPanelResize() {
  rightPanelWidth.value = null
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeyboardShortcuts)
  window.addEventListener('keydown', handleSpacePanKeyDown)
  window.addEventListener('keyup', handleSpacePanKeyUp)
  window.addEventListener('beforeunload', handleBeforeUnload)
  await openRouteProject(route.params.projectId)
  void pageActionsStore.loadAvailableActions()
  await nextTick()
  positionInitialCanvas()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboardShortcuts)
  window.removeEventListener('keydown', handleSpacePanKeyDown)
  window.removeEventListener('keyup', handleSpacePanKeyUp)
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (pagesAutosaveTimer) window.clearTimeout(pagesAutosaveTimer)
})

watch(
  () => route.params.projectId,
  (projectId) => {
    void openRouteProject(projectId)
  },
)

watch(
  () => sitesStore.activeSite?.id,
  (siteId) => {
    isPagesAutosaveEnabled.value = siteId
      ? localStorage.getItem(pagesAutosaveStorageKey(siteId)) === 'true'
      : false
  },
  { immediate: true },
)

watch(
  () => [editorStore.blocks, pagesStore.activePage, sitesStore.activeSite],
  () => schedulePagesAutosave(),
  { deep: true },
)

onBeforeRouteLeave(async () => confirmUnsavedProjectLeave())

async function openRouteProject(projectId: unknown) {
  if (typeof projectId !== 'string') {
    clearActiveProject()
    return
  }
  await loadProject(projectId)
}

function clearActiveProject() {
  sitesStore.setActiveSite(null)
  blueprintStore.loadFromActiveSite()
  pagesStore.setActiveSiteId(null)
  pagesStore.setActivePage(null)
  pagesStore.pages = []
  pagesStore.pageDocuments = {}
  editorStore.setBlocks([])
  editorStore.clearSelection()
  activeCodeFile.value = null
}

async function loadProject(projectId: string) {
  const site = await sitesStore.openSite(projectId)
  blueprintStore.loadFromActiveSite()
  pagesStore.setActiveSiteId(site.id)
  const pages = await pagesStore.listPages()
  await pagesStore.loadPageDocuments()
  const firstPageId = site.homePageId ?? pages[0]?.id ?? null
  if (firstPageId) await pagesStore.openPage(firstPageId)
  else {
    pagesStore.setActivePage(null)
    editorStore.setBlocks([])
    editorStore.clearSelection()
  }
  return site
}

function positionInitialCanvas() {
  const workspaceWidth = workspaceRef.value?.clientWidth ?? PAGE_CANVAS_WIDTH
  pageCanvasViewport.value = {
    ...pageCanvasViewport.value,
    x: Math.round((workspaceWidth - PAGE_CANVAS_WIDTH) / 2 - PAGE_CANVAS_X),
    y: INITIAL_CANVAS_TOP_OFFSET,
  }
}

watch(
  () => pagesStore.activePage,
  (page) => {
    hydratePageActionBindings(page)
    if (page?.id === editorPageId.value) return
    editorPageId.value = page?.id ?? null
    editorStore.setBlocks(page?.blocks ?? [])
  },
  { immediate: true },
)

watch(
  () => [
    pageActionBindingsStore.bindingsByAction,
    pageActionBindingsStore.outputBindingsByAction,
    pageActionBindingsStore.collectionBindingsByAction,
  ],
  () => {
    if (isHydratingPageActionBindings || !pagesStore.activePage) return
    pagesStore.setActivePage({
      ...pagesStore.activePage,
      pageActions: {
        ...(pagesStore.activePage.pageActions ?? {}),
        inputBindings: pageActionBindingsStore.exportBindings(),
        outputBindings: pageActionBindingsStore.exportOutputBindings(),
        collectionBindings: pageActionBindingsStore.exportCollectionBindings(),
      },
    })
  },
  { deep: true },
)

function hydratePageActionBindings(page: FabricPage | null) {
  isHydratingPageActionBindings = true
  pageActionBindingsStore.replaceBindings(page?.pageActions?.inputBindings ?? {})
  pageActionBindingsStore.replaceOutputBindings(page?.pageActions?.outputBindings ?? {})
  pageActionBindingsStore.replaceCollectionBindings(page?.pageActions?.collectionBindings ?? {})
  void nextTick(() => {
    isHydratingPageActionBindings = false
  })
}

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

function selectCanvasBlock(pageId: string, payload: { blockId: string; additive?: boolean }) {
  void ensurePageActive(pageId).then(() => {
    if (payload.additive) editorStore.toggleBlockSelection(payload.blockId)
    else editorStore.selectBlock(payload.blockId)
  })
}

function selectCanvasBody(pageId: string) {
  void ensurePageActive(pageId).then(() => {
    if (editorStore.selectedTarget.type === 'block') {
      editorStore.clearSelection()
      pageCanvasSelection.value = []
      return
    }
    editorStore.selectBody()
  })
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
  return Array.from(event.dataTransfer?.types ?? []).includes('application/x-fabric-page')
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
    bodyStyles: { ...(pagesStore.activePage.bodyStyles ?? {}), ...(patch.styles ?? {}) },
  })
}

function patchPageMetadata(patch: Partial<FabricPage>) {
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
  if (page) editorPageId.value = page.id
  editorStore.selectPage()
}

async function deleteActivePageAndChooseNext() {
  const page = await pagesStore.deleteActivePageAndChooseNext()
  if (page) {
    editorStore.selectPage()
  } else {
    editorStore.clearSelection()
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
  deleteBlock(blockId)
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
  deleteBlock(blockId)
}

function deleteSelectedTarget() {
  if (editorStore.selectedBlockId) {
    deleteBlock(editorStore.selectedBlockId)
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

function deleteBlock(blockId: string) {
  editorStore.deleteBlock(blockId)
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

async function activateCreatedPage(page: FabricPage) {
  editorPageId.value = page.id
  editorStore.setBlocks(page.blocks)
  editorStore.selectPage()
  await nextTick()
  positionInitialCanvas()
}

function handleChromeCommand(command: PageChromeCommand) {
  if (command === 'go.home') void goHome()
  if (command === 'file.newProject') openNewProjectModal()
  if (command === 'file.openProject') void openOpenProjectModal()
  if (command === 'file.importProject') openImportProjectModal()
  if (command === 'file.projectSettings') openProjectSettingsModal()
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
    if (editorStore.selectedBlockId) deleteBlock(editorStore.selectedBlockId)
    else void deleteActivePageAndChooseNext()
  }
  if (command === 'view.switch') void openPageSwitcher()
  if (command === 'view.left-panel') toggleLeftPanel()
  if (command === 'view.right-panel') toggleRightPanel()
  if (command === 'view.blueprint-toolbox') toggleBlueprintToolbox()
}

function setPagesAutosaveEnabled(enabled: boolean) {
  isPagesAutosaveEnabled.value = enabled
  const siteId = sitesStore.activeSite?.id
  if (siteId) localStorage.setItem(pagesAutosaveStorageKey(siteId), String(enabled))
  if (!enabled && pagesAutosaveTimer) {
    window.clearTimeout(pagesAutosaveTimer)
    pagesAutosaveTimer = null
  }
  if (enabled) schedulePagesAutosave()
}

function schedulePagesAutosave() {
  if (!isPagesAutosaveEnabled.value || !sitesStore.activeSite || !hasUnsavedProjectChanges.value) return
  if (pagesAutosaveTimer) window.clearTimeout(pagesAutosaveTimer)
  pagesAutosaveTimer = window.setTimeout(() => {
    void saveProjectBeforeExport()
  }, 1500)
}

function pagesAutosaveStorageKey(siteId: string) {
  return `fabric.pages.autosave.${siteId}`
}

function openProjectSettingsModal() {
  if (!sitesStore.activeSite) return
  projectModalError.value = ''
  projectSettingsName.value = sitesStore.activeSite.name
  projectSettingsSlug.value = sitesStore.activeSite.slug
  isProjectSettingsModalOpen.value = true
}

async function saveProjectSettings() {
  if (!sitesStore.activeSite) return
  const name = projectSettingsName.value.trim()
  if (!name) return
  sitesStore.activeSite.name = name
  sitesStore.activeSite.slug = projectSettingsSlug.value.trim() || sitesStore.activeSite.slug
  await runProjectAction(async () => {
    await sitesStore.saveActiveSite()
    isProjectSettingsModalOpen.value = false
  })
}

async function goHome() {
  if (!(await confirmUnsavedProjectLeave())) return
  await router.push('/')
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!hasUnsavedProjectChanges.value) return
  event.preventDefault()
  event.returnValue = ''
}

async function confirmUnsavedProjectLeave() {
  if (!hasUnsavedProjectChanges.value) return true

  const result = await confirm({
    title: 'Unsaved changes',
    message: 'This page project has unsaved changes. Do you want to save before leaving?',
    confirmText: 'Save & Leave',
    cancelText: 'Discard & Leave',
    variant: 'warning',
  })

  if (result === null) return false
  if (result) await saveActiveDocument()
  return true
}

function openNewProjectModal(options: { saveAfterCreate?: boolean } = {}) {
  projectModalError.value = ''
  newProjectName.value = ''
  newProjectSlug.value = ''
  pendingCreateProjectSave.value = options.saveAfterCreate === true
  isNewProjectModalOpen.value = true
}

async function openOpenProjectModal() {
  projectModalError.value = ''
  projectSearch.value = ''
  isOpenProjectModalOpen.value = true
  await sitesStore.listSites()
  await loadProjectPreviews()
}

async function openProjectFromTopbar() {
  await openOpenProjectModal()
}

async function loadProjectPreviews() {
  await Promise.all(sitesStore.sites.map(async (site) => {
    if (site.id in projectPreviews.value) return
    try {
      const pages = await pagesApi.listSitePages(site.id)
      projectPreviews.value = {
        ...projectPreviews.value,
        [site.id]: pages[0] ?? null,
      }
    } catch {
      projectPreviews.value = {
        ...projectPreviews.value,
        [site.id]: null,
      }
    }
  }))
}

function openImportProjectModal() {
  projectModalError.value = ''
  importProjectFile.value = null
  isImportProjectModalOpen.value = true
}

function closeProjectModals(force = false) {
  if (isProjectActionRunning.value && !force) return
  isNewProjectModalOpen.value = false
  isOpenProjectModalOpen.value = false
  isImportProjectModalOpen.value = false
  pendingCreateProjectSave.value = false
  projectModalError.value = ''
}

async function runProjectAction(action: () => Promise<void>) {
  isProjectActionRunning.value = true
  projectModalError.value = ''
  try {
    await action()
  } catch (error) {
    projectModalError.value = error instanceof Error ? error.message : 'Unexpected project error'
  } finally {
    isProjectActionRunning.value = false
  }
}

async function createProject() {
  const name = newProjectName.value.trim()
  if (!name) return
  await runProjectAction(async () => {
    const site = await sitesStore.createSite({
      name,
      slug: newProjectSlug.value.trim() || undefined,
    })
    if (pendingCreateProjectSave.value) await ensureProjectHasPage(site.id)
    await activateProject(site.id)
  })
}

async function ensureProjectHasPage(siteId: string) {
  const pages = await pagesApi.listSitePages(siteId)
  if (pages.length > 0) return pages[0]
  const draftPage = pagesStore.activePage
  return pagesApi.createSitePage(siteId, {
    title: draftPage?.title ?? 'Home',
    slug: draftPage?.slug,
    bodyStyles: draftPage?.bodyStyles,
    blocks: editorStore.blocks,
  })
}

async function openProject(projectId: string) {
  await runProjectAction(async () => {
    await activateProject(projectId)
  })
}

async function exportProject(projectId: string) {
  const site = sitesStore.sites.find((item) => item.id === projectId)
  await runProjectAction(async () => {
    const zip = await sitesStore.exportSiteProject(projectId)
    downloadBlobFile(`${site?.slug ?? 'site'}.fabric-site.zip`, zip)
  })
}

async function deleteProject(projectId: string) {
  const site = sitesStore.sites.find((item) => item.id === projectId)
  const ok = await confirm({
    title: 'Delete project?',
    message: `Delete "${site?.name ?? 'this project'}" permanently?`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger',
  })
  if (!ok) return
  await runProjectAction(async () => {
    const wasActiveProject = sitesStore.activeSite?.id === projectId
    await sitesStore.deleteSite(projectId)
    delete projectPreviews.value[projectId]
    if (wasActiveProject) {
      clearActiveProject()
      closeProjectModals(true)
      await router.replace('/pages')
    }
  })
}

async function importProjectArchive() {
  if (!importProjectFile.value) return
  await runProjectAction(async () => {
    const site = await sitesStore.importSiteProject(importProjectFile.value!)
    await activateProject(site.id)
  })
}

async function activateProject(projectId: string) {
  const site = await loadProject(projectId)
  await router.replace(`/pages/${site.id}`)
  closeProjectModals(true)
  await nextTick()
  positionInitialCanvas()
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
  if (event.key.toLowerCase() === 'b') {
    event.preventDefault()
    toggleLeftPanel()
    return
  }
  if (event.key.toLowerCase() === 'i') {
    event.preventDefault()
    toggleRightPanel()
    return
  }
  if (event.key.toLowerCase() !== 's') return
  event.preventDefault()
  if (canSaveActiveDocument.value) void saveActiveDocument()
}

function undoPageEdit() {
  if (activePageDocument.value === 'blueprint') {
    blueprintStore.undo()
    return
  }
  if (activeCodeFile.value || !editorStore.canUndo) return
  editorStore.undo()
}

function redoPageEdit() {
  if (activePageDocument.value === 'blueprint') {
    blueprintStore.redo()
    return
  }
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
  if (!activeCodeFile.value && !canSaveActiveDocument.value) return
  if (!sitesStore.activeSite) {
    openNewProjectModal({ saveAfterCreate: true })
    return
  }
  if (activeCodeFile.value) {
    await sitesStore.saveActiveSite()
    return
  }
  if (activePageDocument.value === 'blueprint') {
    blueprintStore.saveToActiveSite()
    if (sitesStore.isDirty) await sitesStore.saveActiveSite()
    return
  }
  if (pagesStore.isDirty || editorStore.isDirty) await savePage()
  if (sitesStore.isDirty) await sitesStore.saveActiveSite()
}

async function savePage() {
  if (!pagesStore.activePage) return
  const selection = editorStore.selectedTarget
  const selectedBlockIds = [...editorStore.selectedBlockIds]
  const previousSlug = pagesStore.pages.find((page) => page.id === pagesStore.activePage?.id)?.slug
  const nextSlug = pagesStore.activePage.slug
  pagesStore.setActivePage({
    ...pagesStore.activePage,
    pageActions: {
      ...(pagesStore.activePage.pageActions ?? {}),
      inputBindings: pageActionBindingsStore.exportBindings(),
      outputBindings: pageActionBindingsStore.exportOutputBindings(),
      collectionBindings: pageActionBindingsStore.exportCollectionBindings(),
    },
    blocks: editorStore.blocks,
  })
  await pagesStore.saveActivePage()
  if (previousSlug && previousSlug !== nextSlug && sitesStore.renamePageFiles(previousSlug, nextSlug)) {
    await sitesStore.saveActiveSite()
  }
  editorStore.markSaved()
  restoreSelection(selection, selectedBlockIds)
}

function previewPage() {
  if (!pagesStore.activePage) return
  window.open(`${API_BASE_URL}${ENDPOINTS.PAGE_PREVIEW(pagesStore.activePage.id)}`, '_blank', 'noopener')
}

function previewCanvasPage(pageId: string) {
  window.open(`${API_BASE_URL}${ENDPOINTS.PAGE_PREVIEW(pageId)}`, '_blank', 'noopener')
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
  const page = pagesStore.activePage
  if (!page?.siteId || !activePagePublishedAt.value) return
  const publicId = sitesStore.activeSite?.publicId ?? page.siteId
  window.open(`${API_BASE_URL}${ENDPOINTS.PUBLISHED_PAGE(publicId, page.publicPath || page.slug)}`, '_blank', 'noopener')
}

async function exportActiveProject() {
  await saveProjectBeforeExport()
  const zip = await sitesStore.exportActiveSiteProject()
  if (!zip) return
  downloadBlobFile(`${sitesStore.activeSite?.slug ?? 'site'}.fabric-site.zip`, zip)
}

async function saveProjectBeforeExport() {
  blueprintStore.saveToActiveSite()
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

function restoreSelection(selection: typeof editorStore.selectedTarget, selectedBlockIds: string[] = []) {
  if (selection.type === 'page') editorStore.selectPage()
  if (selection.type === 'body') editorStore.selectBody()
  if (selection.type === 'block') {
    if (selectedBlockIds.length > 1) editorStore.selectBlocks(selectedBlockIds)
    else editorStore.selectBlock(selection.blockId)
  }
}

function inspectGroupSelection() {
  if (editorStore.selectedBlockId) handleInspectBlock(pagesStore.activePage?.id ?? '', editorStore.selectedBlockId)
}

function duplicateGroupSelection() {
  for (const blockId of editorStore.selectedBlockIds) editorStore.duplicateBlock(blockId)
}

function deleteGroupSelection() {
  for (const blockId of [...editorStore.selectedBlockIds]) deleteBlock(blockId)
}

function toggleLeftPanel() {
  if (!isDesignDocumentActive.value) return
  isLeftPanelOpen.value = !isLeftPanelOpen.value
}

function toggleRightPanel() {
  if (!isDesignDocumentActive.value && !isBlueprintDocumentActive.value) return
  isRightPanelOpen.value = !isRightPanelOpen.value
}

function toggleBlueprintToolbox() {
  if (!isBlueprintDocumentActive.value) return
  isBlueprintToolboxOpen.value = !isBlueprintToolboxOpen.value
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
