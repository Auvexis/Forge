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

  const openPanel = (config: SidebarPanelConfig) => {
    title.value = config.title
    width.value = config.width || 'md'
    panelComponent.value = markRaw(config.component)
    componentProps.value = config.props || {}
    isOpen.value = true
  }

  const closePanel = () => {
    isOpen.value = false
    setTimeout(() => {
      if (!isOpen.value) {
        panelComponent.value = null
        componentProps.value = {}
      }
    }, 300)
  }

  const togglePanel = (config: SidebarPanelConfig) => {
    // Basic check if it's the same component
    if (isOpen.value && panelComponent.value === markRaw(config.component)) {
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
