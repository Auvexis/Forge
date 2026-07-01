export type StartGuideLang = 'en' | 'pt' | 'es'

export interface StartGuideStepText {
  title: string
  description: string
  prevBtn?: string
  nextBtn?: string
  doneBtn?: string
  skipBtn?: string
}

export type StartGuidePreviewComponentId = 'utility-nodes'

export interface StartGuideMediaPreview {
  type: 'image' | 'gif' | 'video'
  src: string
  alt?: string
}

export interface StartGuideComponentPreview {
  type: 'component'
  component: StartGuidePreviewComponentId
  props?: Record<string, unknown>
}

export type StartGuidePreview = StartGuideMediaPreview | StartGuideComponentPreview

export interface StartGuideStep {
  id: string
  preview?: StartGuidePreview
  lang: Record<StartGuideLang, StartGuideStepText>
}

export interface StartGuideDefinition {
  featureId: string
  version: number
  category: string
  categoryLabel?: string
  defaultLang: StartGuideLang
  autoOpen?: boolean
  steps: StartGuideStep[]
}

export interface StartGuideProgress {
  featureId: string
  status: 'skipped' | 'completed'
  version: number
  updatedAt: string
}
