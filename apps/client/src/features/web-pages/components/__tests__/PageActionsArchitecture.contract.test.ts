import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../../..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Page Actions architecture', () => {
  it('keeps core page-actions independent from Vue and Pages UI', () => {
    const domain = read('src/core/page-actions/domain/pageAction.types.ts')
    const application = read('src/core/page-actions/application/pageActionCatalog.ts')

    expect(domain).not.toMatch(/from 'vue'|from "vue"|web-pages/)
    expect(application).not.toMatch(/from 'vue'|from "vue"|web-pages/)
  })

  it('routes Pages UI through the page actions store instead of workflow APIs', () => {
    const panel = read('src/features/web-pages/data-actions/components/PageDataActionsPanel.vue')
    const store = read('src/features/web-pages/data-actions/stores/page-actions.store.ts')

    expect(panel).toMatch(/usePageActionsStore/)
    expect(panel).not.toMatch(/workflowsApi|workflowPageActionGateway/)
    expect(store).toMatch(/workflowPageActionGateway/)
  })

  it('supports scoped action inputs from repeated collection items', () => {
    const domain = read('src/core/page-actions/domain/pageAction.types.ts')
    const bindings = read('src/core/page-actions/application/pageActionBindings.ts')
    const panel = read('src/features/web-pages/data-actions/components/PageDataActionsPanel.vue')
    const store = read('src/features/web-pages/data-actions/stores/page-action-bindings.store.ts')

    expect(domain).toMatch(/source: 'element' \| 'scope'/)
    expect(bindings).toMatch(/createScopeInputBinding/)
    expect(bindings).toMatch(/readScopeValue/)
    expect(store).toMatch(/bindInputToScope/)
    expect(panel).toMatch(/bindScopeInput/)
  })

  it('requires an explicit page action selection before showing binding details', () => {
    const panel = read('src/features/web-pages/data-actions/components/PageDataActionsPanel.vue')
    const store = read('src/features/web-pages/data-actions/stores/page-actions.store.ts')

    expect(store).not.toMatch(/firstAction/)
    expect(store).toMatch(/clearSelection/)
    expect(panel).toMatch(/v-if="!store\.selectedAction"[\s\S]*web-page-data-actions__catalog/)
    expect(panel).toMatch(/v-else class="web-page-data-actions__details"/)
    expect(panel).toMatch(/Back to workflow actions/)
    expect(panel).toMatch(/isSelectedTrigger/)
    expect(panel).toMatch(/void store\.loadAvailableActions\(\)/)
    expect(panel).not.toMatch(/store\.workflows\.length === 0/)
  })

  it('persists all binding groups and keeps collection test runs out of Vue-owned DOM', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const panel = read('src/features/web-pages/data-actions/components/PageDataActionsPanel.vue')

    expect(editor).toMatch(/pageActionBindingsStore\.bindingsByAction/)
    expect(editor).toMatch(/pageActionBindingsStore\.outputBindingsByAction/)
    expect(editor).toMatch(/pageActionBindingsStore\.collectionBindingsByAction/)
    expect(panel).not.toMatch(/replaceChildren|appendChild|fabricPreviewTemplate/)
  })

  it('infers unknown Return types from test runs without persisting the inference', () => {
    const store = read('src/features/web-pages/data-actions/stores/page-actions.store.ts')
    const pageTypes = read('src/features/web-pages/types/page.types.ts')

    expect(store).toMatch(/inferredReturnTypes/)
    expect(store).toMatch(/inferActionReturnTypes/)
    expect(store).toMatch(/resolvedReturnType/)
    expect(store).toMatch(/Array\.isArray\(value\)/)
    expect(pageTypes).not.toMatch(/inferredReturnTypes/)
  })

  it('presents page actions as a guided configuration flow', () => {
    const panel = read('src/features/web-pages/data-actions/components/PageDataActionsPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    for (const label of ['Target', 'Inputs', 'Outputs', 'Lists', 'Test']) {
      expect(panel).toMatch(new RegExp(label))
    }
    expect(panel).toMatch(/web-page-data-actions__catalog/)
    expect(panel).toMatch(/web-page-data-actions__tabs/)
    expect(panel).toMatch(/web-page-data-actions__module/)
    expect(css).toMatch(/\.web-page-data-actions__tab/)
    expect(css).toMatch(/\.web-page-data-actions__module/)
    expect(css).toMatch(/\.web-page-data-actions__target-row/)
  })

  it('exposes page logic through document tabs and a Blueprint workbench', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')
    const panel = read('src/features/web-pages/page-blueprint/PageBlueprintPanel.vue')
    const inspector = read('src/features/web-pages/page-blueprint/PageBlueprintNodeInspector.vue')
    const adapter = read('src/features/web-pages/page-blueprint/pageBlueprintAdapter.ts')
    const document = read('src/features/web-pages/page-blueprint/pageBlueprintDocument.ts')
    const tabs = read('src/features/web-pages/page-blueprint/PageDocumentTabs.vue')
    const store = read('src/features/web-pages/page-blueprint/stores/page-blueprint-workbench.store.ts')
    const css = read('src/features/web-pages/pages.css')

    expect(editor).toMatch(/PageBlueprintPanel/)
    expect(editor).toMatch(/PageDocumentTabs/)
    expect(editor).toMatch(/WorkbenchBottomPanel/)
    expect(editor).toMatch(/WorkbenchStatusBar/)
    expect(editor).toMatch(/workflow-status-bar__button/)
    expect(explorer).not.toMatch(/PageDataActionsPanel|database-zap|value: 'data'/)
    expect(panel).toMatch(/BaseCanvas/)
    expect(panel).toMatch(/pattern-style="square"/)
    expect(adapter).toMatch(/buildPageBlueprintGraph/)
    expect(adapter).toMatch(/return \{ nodes: \[\], edges: \[\] \}/)
    expect(inspector).toMatch(/Return/)
    expect(inspector).toMatch(/returnBindingCount/)
    expect(document).toMatch(/PAGE_BLUEPRINT_DOCUMENT_VERSION/)
    expect(document).toMatch(/normalizePageBlueprintDocument/)
    expect(tabs).toMatch(/web-page-document-tabs/)
    expect(store).toMatch(/openBlueprint/)
    expect(store).toMatch(/const pageScope: PageBlueprintScope/)
    expect(tabs).toMatch(/mousedown\.middle/)
    expect(editor).toMatch(/activePageDocumentKind !== 'blueprint'/)
    expect(editor).toMatch(/handleOpenBlockBlueprint/)
    expect(css).toMatch(/\.web-page-blueprint/)
    expect(css).toMatch(/\.web-page-document-tabs/)
  })

  it('keeps Code and Blueprint document modes out of the old modal and side chrome', () => {
    const editor = read('src/features/web-pages/components/PageEditor.vue')
    const explorer = read('src/features/web-pages/components/PageExplorerPanel.vue')
    const panel = read('src/features/web-pages/page-blueprint/PageBlueprintPanel.vue')
    const inspector = read('src/features/web-pages/page-blueprint/PageBlueprintNodeInspector.vue')
    const css = read('src/features/web-pages/pages.css')
    const pageTypes = read('src/features/web-pages/types/page.types.ts')
    const apiTypes = read('../api/src/core/modules/pages/page-types.ts')

    expect(editor).toMatch(/activePageDocumentKind === 'code' \? 'code' : undefined/)
    expect(editor).not.toMatch(/<BaseModal[\s\S]*<SiteCodeCanvas/)
    expect(explorer).toMatch(/activeTab\?: PageExplorerTab/)
    expect(panel).toMatch(/@items-move="moveBlueprintNodes"/)
    expect(panel).toMatch(/addPaletteNode/)
    expect(panel).toMatch(/startConnection/)
    expect(panel).toMatch(/finishConnection/)
    expect(panel).toMatch(/previewConnectionPath/)
    expect(panel).toMatch(/Page Event/)
    expect(panel).toMatch(/Run Workflow/)
    expect(panel).toMatch(/usePageEditorStore/)
    expect(panel).toMatch(/actionsStore\.selectedAction/)
    expect(panel).toMatch(/duplicateNode/)
    expect(panel).toMatch(/deleteNode/)
    expect(panel).toMatch(/deleteSelectedEdge/)
    expect(panel).toMatch(/PageBlueprintNodeInspector/)
    expect(panel).not.toMatch(/PageDataActionsPanel|detailsStep|Runtime/)
    expect(inspector).toMatch(/configureWorkflow/)
    expect(inspector).not.toMatch(/selectedTargetId|binding-target|bindReturn/)
    expect(inspector).toMatch(/Test node/)
    expect(inspector).toMatch(/resolvePageActionResultPath/)
    expect(panel).toMatch(/bindWorkflowReturn/)
    expect(panel).toMatch(/synchronizePageElements/)
    expect(panel).toMatch(/connectionReturnKey/)
    expect(panel).toMatch(/connectionReturnMode/)
    expect(panel).toMatch(/Single value/)
    expect(panel).toMatch(/Multiple values/)
    expect(panel).toMatch(/data-base-canvas-no-drag/)
    expect(panel).toMatch(/returnKey/)
    expect(panel).not.toMatch(/addBindingNode|addOutputBindingNode|addCollectionBindingNode/)
    expect(panel).toMatch(/filteredPaletteGroups/)
    expect(panel).toMatch(/Search Blueprint nodes/)
    expect(panel).not.toMatch(/Page Action Runtime|Build the dataflow/)
    expect(panel).not.toMatch(/event\.currentTarget.*closest/)
    expect(panel).toMatch(/blueprints:/)
    expect(inspector).toMatch(/Dynamic Values/)
    expect(inspector).toMatch(/changeElementBindingMode/)
    expect(css).toMatch(/web-page-blueprint__node-handle/)
    expect(css).toMatch(/web-page-blueprint__node-toolbar/)
    expect(css).toMatch(/web-page-blueprint__edge-toolbar/)
    expect(css).toMatch(/web-page-blueprint__edge--preview/)
    expect(css).toMatch(/web-page-blueprint__property-list/)
    expect(css).toMatch(/web-page-blueprint__palette-group/)
    expect(pageTypes).toMatch(/blueprints\?: Record<string, PageBlueprintPersistedDocument>/)
    expect(apiTypes).toMatch(/blueprints\?: Record<string, PageBlueprintPersistedDocument>/)
  })

  it('adds semantic theme tokens for the Pages Blueprint workbench', () => {
    const light = read('src/themes/json/light.json')
    const dark = read('src/themes/json/dark.json')
    const css = read('src/features/web-pages/pages.css')
    const panel = read('src/features/web-pages/page-blueprint/PageBlueprintPanel.vue')

    for (const token of [
      'blueprint.canvas.bg',
      'blueprint.canvas.grid',
      'blueprint.panel.bg',
      'blueprint.header.bg',
      'blueprint.node.bg',
      'blueprint.node.header.bg',
      'blueprint.field.bg',
      'blueprint.toolbar.bg',
      'blueprint.edge',
    ]) {
      expect(light).toMatch(new RegExp(`"${token}"`))
      expect(dark).toMatch(new RegExp(`"${token}"`))
    }
    expect(panel).toMatch(/--fabric-blueprint-canvas-bg/)
    expect(css).toMatch(/--fabric-blueprint-node-bg/)
  })

  it('shares the workflow bottom panel chrome with Pages', () => {
    const bottomPanel = read('src/shared/components/workbench/WorkbenchBottomPanel.vue')

    expect(bottomPanel).toMatch(/workbench-bottom-panel/)
    expect(bottomPanel).toMatch(/workbench-bottom-panel__resize/)
    expect(bottomPanel).toMatch(/resize-start/)
    expect(bottomPanel).toMatch(/var\(--fabric-workbench-border\)/)
  })

  it('documents the Page Actions boundary with an ADR', () => {
    const adr = read('../../docs/adr/0001-page-actions-architecture.md')

    expect(adr).toMatch(/Pages components must not call the workflow engine directly/)
    expect(adr).toMatch(/MVP 1 Scope/)
  })
})
