export type HintPosition = 'left' | 'top' | 'right' | 'bottom'

export interface AppHintContent {
  title: string
  description: string
  position?: HintPosition
  image?: string
  gif?: string
}

export type ButtonHint = AppHintContent
