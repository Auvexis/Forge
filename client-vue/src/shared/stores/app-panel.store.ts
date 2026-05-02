import { defineStore } from 'pinia'
import { ref, shallowRef, markRaw, type Component } from 'vue'

export interface AppPanelState {
  isOpen: boolean
  title: string
  position: 'left' | 'right' | 'bottom'
  width: 'md' | 'lg' | 'xl'
  component: Component | null
  props: Record<string, unknown>
}

export interface AppPanelConfig {
  id?: string
  title: string
  component: Component
  props?: Record<string, unknown>
  position?: 'left' | 'right' | 'bottom'
  width?: 'md' | 'lg' | 'xl'
}

export const useAppPanelStore = defineStore('app-panel', () => {
  const panelId = ref('')
  const isOpen = ref(false)
  const title = ref('')
  const position = ref<'left' | 'right' | 'bottom'>('right')
  const width = ref<'md' | 'lg' | 'xl'>('md')

  // Utilizar shallowRef é a melhor prática no Vue para armazenar componentes
  // pois não tenta tornar a árvore interna do componente inteira reativa.
  const panelComponent = shallowRef<Component | null>(null)
  const componentProps = shallowRef<Record<string, unknown>>({})

  let transitionTimeout: number | null = null

  const _setPanelData = (config: AppPanelConfig) => {
    panelId.value = config.id || ''
    title.value = config.title
    position.value = config.position || 'right'
    width.value = config.width || 'md'
    panelComponent.value = markRaw(config.component)
    componentProps.value = config.props || {}
    isOpen.value = true
  }

  /**
   * Abre o painel global e monta o componente especificado no corpo (body)
   */
  const openPanel = (config: AppPanelConfig) => {
    if (transitionTimeout) {
      clearTimeout(transitionTimeout)
      transitionTimeout = null
    }

    const isSame = config.id ? panelId.value === config.id : title.value === config.title

    if (isOpen.value && !isSame) {
      isOpen.value = false
      transitionTimeout = window.setTimeout(() => {
        _setPanelData(config)
      }, 300)
    } else {
      _setPanelData(config)
    }
  }

  /**
   * Fecha o painel atual
   */
  const closePanel = () => {
    isOpen.value = false

    if (transitionTimeout) {
      clearTimeout(transitionTimeout)
      transitionTimeout = null
    }

    // Limpamos o lixo depois que a animação for fechada pra não causar flicker
    transitionTimeout = window.setTimeout(() => {
      if (!isOpen.value) {
        panelId.value = ''
        panelComponent.value = null
        componentProps.value = {}
      }
    }, 300)
  }

  const togglePanel = (config: AppPanelConfig) => {
    const isSame = config.id ? panelId.value === config.id : title.value === config.title
    if (isOpen.value && isSame) {
      closePanel()
    } else {
      openPanel(config)
    }
  }

  return {
    isOpen,
    title,
    position,
    width,
    panelComponent,
    componentProps,
    panelId,
    openPanel,
    closePanel,
    togglePanel,
  }
})
