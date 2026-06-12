import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type {
  CreatePagePayload,
  PagePublicationStatus,
  PublishedPageSummary,
  SailorPage,
  SailorPageSummary,
  UpdatePagePayload,
} from '../types/page.types.ts'

export interface PagesApiClient {
  listPages: () => Promise<SailorPageSummary[]>
  listSitePages: (siteId: string) => Promise<SailorPage[]>
  createPage: (payload: CreatePagePayload) => Promise<SailorPage>
  createSitePage: (siteId: string, payload: CreatePagePayload) => Promise<SailorPage>
  getPage: (pageId: string) => Promise<SailorPage>
  updatePage: (pageId: string, payload: UpdatePagePayload) => Promise<SailorPage>
  deletePage: (pageId: string) => Promise<null>
  publishPage: (pageId: string) => Promise<PublishedPageSummary>
  unpublishPage: (pageId: string) => Promise<PagePublicationStatus>
}

const defaultApiClient: PagesApiClient = {
  listPages: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.listPages(...args)),
  listSitePages: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.listSitePages(...args)),
  createPage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.createPage(...args)),
  createSitePage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.createSitePage(...args)),
  getPage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.getPage(...args)),
  updatePage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.updatePage(...args)),
  deletePage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.deletePage(...args)),
  publishPage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.publishPage(...args)),
  unpublishPage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.unpublishPage(...args)),
}

