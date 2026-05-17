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
              @sign-out="hasEnteredProfile = false"
              @toggle-collapsed="isSidebarCollapsed = !isSidebarCollapsed"
            >
              <template v-if="isSidebarCollapsed" #header-extra>
                <SidebarHint
                  :title="activityById.search.label"
                  :description="activityById.search.description"
                  :icon="activityById.search.icon"
                >
                  <button class="nav-link sidebar-activity-link" @click="openGlobalCommandPalette">
                    <LucideIcon :name="activityById.search.icon" :size="16" />
                  </button>
                </SidebarHint>
              </template>
              <section
                v-for="section in sidebarSections"
                :key="section.label"
                class="sidebar-section"
              >
                <span class="sidebar-section__label">{{ section.label }}</span>
                <div class="sidebar-section__items">
                  <SidebarHint
                    v-for="item in section.items"
                    :key="item.id"
                    :title="item.label"
                    :description="item.description"
                    :icon="item.icon"
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
                  </SidebarHint>
                </div>
              </section>

              <template #footer>
                <BaseWoobyMenu
                  tag="div"
                  class="sidebar-footer-links"
                  active-selector=".nav-link--active"
                >
                  <SidebarHint
                    :title="activityById.search.label"
                    :description="activityById.search.description"
                    :icon="activityById.search.icon"
                  >
                    <button class="nav-link sidebar-activity-link" @click="openGlobalCommandPalette">
                      <LucideIcon :name="activityById.search.icon" :size="16" />
                    </button>
                  </SidebarHint>

                  <SidebarHint
                    :title="activityById.monitor.label"
                    :description="activityById.monitor.description"
                    :icon="activityById.monitor.icon"
                  >
                    <button
                      class="nav-link sidebar-activity-link"
                      :class="{ 'nav-link--active': isMonitorOpen }"
                      @click="toggleMonitor"
                    >
                      <LucideIcon :name="activityById.monitor.icon" :size="16" />
                    </button>
                  </SidebarHint>

                  <SidebarHint
                    :title="activityById.docs.label"
                    :description="activityById.docs.description"
                    :icon="activityById.docs.icon"
                  >
                    <a
                      href="https://docs.sailor.dev"
                      target="_blank"
                      class="nav-link sidebar-activity-link"
                    >
                      <LucideIcon :name="activityById.docs.icon" :size="16" />
                    </a>
                  </SidebarHint>

                  <SidebarHint
                    :title="activityById.settings.label"
                    :description="activityById.settings.description"
                    :icon="activityById.settings.icon"
                  >
                    <button
                      class="nav-link sidebar-activity-link"
                      :class="{ 'nav-link--active': settingsStore.isOpen }"
                      @click="settingsStore.toggle"
                    >
                      <LucideIcon :name="activityById.settings.icon" :size="16" />
                    </button>
                  </SidebarHint>
                </BaseWoobyMenu>
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
    <template v-if="!appUiStore.isUniverseMode" #overlay>
      <AppGlobalSettings />
      <ProfileSettingsPanel v-model="isProfileSettingsOpen" />
      <AppProductionMonitor />
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
import SidebarHint from '@/shared/components/layout/SidebarHint.vue'
import AppToaster from '@/shared/components/feedback/AppToaster.vue'
import AppConfirmPanel from '@/shared/components/layout/AppConfirmPanel.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import SidebarGlobalPanel from '@/shared/components/layout/SidebarGlobalPanel.vue'
import AppGlobalSettings from '@/shared/components/layout/AppGlobalSettings.vue'
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'
import CommandPaletteHost from '@/features/command-palette/components/CommandPaletteHost.vue'
import { useCommandPaletteStore } from '@/features/command-palette/stores/commandPalette.store'
import { useSettingsStore } from '@/shared/stores/settings.store'
import { useAppUiStore } from '@/shared/stores/app-ui.store'
import ExternalPluginInstaller from '@/features/plugins/components/ExternalPluginInstaller.vue'
import ProfileSelectionPage from '@/features/profiles/components/ProfileSelectionPage.vue'
import ProfileSettingsPanel from '@/features/profiles/components/ProfileSettingsPanel.vue'
import {
  dispatchSidebarNavIntent,
  sidebarActivityItems,
  sidebarSections,
  sidebarWidthForState,
  type SidebarNavIntent,
  type SidebarNavItem,
} from '@/shared/components/layout/appSidebarNavigation'
import AppProductionMonitor, { isMonitorOpen, toggleMonitor } from '@/shared/components/layout/AppProductionMonitor.vue'

const settingsStore = useSettingsStore()
const appUiStore = useAppUiStore()
const commandPaletteStore = useCommandPaletteStore()
const route = useRoute()
const isPublicRoute = computed(() => route.meta.public === true)
const isSidebarCollapsed = ref(false)
const isPluginInstallerOpen = ref(false)
const isProfileSettingsOpen = ref(false)
const hasEnteredProfile = ref(false)
const activeSidebarWidth = computed(() =>
  sidebarWidthForState(isSidebarCollapsed.value, { expandedPx: 288 }),
)
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

function isSidebarNavItemActive(item: SidebarNavItem) {
  if (item.route) return route.path.startsWith(item.route)
  return item.intent?.type === 'plugin-installer.open' && isPluginInstallerOpen.value
}

function openPluginInstallerPanel() {
  isPluginInstallerOpen.value = true
}

function handleUiIntent(event: Event) {
  const intent = (event as CustomEvent<SidebarNavIntent>).detail
  if (intent?.type === 'plugin-installer.open') openPluginInstallerPanel()
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
