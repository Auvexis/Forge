import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { usePagesStore, type PagesApiClient } from '../pages.store.ts'
import type { SailorPage } from '../../types/page.types.ts'

function page(overrides: Partial<SailorPage> = {}): SailorPage {
  return {
    id: 'page_1',
    profileId: 'profile_a',
    siteId: 'site_1',
    title: 'Landing Page',
    slug: 'landing-page',
    blocks: [],
    createdAt: '2026-05-23T00:00:00.000Z',
    updatedAt: '2026-05-23T00:00:00.000Z',
    ...overrides,
  }
}

function api(): PagesApiClient {
  let current = page()
  return {
    listPages: async () => [current],
    listSitePages: async () => [current],
    createPage: async (payload) => {
      current = page({ title: payload.title, slug: payload.slug ?? 'new-page' })
      return current
    },
    createSitePage: async (_siteId, payload) => {
      current = page({ title: payload.title, slug: payload.slug ?? 'new-page' })
      return current
    },
    getPage: async () => current,
    updatePage: async (_id, payload) => {
      current = { ...current, ...payload, updatedAt: '2026-05-23T01:00:00.000Z' }
      return current
    },
    deletePage: async () => null,
    publishPage: async () => ({
      id: 'published_1',
      pageId: current.id,
      profileId: current.profileId,
      title: current.title,
      slug: current.slug,
      publishedAt: '2026-05-23T02:00:00.000Z',
    }),
    unpublishPage: async () => ({ pageId: current.id, publishedAt: null }),
  }
}

describe('pages store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists, creates, opens, saves and deletes a page', async () => {
    const store = usePagesStore()
    store.setApiClient(api())

    await store.listPages()
    assert.equal(store.pages.length, 1)

    const created = await store.createPage({ title: 'New Page' })
    assert.equal(store.activePage?.id, created.id)

    await store.openPage(created.id)
    store.setActivePage({ ...created, title: 'Changed' })
    assert.equal(store.isDirty, true)

    await store.saveActivePage()
    assert.equal(store.isDirty, false)

    await store.deletePage(created.id)
    assert.equal(store.activePage, null)
  })

  it('publish stores published metadata', async () => {
    const store = usePagesStore()
    store.setApiClient(api())
    await store.createPage({ title: 'New Page' })

    const published = await store.publishActivePage()

    assert.equal(published?.slug, 'new-page')
    assert.equal(store.lastPublished?.id, 'published_1')
  })

  it('unpublish clears published metadata', async () => {
    const store = usePagesStore()
    store.setApiClient(api())
    await store.createPage({ title: 'New Page' })
    await store.publishActivePage()

    const status = await store.unpublishActivePage()

    assert.deepEqual(status, { pageId: store.activePage?.id, publishedAt: null })
    assert.equal(store.lastPublished, null)
    assert.equal(store.pages.find((page) => page.id === store.activePage?.id)?.publishedAt, null)
  })

  it('failed save leaves dirty state intact', async () => {
    const store = usePagesStore()
    store.setApiClient({
      ...api(),
      updatePage: async () => {
        throw new Error('nope')
      },
    })
    store.setActivePage(page())
    store.setActivePage({ ...page(), title: 'Changed' })

    await assert.rejects(() => store.saveActivePage(), /nope/)
    assert.equal(store.isDirty, true)
  })

  it('saves page metadata including public url and favicon', async () => {
    const store = usePagesStore()
    let savedPayload: unknown = null
    store.setApiClient({
      ...api(),
      updatePage: async (_id, payload) => {
        savedPayload = payload
        return page({ ...payload, id: 'page_1' })
      },
    })
    store.setActivePage(page({
      metaTitle: 'Signup',
      metaDescription: 'Create an account',
      faviconUrl: '/sites/site_1/assets/favicon.png',
      publicPath: '/meusite/signup',
    }))

    await store.saveActivePage()

    assert.deepEqual(savedPayload, {
      title: 'Landing Page',
      slug: 'landing-page',
      publicPath: '/meusite/signup',
      metaTitle: 'Signup',
      metaDescription: 'Create an account',
      faviconUrl: '/sites/site_1/assets/favicon.png',
      bodyStyles: undefined,
      blocks: [],
    })
  })

  it('lists and creates pages inside the active site when selected', async () => {
    const store = usePagesStore()
    let listedSiteId = ''
    let createdSiteId = ''
    store.setApiClient({
      ...api(),
      listSitePages: async (siteId) => {
        listedSiteId = siteId
        return [page({ siteId })]
      },
      createSitePage: async (siteId, payload) => {
        createdSiteId = siteId
        return page({ siteId, title: payload.title })
      },
    })

    store.setActiveSiteId('site_docs')
    await store.listPages()
    await store.createPage({ title: 'Docs Home' })

    assert.equal(listedSiteId, 'site_docs')
    assert.equal(createdSiteId, 'site_docs')
    assert.equal(store.activePage?.siteId, 'site_docs')
  })

  it('creates a page at the requested clamped list index', async () => {
    const store = usePagesStore()
    store.setApiClient({
      ...api(),
      listPages: async () => [
        page({ id: 'page_a', title: 'A' }),
        page({ id: 'page_b', title: 'B' }),
      ],
      createPage: async (payload) => page({ id: 'page_new', title: payload.title }),
    })

    await store.listPages()
    const created = await store.createPageAt(1)

    assert.equal(created.id, 'page_new')
    assert.deepEqual(store.pages.map((item) => item.id), ['page_a', 'page_new', 'page_b'])
    assert.equal(store.activePage?.id, 'page_new')
    assert.equal(store.isDirty, true)
  })
})
