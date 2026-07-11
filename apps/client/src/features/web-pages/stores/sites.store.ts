import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { CreateSitePayload, FabricSite, SiteFile, UpdateSitePayload } from '../types/page.types.ts'
import type {
  CreateSiteFilePayload,
  DeleteSiteFilePayload,
  SiteAssetUploadResponse,
  SiteProjectArchive,
  UpdateSiteFilePayload,
} from '../types/page.types.ts'

export interface SitesApiClient {
  listSites: () => Promise<FabricSite[]>
  createSite: (payload: CreateSitePayload) => Promise<FabricSite>
  getSite: (siteId: string) => Promise<FabricSite>
  updateSite: (siteId: string, payload: UpdateSitePayload) => Promise<FabricSite>
  deleteSite: (siteId: string) => Promise<null>
  createSiteFile: (siteId: string, payload: CreateSiteFilePayload) => Promise<FabricSite>
  updateSiteFile: (siteId: string, payload: UpdateSiteFilePayload) => Promise<FabricSite>
  deleteSiteFile: (siteId: string, payload: DeleteSiteFilePayload) => Promise<FabricSite>
  uploadSiteAsset: (siteId: string, file: File) => Promise<SiteAssetUploadResponse>
  exportSiteProject: (siteId: string) => Promise<Blob>
  importSiteProject: (archive: SiteProjectArchive | File) => Promise<FabricSite>
}

const defaultApiClient: SitesApiClient = {
  listSites: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.listSites(...args)),
  createSite: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.createSite(...args)),
  getSite: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.getSite(...args)),
  updateSite: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.updateSite(...args)),
  deleteSite: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.deleteSite(...args)),
  createSiteFile: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.createSiteFile(...args)),
  updateSiteFile: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.updateSiteFile(...args)),
  deleteSiteFile: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.deleteSiteFile(...args)),
  uploadSiteAsset: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.uploadSiteAsset(...args)),
  exportSiteProject: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.exportSiteProject(...args)),
  importSiteProject: (...args) => import('../../../core/api/pages.api.ts').then((api) => api.pagesApi.importSiteProject(...args)),
}

export const useSitesStore = defineStore('web-sites', () => {
  const sites = ref<FabricSite[]>([])
  const activeSite = ref<FabricSite | null>(null)
  const savedSnapshot = ref<string | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref<string | null>(null)
  const apiClient = ref<SitesApiClient>(defaultApiClient)

  const isDirty = computed(
    () => activeSite.value !== null && savedSnapshot.value !== snapshot(activeSite.value),
  )

  function setApiClient(client: SitesApiClient) {
    apiClient.value = client
  }

  function setActiveSite(site: FabricSite | null) {
    activeSite.value = site ? clone(site) : null
    savedSnapshot.value = activeSite.value ? snapshot(activeSite.value) : null
  }

  async function listSites() {
    isLoading.value = true
    error.value = null
    try {
      sites.value = await apiClient.value.listSites()
      return sites.value
    } finally {
      isLoading.value = false
    }
  }

  async function createSite(payload: CreateSitePayload) {
    isSaving.value = true
    error.value = null
    try {
      const site = await apiClient.value.createSite(payload)
      setSavedSite(site)
      upsertSite(site)
      return site
    } finally {
      isSaving.value = false
    }
  }

  async function openSite(siteId: string) {
    isLoading.value = true
    error.value = null
    try {
      const site = await apiClient.value.getSite(siteId)
      setSavedSite(site)
      upsertSite(site)
      return site
    } finally {
      isLoading.value = false
    }
  }

  async function saveActiveSite() {
    if (!activeSite.value) return null
    isSaving.value = true
    error.value = null
    try {
      const saved = await apiClient.value.updateSite(activeSite.value.id, {
        name: activeSite.value.name,
        slug: activeSite.value.slug,
        homePageId: activeSite.value.homePageId,
        files: clone(activeSite.value.files),
      })
      const merged = { ...saved, files: clone(activeSite.value.files) }
      setSavedSite(merged)
      upsertSite(merged)
      return merged
    } finally {
      isSaving.value = false
    }
  }

  async function deleteSite(siteId: string) {
    await apiClient.value.deleteSite(siteId)
    sites.value = sites.value.filter((site) => site.id !== siteId)
    if (activeSite.value?.id === siteId) {
      activeSite.value = null
      savedSnapshot.value = null
    }
  }

  function createFolder(path: string) {
    return addProjectFile({ path, kind: 'folder', updatedAt: now() })
  }

  function createFile(path: string, content = '') {
    return addProjectFile({ path, kind: 'file', content, updatedAt: now() })
  }

  function updateFile(path: string, content: string) {
    if (!activeSite.value) return false
    const file = activeSite.value.files.find((item) => item.path === path && item.kind !== 'folder')
    if (!file) return false
    file.content = content
    file.updatedAt = now()
    return true
  }

  function deleteFile(path: string) {
    if (!activeSite.value) return false
    const nextFiles = activeSite.value.files.filter((file) => file.path !== path)
    if (nextFiles.length === activeSite.value.files.length) return false
    activeSite.value.files = nextFiles
    return true
  }

  async function uploadAsset(file: File) {
    if (!activeSite.value) return null
    const uploaded = await apiClient.value.uploadSiteAsset(activeSite.value.id, file)
    setSavedSite(uploaded.site)
    upsertSite(uploaded.site)
    return uploaded.asset
  }

  async function exportActiveSiteProject() {
    if (!activeSite.value) return null
    return apiClient.value.exportSiteProject(activeSite.value.id)
  }

  async function exportSiteProject(siteId: string) {
    return apiClient.value.exportSiteProject(siteId)
  }

  async function importSiteProject(archive: SiteProjectArchive | File) {
    const site = await apiClient.value.importSiteProject(archive)
    setSavedSite(site)
    upsertSite(site)
    return site
  }

  function addProjectFile(file: SiteFile) {
    if (!activeSite.value) return false
    if (activeSite.value.files.some((item) => item.path === file.path)) return false
    activeSite.value.files = [...activeSite.value.files, file]
    return true
  }

  function setSavedSite(site: FabricSite) {
    activeSite.value = clone(site)
    savedSnapshot.value = snapshot(activeSite.value)
  }

  function upsertSite(site: FabricSite) {
    const index = sites.value.findIndex((item) => item.id === site.id)
    if (index === -1) sites.value = [site, ...sites.value]
    else sites.value[index] = site
  }

  return {
    sites,
    activeSite,
    isLoading,
    isSaving,
    error,
    isDirty,
    setApiClient,
    setActiveSite,
    listSites,
    createSite,
    openSite,
    saveActiveSite,
    deleteSite,
    createFolder,
    createFile,
    updateFile,
    deleteFile,
    uploadAsset,
    exportActiveSiteProject,
    exportSiteProject,
    importSiteProject,
  }
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function snapshot(value: unknown): string {
  return JSON.stringify(value)
}

function now(): string {
  return new Date().toISOString()
}
