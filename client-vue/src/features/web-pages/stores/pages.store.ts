import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type {
  CreatePagePayload,
  PublishedPageSummary,
  SailorPage,
  SailorPageSummary,
  UpdatePagePayload,
} from '../types/page.types.ts'

export interface PagesApiClient {
  listPages: () => Promise<SailorPageSummary[]>
  createPage: (payload: CreatePagePayload) => Promise<SailorPage>
  getPage: (pageId: string) => Promise<SailorPage>
  updatePage: (pageId: string, payload: UpdatePagePayload) => Promise<SailorPage>
  deletePage: (pageId: string) => Promise<null>
  publishPage: (pageId: string) => Promise<PublishedPageSummary>
}

const defaultApiClient: PagesApiClient = {
  listPages: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.listPages(...args)),
  createPage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.createPage(...args)),
  getPage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.getPage(...args)),
  updatePage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.updatePage(...args)),
  deletePage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.deletePage(...args)),
  publishPage: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.publishPage(...args)),
}

export const usePagesStore = defineStore('web-pages', () => {
  const pages = ref<SailorPageSummary[]>([])
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

  function setActivePage(page: SailorPage | null) {
    activePage.value = page ? clone(page) : null
    savedSnapshot.value ??= activePage.value ? snapshot(activePage.value) : null
  }

  async function listPages() {
    isLoading.value = true
    error.value = null
    try {
      pages.value = await apiClient.value.listPages()
      return pages.value
    } finally {
      isLoading.value = false
    }
  }

  async function createPage(payload: CreatePagePayload) {
    isSaving.value = true
    error.value = null
    try {
      const page = await apiClient.value.createPage(payload)
      setSavedPage(page)
      upsertSummary(page)
      return page
    } finally {
      isSaving.value = false
    }
  }

  async function openPage(pageId: string) {
    isLoading.value = true
    error.value = null
    try {
      const page = await apiClient.value.getPage(pageId)
      setSavedPage(page)
      upsertSummary(page)
      return page
    } finally {
      isLoading.value = false
    }
  }

  async function saveActivePage() {
    if (!activePage.value) return null
    isSaving.value = true
    error.value = null
    try {
      const saved = await apiClient.value.updatePage(activePage.value.id, {
        title: activePage.value.title,
        slug: activePage.value.slug,
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
    if (activePage.value?.id === pageId) {
      activePage.value = null
      savedSnapshot.value = null
    }
  }

  async function publishActivePage() {
    if (!activePage.value) return null
    const published = await apiClient.value.publishPage(activePage.value.id)
    lastPublished.value = published
    return published
  }

  function setSavedPage(page: SailorPage) {
    activePage.value = clone(page)
    savedSnapshot.value = snapshot(activePage.value)
  }

  function upsertSummary(page: SailorPage) {
    const summary = {
      id: page.id,
      title: page.title,
      slug: page.slug,
      updatedAt: page.updatedAt,
    }
    const index = pages.value.findIndex((item) => item.id === page.id)
    if (index === -1) pages.value = [summary, ...pages.value]
    else pages.value[index] = summary
  }

  return {
    pages,
    activePage,
    lastPublished,
    isLoading,
    isSaving,
    error,
    isDirty,
    setApiClient,
    setActivePage,
    listPages,
    createPage,
    openPage,
    saveActivePage,
    deletePage,
    publishActivePage,
  }
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function snapshot(value: unknown): string {
  return JSON.stringify(value)
}
