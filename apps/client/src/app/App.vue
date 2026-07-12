<template>
  <router-view v-if="isPublicRoute" v-slot="{ Component }">
    <component :is="Component" />
    <AppToaster />
  </router-view>

  <ProfileSelectionPage v-else-if="!hasEnteredProfile" @entered="hasEnteredProfile = true" />

  <AppShell v-else>
    <!-- Use the AppSidebar in the sidebar slot -->
    <template #sidebar>
      <div
        class="app-sidebar-area"
        :class="{ 'app-sidebar-area--collapsed': isSidebarCollapsed || appUiStore.isUniverseMode }"
        :style="{ '--fabric-active-sidebar-width': activeSidebarWidth }"
      >
        <Transition name="app-sidebar-universe">
          <div v-if="!appUiStore.isUniverseMode" class="app-sidebar-transition-frame">
            <AppSidebar :collapsed="false">
              <section
                v-for="section in sidebarSections"
                :key="section.label"
                class="sidebar-section"
              >
                <span class="sidebar-section__label">{{ section.label }}</span>
                <div class="sidebar-section__items">
                  <AppHint
                    v-for="item in section.items"
                    :key="item.id"
                    :hint="hintFor(item.hintId ?? item.id)"
                  >
                    <router-link
                      v-if="item.route"
                      :to="item.route"
                      class="nav-link suite-nav-link"
                      :class="{ 'nav-link--active': isSidebarNavItemActive(item) }"
                      :style="{ '--suite-nav-accent': item.accent }"
                      @click="handleSidebarNavClick(item)"
                    >
                      <LucideIcon :name="item.icon" :size="18" />
                      <span class="suite-nav-link__label">{{ item.label }}</span>
                    </router-link>
                    <button
                      v-else
                      type="button"
                      class="nav-link suite-nav-link"
                      :class="{ 'nav-link--active': isSidebarNavItemActive(item) }"
                      :style="{ '--suite-nav-accent': item.accent }"
                      @click="handleSidebarNavClick(item)"
                    >
                      <LucideIcon :name="item.icon" :size="18" />
                      <span class="suite-nav-link__label">{{ item.label }}</span>
                    </button>
                  </AppHint>
                </div>
              </section>
            </AppSidebar>
          </div>
        </Transition>
        <SidebarGlobalPanel v-if="!appUiStore.isUniverseMode" />
      </div>
    </template>

    <template v-if="!appUiStore.isUniverseMode" #topbar>
      <AppTopbar
        :sidebar-collapsed="isSidebarCollapsed"
        :page-label="activeSidebarPageLabel"
        @toggle-sidebar="isSidebarCollapsed = !isSidebarCollapsed"
        @open-command-palette="openGlobalCommandPalette"
        @open-settings="settingsStore.toggle()"
        @open-docs="startGuide.openGuideBook()"
        @switch-profile="hasEnteredProfile = false"
        @logout="hasEnteredProfile = false"
      />
    </template>

    <!-- Main Content Area -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Global Overlays -->
    <template #overlay>
      <AppGlobalSettings />
      <ProfileSettingsPanel v-model="isProfileSettingsOpen" />
      <AppGlobalAutomationMonitor />
      <AppGlobalAgentPanel />
      <GlobalNotificationPanel />
      <StartGuideHost />
      <GuideBookHost />
      <ExternalPluginInstaller
        :is-open="isPluginInstallerOpen"
        @close="isPluginInstallerOpen = false"
      />
    </template>
  </AppShell>

  <template v-if="!isPublicRoute">
    <CommandPaletteHost />
    <AppToaster />
    <AppConfirmPanel />
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/shared/components/layout/AppShell.vue'
import AppSidebar from '@/shared/components/layout/AppSidebar.vue'
import AppTopbar from '@/shared/components/layout/AppTopbar.vue'
import AppHint from '@/shared/components/hints/AppHint.vue'
import AppToaster from '@/shared/components/feedback/AppToaster.vue'
import GlobalNotificationPanel from '@/shared/components/feedback/GlobalNotificationPanel.vue'
import AppConfirmPanel from '@/shared/components/layout/AppConfirmPanel.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import SidebarGlobalPanel from '@/shared/components/layout/SidebarGlobalPanel.vue'
import AppGlobalSettings from '@/shared/components/layout/AppGlobalSettings.vue'
import CommandPaletteHost from '@/features/command-palette/components/CommandPaletteHost.vue'
import AppGlobalAgentPanel from '@/features/agent-panel/components/AppGlobalAgentPanel.vue'
import { useAgentPanelUiStore } from '@/features/agent-panel/stores/agentPanelUi.store'
import { useAgentPanelStore } from '@/features/agent-panel/stores/agentPanel.store'
import { useCommandPaletteStore } from '@/features/command-palette/stores/commandPalette.store'
import { useSettingsStore } from '@/shared/stores/settings.store'
import { useAppUiStore } from '@/shared/stores/app-ui.store'
import { useStartGuide } from '@/shared/start-guide/useStartGuide'
import StartGuideHost from '@/shared/start-guide/StartGuideHost.vue'
import GuideBookHost from '@/shared/start-guide/GuideBookHost.vue'
import ExternalPluginInstaller from '@/features/plugins/components/ExternalPluginInstaller.vue'
import ProfileSelectionPage from '@/features/profiles/components/ProfileSelectionPage.vue'
import ProfileSettingsPanel from '@/features/profiles/components/ProfileSettingsPanel.vue'
import {
  dispatchSidebarNavIntent,
  sidebarPageLabelForPath,
  sidebarSections,
  sidebarWidthForState,
  type SidebarNavIntent,
  type SidebarNavItem,
} from '@/shared/components/layout/appSidebarNavigation'
import { sidebarHintById } from '@/shared/components/layout/sidebarHints'
import AppGlobalAutomationMonitor, {
  isAutomationMonitorOpen,
  toggleAutomationMonitor,
} from '@/shared/components/layout/AppGlobalAutomationMonitor.vue'

