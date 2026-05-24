import { apiRequest } from './client.ts'
import { ENDPOINTS } from './endpoints.ts'
import type {
  CreatePagePayload,
  PageActionResponse,
  PagePublicationStatus,
  PublishedPageSummary,
  SailorPage,
  SailorPageSummary,
  UpdatePagePayload,
} from '../../features/web-pages/types/page.types.ts'

export const pagesApi = {
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

  submitPageAction: (slug: string, actionId: string, payload: Record<string, unknown>) =>
    apiRequest<PageActionResponse>(ENDPOINTS.PUBLISHED_PAGE_ACTION(slug, actionId), {
      method: 'POST',
      body: payload,
    }),
}
