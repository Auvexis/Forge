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
        :class="{ 'app-sidebar-area--collapsed': isSidebarCollapsed }"
        :style="{ '--sailor-active-sidebar-width': activeSidebarWidth }"
      >
        <Transition name="app-sidebar-universe">
          <div v-if="!appUiStore.isUniverseMode" class="app-sidebar-transition-frame">
            <AppSidebar
              :collapsed="isSidebarCollapsed"
              :show-logo="isSidebarCollapsed"
              :page-label="activeSidebarPageLabel"
              @sign-out="hasEnteredProfile = false"
              @toggle-collapsed="isSidebarCollapsed = !isSidebarCollapsed"
            >
              <template v-if="isSidebarCollapsed" #header-extra>
                <AppHint :hint="hintFor(activityById.search.hintId ?? activityById.search.id)">
                  <button class="nav-link sidebar-activity-link" @click="openGlobalCommandPalette">
                    <LucideIcon :name="activityById.search.icon" :size="16" />
                  </button>
                </AppHint>
              </template>
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

              <template #footer>
                <div class="sidebar-footer-links">
                  <AppHint :hint="hintFor(activityById.search.hintId ?? activityById.search.id)">
                    <button
                      class="nav-link sidebar-activity-link"
                      @click="openGlobalCommandPalette"
                    >
                      <LucideIcon :name="activityById.search.icon" :size="16" />
                    </button>
                  </AppHint>

                  <AppHint :hint="hintFor(activityById.monitor.hintId ?? activityById.monitor.id)">
                    <button
                      class="nav-link sidebar-activity-link"
                      :class="{ 'nav-link--active': isAutomationMonitorOpen }"
                      @click="handleSidebarActivityClick(activityById.monitor)"
                    >
                      <LucideIcon :name="activityById.monitor.icon" :size="16" />
                    </button>
                  </AppHint>

                  <AppHint :hint="hintFor(activityById.docs.hintId ?? activityById.docs.id)">
                    <button
                      type="button"
                      class="nav-link sidebar-activity-link"
                      :class="{ 'nav-link--active': startGuide.controller.isGuideBookOpen }"
                      @click="handleSidebarActivityClick(activityById.docs)"
                    >
                      <LucideIcon :name="activityById.docs.icon" :size="16" />
                    </button>
                  </AppHint>

                  <AppHint :hint="hintFor(activityById.settings.hintId ?? activityById.settings.id)">
                    <button
                      class="nav-link sidebar-activity-link"
                      :class="{ 'nav-link--active': settingsStore.isOpen }"
                      @click="handleSidebarActivityClick(activityById.settings)"
                    >
                      <LucideIcon :name="activityById.settings.icon" :size="16" />
                    </button>
                  </AppHint>
                </div>
              </template>
            </AppSidebar>
          </div>
        </Transition>
        <SidebarGlobalPanel v-if="!appUiStore.isUniverseMode" />
      </div>
    </template>

    <template v-if="!appUiStore.isUniverseMode && !isSidebarCollapsed" #topbar>
      <AppTopbar @open-command-palette="openGlobalCommandPalette" />
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
  sidebarActivityItems,
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
  sidebarWidthForState(isSidebarCollapsed.value, { expandedPx: 288 }),
)
const activeSidebarPageLabel = computed(() => sidebarPageLabelForPath(route.path))
const activityById = Object.fromEntries(sidebarActivityItems.map((item) => [item.id, item])) as {
  search: (typeof sidebarActivityItems)[number]
  monitor: (typeof sidebarActivityItems)[number]
  docs: (typeof sidebarActivityItems)[number]
  settings: (typeof sidebarActivityItems)[number]
}

function openGlobalCommandPalette() {
  void commandPaletteStore.open({ routePath: route.path })
}

function handleSidebarNavClick(item: SidebarNavItem) {
  if (item.id === 'universe') appUiStore.enterUniverseMode()
  dispatchSidebarNavIntent(item)
}

function handleSidebarActivityClick(item: (typeof sidebarActivityItems)[number]) {
  if (item.id === 'search') {
    openGlobalCommandPalette()
    return
  }
  if (item.id === 'settings') {
    settingsStore.toggle()
    return
  }
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
  window.addEventListener('sailor:command-palette:intent', handleUiIntent)
  window.addEventListener('sailor:profiles:intent', handleProfileIntent)
})
onUnmounted(() => {
  window.removeEventListener('sailor:command-palette:intent', handleUiIntent)
  window.removeEventListener('sailor:profiles:intent', handleProfileIntent)
})
</script>

<style scoped>
.app-sidebar-area {
  --sailor-active-sidebar-width: var(--sailor-sidebar-expanded);
  position: relative;
  display: flex;
  height: 100vh;
  flex-shrink: 0;
}

.app-sidebar-transition-frame {
  display: flex;
  height: 100vh;
  flex-shrink: 0;
  will-change: transform, opacity;
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
  transform: translateX(calc(-1 * var(--sailor-active-sidebar-width)));
}
</style>
