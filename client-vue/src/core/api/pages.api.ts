import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'
import { API_BASE_URL } from '../constants/app.ts'
import type {
  CreatePagePayload,
  CreateSiteFilePayload,
  CreateSitePayload,
  DeleteSiteFilePayload,
  PageActionResponse,
  PagePublicationStatus,
  PublishedPageSummary,
  SailorPage,
  SailorPageSummary,
  UpdatePagePayload,
  SiteAssetUploadResponse,
  SiteProjectArchive,
  SailorSite,
  UpdateSiteFilePayload,
  UpdateSitePayload,
} from '../../features/web-pages/types/page.types.ts'

export const pagesApi = {
  listSites: () => apiRequest<SailorSite[]>(ENDPOINTS.SITES),

  createSite: (payload: CreateSitePayload) =>
    apiRequest<SailorSite>(ENDPOINTS.SITES, {
      method: 'POST',
      body: payload,
    }),

  getSite: (siteId: string) => apiRequest<SailorSite>(ENDPOINTS.SITE_BY_ID(siteId)),

  updateSite: (siteId: string, payload: UpdateSitePayload) =>
    apiRequest<SailorSite>(ENDPOINTS.SITE_BY_ID(siteId), {
      method: 'PUT',
      body: payload,
    }),

  deleteSite: (siteId: string) =>
    apiRequest<null>(ENDPOINTS.SITE_BY_ID(siteId), {
      method: 'DELETE',
    }),

  listSitePages: (siteId: string) => apiRequest<SailorPage[]>(ENDPOINTS.SITE_PAGES(siteId)),

  createSitePage: (siteId: string, payload: CreatePagePayload) =>
    apiRequest<SailorPage>(ENDPOINTS.SITE_PAGES(siteId), {
      method: 'POST',
      body: payload,
    }),

  createSiteFile: (siteId: string, payload: CreateSiteFilePayload) =>
    apiRequest<SailorSite>(ENDPOINTS.SITE_FILES(siteId), {
      method: 'POST',
      body: payload,
    }),

  updateSiteFile: (siteId: string, payload: UpdateSiteFilePayload) =>
    apiRequest<SailorSite>(ENDPOINTS.SITE_FILES(siteId), {
      method: 'PUT',
      body: payload,
    }),

  deleteSiteFile: (siteId: string, payload: DeleteSiteFilePayload) =>
    apiRequest<SailorSite>(ENDPOINTS.SITE_FILES(siteId), {
      method: 'DELETE',
      body: payload,
    }),

  uploadSiteAsset: (siteId: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return apiRequest<SiteAssetUploadResponse>(ENDPOINTS.SITE_ASSETS(siteId), {
      method: 'POST',
      body,
    })
  },

  exportSiteProject: async (siteId: string) => {
    const response = await fetch(`${API_BASE_URL}${ENDPOINTS.SITE_EXPORT(siteId)}`)
    if (!response.ok) throw new Error(`Failed to export site project: ${response.status}`)
    return response.blob()
  },

  importSiteProject: (archive: SiteProjectArchive | File) => {
    if (typeof File !== 'undefined' && archive instanceof File) {
      const body = new FormData()
      body.append('file', archive)
      return apiRequest<SailorSite>(ENDPOINTS.SITE_IMPORT, {
        method: 'POST',
        body,
      })
    }
    return apiRequest<SailorSite>(ENDPOINTS.SITE_IMPORT, {
      method: 'POST',
      body: archive,
    })
  },

  listPages: () => apiRequest<SailorPageSummary[]>(ENDPOINTS.PAGES),

  createPage: (payload: CreatePagePayload) =>
    apiRequest<SailorPage>(ENDPOINTS.PAGES, {
      method: 'POST',
      body: payload,
    }),

  getPage: (pageId: string) => apiRequest<SailorPage>(ENDPOINTS.PAGE_BY_ID(pageId)),

  updatePage: (pageId: string, payload: UpdatePagePayload) =>
    apiRequest<SailorPage>(ENDPOINTS.PAGE_BY_ID(pageId), {
      method: 'PUT',
      body: payload,
    }),

  deletePage: (pageId: string) =>
    apiRequest<null>(ENDPOINTS.PAGE_BY_ID(pageId), {
      method: 'DELETE',
    }),

  publishPage: (pageId: string) =>
    apiRequest<PublishedPageSummary>(ENDPOINTS.PAGE_PUBLISH(pageId), {
      method: 'POST',
    }),

  unpublishPage: (pageId: string) =>
    apiRequest<PagePublicationStatus>(ENDPOINTS.PAGE_UNPUBLISH(pageId), {
      method: 'POST',
    }),

  submitPageAction: (projectPublicId: string, slug: string, actionId: string, payload: Record<string, unknown>) =>
    apiRequest<PageActionResponse>(ENDPOINTS.PUBLISHED_PAGE_ACTION(projectPublicId, slug, actionId), {
      method: 'POST',
      body: payload,
    }),
}
