import { defineStore } from 'pinia'
import { shallowRef, ref, type Component } from 'vue'
import { useAppPanelStore } from './app-panel.store'
import { useSettingsStore } from './settings.store'
import { useSidebarPanelStore } from './sidebar-panel.store'

interface SidebarSnapshot {
  wasOpen: boolean
  title: string
  width: 'sm' | 'md' | 'lg'
  component: Component | null
  props: Record<string, unknown>
}

interface AppPanelSnapshot {
  wasOpen: boolean
  id: string
  title: string
  position: 'left' | 'right' | 'bottom'
  width: 'md' | 'lg' | 'xl'
  component: Component | null
  props: Record<string, unknown>
}

interface ChromeSnapshot {
  sidebar: SidebarSnapshot
  appPanel: AppPanelSnapshot
  settingsWasOpen: boolean
}

export const useAppUiStore = defineStore('app-ui', () => {
  const isUniverseMode = ref(false)
  const snapshot = shallowRef<ChromeSnapshot | null>(null)

  function captureChromeState(): ChromeSnapshot {
    const sidebarStore = useSidebarPanelStore()
    const appPanelStore = useAppPanelStore()
    const settingsStore = useSettingsStore()

    return {
      sidebar: {
        wasOpen: sidebarStore.isOpen,
        title: sidebarStore.title,
        width: sidebarStore.width,
        component: sidebarStore.panelComponent,
        props: { ...sidebarStore.componentProps },
      },
      appPanel: {
        wasOpen: appPanelStore.isOpen,
        id: appPanelStore.panelId,
        title: appPanelStore.title,
        position: appPanelStore.position,
        width: appPanelStore.width,
        component: appPanelStore.panelComponent,
        props: { ...appPanelStore.componentProps },
      },
      settingsWasOpen: settingsStore.isOpen,
    }
  }

  function hideChrome() {
    const sidebarStore = useSidebarPanelStore()
    const appPanelStore = useAppPanelStore()
    const settingsStore = useSettingsStore()

    if (sidebarStore.isOpen) sidebarStore.closePanel()
    if (appPanelStore.isOpen) appPanelStore.closePanel()
    if (settingsStore.isOpen) settingsStore.close()
  }

  function restoreChrome(state: ChromeSnapshot) {
    const sidebarStore = useSidebarPanelStore()
    const appPanelStore = useAppPanelStore()
    const settingsStore = useSettingsStore()

    if (state.sidebar.wasOpen && state.sidebar.component) {
      sidebarStore.openPanel({
        title: state.sidebar.title,
        width: state.sidebar.width,
        component: state.sidebar.component,
        props: state.sidebar.props,
      })
    }

    if (state.appPanel.wasOpen && state.appPanel.component) {
      appPanelStore.openPanel({
        id: state.appPanel.id,
        title: state.appPanel.title,
        position: state.appPanel.position,
        width: state.appPanel.width,
        component: state.appPanel.component,
        props: state.appPanel.props,
      })
    }

    if (state.settingsWasOpen) {
      settingsStore.open()
    }
  }

  function enterUniverseMode() {
    if (isUniverseMode.value) return

    snapshot.value = captureChromeState()
    hideChrome()
    isUniverseMode.value = true
  }

  function quitUniverseMode() {
    if (!isUniverseMode.value) return

    const stateToRestore = snapshot.value
    isUniverseMode.value = false
    snapshot.value = null

    if (stateToRestore) {
      restoreChrome(stateToRestore)
    }
  }

  return {
    isUniverseMode,
    enterUniverseMode,
    quitUniverseMode,
  }
})