const settingsStore = useSettingsStore()
const appUiStore = useAppUiStore()
const agentPanelUi = useAgentPanelUiStore()
const agentPanelStore = useAgentPanelStore()
const commandPaletteStore = useCommandPaletteStore()
const startGuide = useStartGuide()
const route = useRoute()
const isPublicRoute = computed(() => route.meta.public === true)
const isSidebarCollapsed = ref(false)
const isPluginInstallerOpen = ref(false)
const isProfileSettingsOpen = ref(false)
const hasEnteredProfile = ref(false)
const activeSidebarWidth = computed(() =>
  sidebarWidthForState(false, { expandedPx: 288 }),
)
const activeSidebarPageLabel = computed(() => sidebarPageLabelForPath(route.path))

function openGlobalCommandPalette() {
  void commandPaletteStore.open({ routePath: route.path })
}

function handleSidebarNavClick(item: SidebarNavItem) {
  if (item.id === 'universe') appUiStore.enterUniverseMode()
  dispatchSidebarNavIntent(item)
}

function hintFor(id: string) {
  return sidebarHintById[id as keyof typeof sidebarHintById]
}

function isSidebarNavItemActive(item: SidebarNavItem) {
  if (item.route) return route.path.startsWith(item.route)
  if (item.intent?.type === 'monitoring.open') return isAutomationMonitorOpen.value
  return item.intent?.type === 'plugin-installer.open' && isPluginInstallerOpen.value
}

function openPluginInstallerPanel() {
  isPluginInstallerOpen.value = true
}

function handleUiIntent(event: Event) {
  const intent = (event as CustomEvent<SidebarNavIntent>).detail
  if (intent?.type === 'plugin-installer.open') openPluginInstallerPanel()
  if (intent?.type === 'monitoring.open') {
    if (!isAutomationMonitorOpen.value) toggleAutomationMonitor()
  }
  if (intent?.type === 'agent-panel.open') {
    agentPanelStore.clearDevSessionContext()
    agentPanelUi.open()
  }
  if (intent?.type === 'guide-book.open') startGuide.openGuideBook()
}

function handleProfileIntent() {
  isProfileSettingsOpen.value = true
}

onMounted(() => {
  window.addEventListener('fabric:command-palette:intent', handleUiIntent)
  window.addEventListener('fabric:profiles:intent', handleProfileIntent)
})
onUnmounted(() => {
  window.removeEventListener('fabric:command-palette:intent', handleUiIntent)
  window.removeEventListener('fabric:profiles:intent', handleProfileIntent)
})
</script>

<style scoped>
.app-sidebar-area {
  --fabric-active-sidebar-width: var(--fabric-sidebar-expanded);
  --app-sidebar-slide-duration: 460ms;
  --app-sidebar-slide-ease: cubic-bezier(0.22, 1, 0.36, 1);
  position: relative;
  display: flex;
  width: var(--fabric-active-sidebar-width);
  height: 100%;
  flex-shrink: 0;
  overflow: visible;
  transition: width var(--app-sidebar-slide-duration) var(--app-sidebar-slide-ease);
}

.app-sidebar-area--collapsed {
  width: 0;
}

.app-sidebar-transition-frame {
  display: flex;
  width: var(--fabric-active-sidebar-width);
  height: 100%;
  flex-shrink: 0;
  opacity: 1;
  transform: translateX(0);
  transition:
    transform var(--app-sidebar-slide-duration) var(--app-sidebar-slide-ease),
    opacity 320ms var(--fabric-ease-standard);
  will-change: transform, opacity;
}

.app-sidebar-area--collapsed .app-sidebar-transition-frame {
  opacity: 0;
  transform: translateX(-100%);
}

.app-sidebar-universe-enter-active,
.app-sidebar-universe-leave-active {
  transition:
    transform 360ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 260ms ease;
}

.app-sidebar-universe-enter-from,
.app-sidebar-universe-leave-to {
  opacity: 0;
  transform: translateX(calc(-1 * var(--fabric-active-sidebar-width)));
}
</style>
