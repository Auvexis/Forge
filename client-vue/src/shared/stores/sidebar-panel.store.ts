import { defineStore } from 'pinia'
import { ref, shallowRef, markRaw, type Component } from 'vue'

export interface SidebarPanelConfig {
  title: string
  component: Component
  props?: Record<string, unknown>
  width?: 'sm' | 'md' | 'lg'
}

export const useSidebarPanelStore = defineStore('sidebar-panel', () => {
  const isOpen = ref(false)
  const title = ref('')
  const width = ref<'sm' | 'md' | 'lg'>('md')

  const panelComponent = shallowRef<Component | null>(null)
  const componentProps = ref<Record<string, unknown>>({})

  let transitionTimeout: number | null = null

  const _setPanelData = (config: SidebarPanelConfig) => {
    title.value = config.title
    width.value = config.width || 'md'
    panelComponent.value = markRaw(config.component)
    componentProps.value = config.props || {}
    isOpen.value = true
  }

  const openPanel = (config: SidebarPanelConfig) => {
    if (transitionTimeout) {
      clearTimeout(transitionTimeout)
      transitionTimeout = null
    }

    if (isOpen.value && title.value !== config.title) {
      isOpen.value = false
      transitionTimeout = window.setTimeout(() => {
        _setPanelData(config)
      }, 300)
    } else {
      _setPanelData(config)
    }
  }

  const closePanel = () => {
    isOpen.value = false
    
    if (transitionTimeout) {
      clearTimeout(transitionTimeout)
      transitionTimeout = null
    }

    transitionTimeout = window.setTimeout(() => {
      if (!isOpen.value) {
        panelComponent.value = null
        componentProps.value = {}
      }
    }, 300)
  }

  const togglePanel = (config: SidebarPanelConfig) => {
    if (isOpen.value && title.value === config.title) {
      closePanel()
    } else {
      openPanel(config)
    }
  }

  return {
    isOpen,
    title,
    width,
    panelComponent,
    componentProps,
    openPanel,
    closePanel,
    togglePanel,
  }
})
