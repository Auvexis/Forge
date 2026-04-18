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
  title: string
  component: Component
  props?: Record<string, unknown>
  position?: 'left' | 'right' | 'bottom'
  width?: 'md' | 'lg' | 'xl'
}

export const useAppPanelStore = defineStore('app-panel', () => {
  const isOpen = ref(false)
  const title = ref('')
  const position = ref<'left' | 'right' | 'bottom'>('right')
  const width = ref<'md' | 'lg' | 'xl'>('md')

  // Utilizar shallowRef é a melhor prática no Vue para armazenar componentes
  // pois não tenta tornar a árvore interna do componente inteira reativa.
  const panelComponent = shallowRef<Component | null>(null)
  const componentProps = ref<Record<string, unknown>>({})

  /**
   * Abre o painel global e monta o componente especificado no corpo (body)
   */
  const openPanel = (config: AppPanelConfig) => {
    title.value = config.title
    position.value = config.position || 'right'
    width.value = config.width || 'md'

    // Uso do markRaw pra garantir que não vamos atar reatividade no objeto descritor do comp
    panelComponent.value = markRaw(config.component)
    componentProps.value = config.props || {}

    isOpen.value = true
  }

  /**
   * Fecha o painel atual
   */
  const closePanel = () => {
    isOpen.value = false

    // Limpamos o lixo depois que a animação for fechada pra não causar flicker
    setTimeout(() => {
      if (!isOpen.value) {
        panelComponent.value = null
        componentProps.value = {}
      }
    }, 300)
  }

  return {
    isOpen,
    title,
    position,
    width,
    panelComponent,
    componentProps,
    openPanel,
    closePanel,
  }
})
