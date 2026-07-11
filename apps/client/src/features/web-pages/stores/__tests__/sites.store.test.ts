import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { useSitesStore, type SitesApiClient } from '../sites.store.ts'
import type { FabricSite } from '../../types/page.types.ts'

function site(overrides: Partial<FabricSite> = {}): FabricSite {
  return {
    id: 'site_1',
    publicId: 'public_1',
    profileId: 'profile_a',
    name: 'Marketing Site',
    slug: 'marketing-site',
    homePageId: null,
    files: [
      { path: 'pages', kind: 'folder', updatedAt: '2026-05-24T00:00:00.000Z' },
      { path: 'assets', kind: 'folder', updatedAt: '2026-05-24T00:00:00.000Z' },
    ],
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
    ...overrides,
  }
}

function api(): SitesApiClient {
  let current = site()
  return {
    listSites: async () => [current],
    createSite: async (payload) => {
      current = site({ name: payload.name, slug: payload.slug ?? 'new-site' })
      return current
    },
    getSite: async () => current,
    updateSite: async (_siteId, payload) => {
      current = { ...current, ...payload, updatedAt: '2026-05-24T01:00:00.000Z' }
      return current
    },
    deleteSite: async () => null,
    createSiteFile: async (_siteId, payload) => {
      current = { ...current, files: [...current.files, { ...payload, updatedAt: '2026-05-24T01:00:00.000Z' }] }
      return current
    },
    updateSiteFile: async (_siteId, payload) => {
      current = {
        ...current,
        files: current.files.map((file) => file.path === payload.path ? { ...file, content: payload.content } : file),
      }
      return current
    },
    deleteSiteFile: async (_siteId, payload) => {
      current = { ...current, files: current.files.filter((file) => file.path !== payload.path) }
      return current
    },
    uploadSiteAsset: async () => {
      const asset = {
        path: 'assets/logo.png',
        kind: 'asset' as const,
        mimeType: 'image/png',
        size: 3,
        url: '/sites/site_1/assets/logo.png',
        updatedAt: '2026-05-24T01:00:00.000Z',
      }
      current = { ...current, files: [...current.files, asset] }
      return { site: current, asset }
    },
    exportSiteProject: async () => new Blob(['PK']),
    importSiteProject: async (archive) => {
      current = site({ id: 'site_imported', name: archive.manifest.site.name, slug: archive.manifest.site.slug })
      return current
    },
  }
}

describe('sites store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lists, creates, opens, saves and deletes a site', async () => {
    const store = useSitesStore()
    let savedFilesLength = 0
    store.setApiClient({
      ...api(),
      updateSite: async (_siteId, payload) => {
        savedFilesLength = payload.files?.length ?? 0
        return site({ ...payload, files: payload.files ?? [] })
      },
    })

    await store.listSites()
    assert.equal(store.sites.length, 1)

    const created = await store.createSite({ name: 'New Site' })
    assert.equal(store.activeSite?.id, created.id)

    store.setActiveSite({ ...created, name: 'Changed' })
    store.createFile('pages/home/home.css', 'body { margin: 0; }')
    assert.equal(store.isDirty, true)

    await store.saveActiveSite()
    assert.equal(savedFilesLength, 3)
    assert.equal(store.isDirty, false)

    await store.deleteSite(created.id)
    assert.equal(store.activeSite, null)
  })

  it('creates folders and files in the active site project', () => {
    const store = useSitesStore()
    store.setActiveSite(site())

    assert.equal(store.createFolder('assets/brand'), true)
    assert.equal(store.createFile('pages/home/custom.css', 'body { margin: 0; }'), true)
    assert.equal(store.updateFile('pages/home/custom.css', 'body { padding: 0; }'), true)

    assert.equal(store.activeSite?.files.some((file) => file.path === 'assets/brand'), true)
    assert.equal(store.activeSite?.files.find((file) => file.path === 'pages/home/custom.css')?.content, 'body { padding: 0; }')
    assert.equal(store.isDirty, true)
  })

  it('rejects duplicate project paths and deletes files', () => {
    const store = useSitesStore()
    store.setActiveSite(site())

    assert.equal(store.createFile('pages/home/home.js', 'console.log("ok")'), true)
    assert.equal(store.createFile('pages/home/home.js', 'console.log("dupe")'), false)
    assert.equal(store.deleteFile('pages/home/home.js'), true)
    assert.equal(store.activeSite?.files.some((file) => file.path === 'pages/home/home.js'), false)
  })

  it('uploads an asset and updates the active site', async () => {
    const store = useSitesStore()
    store.setApiClient(api())
    store.setActiveSite(site())

    const asset = await store.uploadAsset({} as File)

    assert.equal(asset?.path, 'assets/logo.png')
    assert.equal(store.activeSite?.files.some((file) => file.path === 'assets/logo.png'), true)
  })

  it('replaces active site files when switching projects', () => {
    const store = useSitesStore()
    const first = site({
      id: 'site_a',
      files: [
        ...site().files,
        { path: 'assets/a.png', kind: 'asset', url: '/sites/site_a/assets/a.png', updatedAt: '2026-05-24T01:00:00.000Z' },
      ],
    })
    const second = site({ id: 'site_b', name: 'Clean Site', slug: 'clean-site' })

    store.setActiveSite(first)
    store.setActiveSite(second)

    assert.equal(store.activeSite?.id, 'site_b')
    assert.equal(store.activeSite?.files.some((file) => file.path === 'assets/a.png'), false)
    assert.equal(store.isDirty, false)
  })

  it('exports and imports site projects', async () => {
    const store = useSitesStore()
    store.setApiClient(api())
    store.setActiveSite(site())

    const archive = {
      manifest: { schemaVersion: 1 as const, site: { name: 'Marketing Site', slug: 'marketing-site', homePageId: null } },
      pages: [],
      files: [],
      assets: [],
    }
    const exported = await store.exportActiveSiteProject()
    const imported = await store.importSiteProject(archive)

    assert.equal(await exported?.text(), 'PK')
    assert.equal(imported?.id, 'site_imported')
    assert.equal(store.activeSite?.id, 'site_imported')
  })

  it('exports a site project by id without switching the active site', async () => {
    const store = useSitesStore()
    let exportedSiteId = ''
    store.setApiClient({
      ...api(),
      exportSiteProject: async (siteId) => {
        exportedSiteId = siteId
        return new Blob(['ZIP'])
      },
    })
    store.setActiveSite(site({ id: 'site_active' }))

    const exported = await store.exportSiteProject('site_other')

    assert.equal(exportedSiteId, 'site_other')
    assert.equal(await exported?.text(), 'ZIP')
    assert.equal(store.activeSite?.id, 'site_active')
  })
})
