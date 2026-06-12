import type { Component } from 'vue'
import type { StartGuidePreviewComponentId } from './startGuide.types'
import UtilityNodesGuidePreview from './previews/UtilityNodesGuidePreview.vue'

export const startGuidePreviewComponents: Record<StartGuidePreviewComponentId, Component> = {
  'utility-nodes': UtilityNodesGuidePreview,
}
