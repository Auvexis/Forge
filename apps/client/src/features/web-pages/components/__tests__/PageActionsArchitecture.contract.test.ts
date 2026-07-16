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
    expect(panel).toMatch(/Select a workflow trigger/)
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

  it('presents page actions as a guided configuration flow', () => {
    const panel = read('src/features/web-pages/data-actions/components/PageDataActionsPanel.vue')
    const css = read('src/features/web-pages/pages.css')

    for (const label of ['Run target', 'Inputs', 'Result bindings', 'Collections', 'Test action']) {
      expect(panel).toMatch(new RegExp(label))
    }
    expect(panel).toMatch(/web-page-data-actions__catalog/)
    expect(panel).toMatch(/web-page-data-actions__step-header/)
    expect(css).toMatch(/\.web-page-data-actions__step/)
    expect(css).toMatch(/\.web-page-data-actions__target-row/)
  })

  it('documents the Page Actions boundary with an ADR', () => {
    const adr = read('../../docs/adr/0001-page-actions-architecture.md')

    expect(adr).toMatch(/Pages components must not call the workflow engine directly/)
    expect(adr).toMatch(/MVP 1 Scope/)
  })
})
