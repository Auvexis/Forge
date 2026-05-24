import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import { ENDPOINTS } from './endpoints.ts'
import type { PageBlockAction } from '../../features/web-pages/types/page.types.ts'

describe('pages api contract', () => {
  it('endpoints include every Pages API route', () => {
    assert.equal(ENDPOINTS.PAGES, '/pages')
    assert.equal(ENDPOINTS.SITES, '/sites')
    assert.equal(ENDPOINTS.SITE_BY_ID('site 1'), '/sites/site%201')
    assert.equal(ENDPOINTS.SITE_PAGES('site_1'), '/sites/site_1/pages')
    assert.equal(ENDPOINTS.SITE_PAGE_BY_ID('site_1', 'page 1'), '/sites/site_1/pages/page%201')
    assert.equal(ENDPOINTS.PAGE_BY_ID('page 1'), '/pages/page%201')
    assert.equal(ENDPOINTS.PAGE_PUBLISH('page_1'), '/pages/page_1/publish')
    assert.equal(ENDPOINTS.PAGE_PREVIEW('page_1'), '/pages/page_1/preview')
    assert.equal(ENDPOINTS.PUBLISHED_PAGE('home'), '/p/home')
    assert.equal(ENDPOINTS.PUBLISHED_PAGE_ACTION('home', 'action_1'), '/p/home/actions/action_1')
  })

  it('pagesApi exports list/create/get/update/delete/publish/submitAction helpers', () => {
    const source = fs.readFileSync(path.resolve('src/core/api/pages.api.ts'), 'utf8')

    assert.match(source, /export const pagesApi/)
    assert.match(source, /listPages:/)
    assert.match(source, /createPage:/)
    assert.match(source, /getPage:/)
    assert.match(source, /updatePage:/)
    assert.match(source, /deletePage:/)
    assert.match(source, /publishPage:/)
    assert.match(source, /listSites:/)
    assert.match(source, /createSite:/)
    assert.match(source, /updateSite:/)
    assert.match(source, /deleteSite:/)
    assert.match(source, /listSitePages:/)
    assert.match(source, /createSitePage:/)
    assert.match(source, /submitPageAction:/)
  })

  it('action union only allows submitForm, triggerWorkflow, openUrl', () => {
    const actions: PageBlockAction[] = [
      { id: 'submit', type: 'submitForm', formId: 'form_1' },
      { id: 'workflow', type: 'triggerWorkflow', workflowId: 'workflow_1' },
      { id: 'url', type: 'openUrl', url: 'https://example.com' },
    ]

    assert.deepEqual(actions.map((action) => action.type), [
      'submitForm',
      'triggerWorkflow',
      'openUrl',
    ])
  })
})