export const usePagesStore = defineStore('web-pages', () => {
  const pages = ref<SailorPageSummary[]>([])
  const pageDocuments = ref<Record<string, SailorPage>>({})
  const activeSiteId = ref<string | null>(null)
  const activePage = ref<SailorPage | null>(null)
  const savedSnapshot = ref<string | null>(null)
  const lastPublished = ref<PublishedPageSummary | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const apiClient = ref<PagesApiClient>(defaultApiClient)

  const isDirty = computed(
    () => activePage.value !== null && savedSnapshot.value !== snapshot(activePage.value),
  )

  function setApiClient(client: PagesApiClient) {
    apiClient.value = client
  }

  function setActiveSiteId(siteId: string | null) {
    activeSiteId.value = siteId
  }

  function setActivePage(page: SailorPage | null) {
    activePage.value = page ? clone(page) : null
    savedSnapshot.value ??= activePage.value ? snapshot(activePage.value) : null
  }

  async function listPages() {
    isLoading.value = true
    error.value = null
    try {
      const listed = activeSiteId.value
        ? await apiClient.value.listSitePages(activeSiteId.value)
        : await apiClient.value.listPages()
      pages.value = listed.map((page) => pageSummary(page))
      return pages.value
    } finally {
      isLoading.value = false
    }
  }

  async function loadPageDocuments() {
    const missing = pages.value.filter((page) => !pageDocuments.value[page.id])
    await Promise.all(missing.map((page) => openPageDocument(page.id)))
    return pageDocuments.value
  }

  async function createPage(payload: CreatePagePayload) {
    isSaving.value = true
    error.value = null
    try {
      const page = activeSiteId.value
        ? await apiClient.value.createSitePage(activeSiteId.value, payload)
        : await apiClient.value.createPage(payload)
      setSavedPage(page)
      upsertSummary(page)
      return page
    } finally {
      isSaving.value = false
    }
  }

  async function createPageAfterActive() {
    const nextIndex = pages.value.length + 1
    const activePageId = activePage.value?.id
    const page = await createPage({ title: `Page ${nextIndex}`, blocks: [] })
    if (activePageId) {
      const withoutNew = pages.value.filter((item) => item.id !== page.id)
      const activeIndex = withoutNew.findIndex((item) => item.id === activePageId)
      if (activeIndex >= 0) {
        const summary = pages.value.find((item) => item.id === page.id)
        if (summary) {
          withoutNew.splice(activeIndex + 1, 0, summary)
          pages.value = withoutNew
        }
      }
    }
    setSavedPage(page)
    return page
  }

  async function duplicateActivePage() {
    if (!activePage.value) return null
    const source = activePage.value
    const page = await createPage({
      title: `${source.title} copy`,
      blocks: clone(source.blocks),
    })
    setSavedPage({ ...page, bodyStyles: clone(source.bodyStyles ?? {}) })
    activePage.value = {
      ...activePage.value!,
      bodyStyles: clone(source.bodyStyles ?? {}),
    }
    return activePage.value
  }

  async function openPage(pageId: string) {
    isLoading.value = true
    error.value = null
    try {
      const page = await openPageDocument(pageId)
      setSavedPage(page)
      upsertSummary(page)
      return page
    } finally {
      isLoading.value = false
    }
  }

  async function switchPage(pageId: string) {
    if (activePage.value?.id === pageId) return activePage.value
    if (isDirty.value) {
      error.value = 'Save current page before switching.'
      throw new Error('Save current page before switching.')
    }
    return openPage(pageId)
  }

  async function saveActivePage() {
    if (!activePage.value) return null
    isSaving.value = true
    error.value = null
    try {
      const saved = await apiClient.value.updatePage(activePage.value.id, {
        title: activePage.value.title,
        slug: activePage.value.slug,
        bodyStyles: activePage.value.bodyStyles,
        blocks: activePage.value.blocks,
      })
      setSavedPage(saved)
      upsertSummary(saved)
      return saved
    } finally {
      isSaving.value = false
    }
  }

  async function deletePage(pageId: string) {
    await apiClient.value.deletePage(pageId)
    pages.value = pages.value.filter((page) => page.id !== pageId)
    delete pageDocuments.value[pageId]
    if (activePage.value?.id === pageId) {
      activePage.value = null
      savedSnapshot.value = null
    }
  }

  async function deleteActivePageAndChooseNext() {
    const pageId = activePage.value?.id
    if (!pageId) return null
    const remaining = pages.value.filter((page) => page.id !== pageId)
    await deletePage(pageId)
    const next = remaining[0]
    return next ? openPage(next.id) : null
  }

  async function publishActivePage() {
    if (!activePage.value) return null
    const published = await apiClient.value.publishPage(activePage.value.id)
    lastPublished.value = published
    pages.value = pages.value.map((page) =>
      page.id === published.pageId ? { ...page, publishedAt: published.publishedAt } : page,
    )
    return published
  }

  async function unpublishActivePage() {
    if (!activePage.value) return null
    const status = await apiClient.value.unpublishPage(activePage.value.id)
    lastPublished.value = null
    pages.value = pages.value.map((page) =>
      page.id === status.pageId ? { ...page, publishedAt: status.publishedAt } : page,
    )
    return status
  }

  function setSavedPage(page: SailorPage) {
    activePage.value = clone(page)
    pageDocuments.value[page.id] = clone(page)
    savedSnapshot.value = snapshot(activePage.value)
  }

  function upsertSummary(page: SailorPage) {
    const summary = pageSummary(page, pages.value.find((item) => item.id === page.id)?.publishedAt ?? null)
    const index = pages.value.findIndex((item) => item.id === page.id)
    if (index === -1) pages.value = [summary, ...pages.value]
    else pages.value[index] = summary
  }

  async function openPageDocument(pageId: string) {
    const page = await apiClient.value.getPage(pageId)
    pageDocuments.value[page.id] = clone(page)
    return page
  }

  function pageDocument(pageId: string) {
    return pageDocuments.value[pageId] ?? null
  }

  return {
    pages,
    pageDocuments,
    activeSiteId,
    activePage,
    lastPublished,
    isLoading,
    isSaving,
    error,
    isDirty,
    setApiClient,
    setActiveSiteId,
    setActivePage,
    listPages,
    loadPageDocuments,
    createPage,
    createPageAfterActive,
    duplicateActivePage,
    openPage,
    switchPage,
    saveActivePage,
    deletePage,
    deleteActivePageAndChooseNext,
    publishActivePage,
    unpublishActivePage,
    pageDocument,
  }
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function snapshot(value: unknown): string {
  return JSON.stringify(value)
}

function pageSummary(page: SailorPage | SailorPageSummary, publishedAt?: string | null): SailorPageSummary {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    updatedAt: page.updatedAt,
    publishedAt: publishedAt ?? ('publishedAt' in page ? page.publishedAt : null) ?? null,
  }
}
