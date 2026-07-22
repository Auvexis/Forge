export type GuideProgressScope = 'install' | 'profile' | 'account' | 'workspace' | 'session'

export interface GuideProgressState {
  guideId: string
  status: 'skipped' | 'completed'
  version: number
  updatedAt: string
}

export interface GuideRewardEvent {
  type: string
  eventId?: string
  evidence?: Record<string, string>
}
