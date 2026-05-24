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

export interface SailorPage {
  id: string
  profileId: string
  title: string
  slug: string
  bodyStyles?: PageBlockStyles
  blocks: PageBlock[]
  createdAt: string
  updatedAt: string
}

export interface SailorPageSummary {
  id: string
  title: string
  slug: string
  updatedAt: string
  publishedAt?: string | null
}

export interface CreatePagePayload {
  title: string
  slug?: string
  blocks?: PageBlock[]
}

export interface UpdatePagePayload {
  title?: string
  slug?: string
  bodyStyles?: PageBlockStyles
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

export interface PageActionResponse {
  executionId: string
}
