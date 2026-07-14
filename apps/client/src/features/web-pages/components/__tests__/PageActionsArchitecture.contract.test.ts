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

  it('documents the Page Actions boundary with an ADR', () => {
    const adr = read('../../docs/adr/0001-page-actions-architecture.md')

    expect(adr).toMatch(/Pages components must not call the workflow engine directly/)
    expect(adr).toMatch(/MVP 1 Scope/)
  })
})
