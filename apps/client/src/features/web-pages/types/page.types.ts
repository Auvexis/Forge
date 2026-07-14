export type PageBlockTag =
  | 'header'
  | 'section'
  | 'div'
  | 'footer'
  | 'form'
  | 'button'
  | 'input'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'youtube'
  | 'link'

export type PageBlockAction =
  | {
      id: string
      type: 'submitForm'
      formId: string
      workflowId?: string
    }
  | {
      id: string
      type: 'triggerWorkflow'
      workflowId: string
      triggerId?: string
    }
  | {
      id: string
      type: 'openUrl'
      url: string
      target?: '_self' | '_blank'
    }

export type PageBlockStyles = Record<string, string | number>
export type PageBlockProps = Record<string, string | number | boolean | null | undefined>
export type PageBlockAttributes = Record<string, string | number | boolean>

export interface PageBlock {
  id: string
  tag: PageBlockTag
  props?: PageBlockProps
  styles?: PageBlockStyles
  elementId?: string
  attributes?: PageBlockAttributes
  className?: string
  customCss?: string
  customJs?: string
  action?: PageBlockAction
  children?: PageBlock[]
}

export type PageActionBindableElementProperty = 'value' | 'checked' | 'text'

export interface PageActionElementBindingTarget {
  elementId: string
  property: PageActionBindableElementProperty
  label: string
}

export interface PageActionInputBinding {
  id: string
  actionId: string
  inputKey: string
  source: 'element' | 'scope'
  target?: PageActionElementBindingTarget
  scopePath?: string
  createdAt: string
}

export interface PageActionOutputBinding {
  id: string
  actionId: string
  resultPath: string
  target: PageActionElementBindingTarget
  createdAt: string
}

export interface PageActionCollectionBinding {
  id: string
  actionId: string
  collectionPath: string
  targetElementId: string
  itemAlias: string
  mode?: 'repeater' | 'table'
  createdAt: string
}

export interface PageActionDocument {
  inputBindings: Record<string, Record<string, PageActionInputBinding>>
  outputBindings?: Record<string, PageActionOutputBinding[]>
  collectionBindings?: Record<string, PageActionCollectionBinding[]>
}

export interface FabricPage {
  id: string
  profileId: string
  siteId: string
  title: string
  slug: string
  publicPath?: string
  metaTitle?: string
  metaDescription?: string
  faviconUrl?: string
  bodyStyles?: PageBlockStyles
  pageActions?: PageActionDocument
  blocks: PageBlock[]
  createdAt: string
  updatedAt: string
}

export interface FabricPageSummary {
  id: string
  title: string
  slug: string
  updatedAt: string
  publishedAt?: string | null
}

export interface CreatePagePayload {
  title: string
  slug?: string
  publicPath?: string
  metaTitle?: string
  metaDescription?: string
  faviconUrl?: string
  bodyStyles?: PageBlockStyles
  pageActions?: PageActionDocument
  blocks?: PageBlock[]
}

export interface UpdatePagePayload {
  title?: string
  slug?: string
  publicPath?: string
  metaTitle?: string
  metaDescription?: string
  faviconUrl?: string
  bodyStyles?: PageBlockStyles
  pageActions?: PageActionDocument
  blocks?: PageBlock[]
}

export interface PublishedPageSummary {
  id: string
  pageId: string
  profileId: string
  title: string
  slug: string
  publishedAt: string
}

export interface SiteFile {
  path: string
  kind: 'folder' | 'file' | 'asset'
  content?: string
  url?: string
  mimeType?: string
  size?: number
  updatedAt: string
}

export interface FabricSite {
  id: string
  publicId: string
  profileId: string
  name: string
  slug: string
  homePageId: string | null
  files: SiteFile[]
  createdAt: string
  updatedAt: string
}

export interface CreateSitePayload {
  name: string
  slug?: string
}

export interface UpdateSitePayload {
  name?: string
  slug?: string
  homePageId?: string | null
  files?: SiteFile[]
}

export interface CreateSiteFilePayload {
  path: string
  kind: SiteFile['kind']
  content?: string
}

export interface UpdateSiteFilePayload {
  path: string
  content: string
}

export interface DeleteSiteFilePayload {
  path: string
}

export interface SiteAssetUploadResponse {
  site: FabricSite
  asset: SiteFile
}

export interface SiteProjectArchive {
  manifest: {
    schemaVersion: 1
    site: {
      name: string
      slug: string
      homePageId: string | null
    }
  }
  pages: Array<{
    id: string
    title: string
    slug: string
    publicPath?: string
    bodyStyles?: PageBlockStyles
    pageActions?: PageActionDocument
    blocks: PageBlock[]
  }>
  files: SiteFile[]
  assets: Array<{
    path: string
    mimeType?: string
    base64: string
  }>
}

export interface PagePublicationStatus {
  pageId: string
  publishedAt: string | null
}

export interface PageActionResponse {
  executionId: string
  status?: string | null
  result?: unknown
}
