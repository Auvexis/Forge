<template>
  <router-view v-if="isPublicRoute" v-slot="{ Component }">
    <component :is="Component" />
    <AppToaster />
  </router-view>

  <AppShell v-else>
    <!-- Use the AppSidebar in the sidebar slot -->
    <template #sidebar>
      <Transition name="app-sidebar-universe">
        <div v-if="!appUiStore.isUniverseMode" class="app-sidebar-transition-frame">
          <AppSidebar>
            <!-- Navigation Links -->
            <SidebarHint
              title="Workflows"
              description="Create, edit, and manage your automated workflows visually."
              icon="workflow"
            >
              <router-link
                to="/workflows"
                class="nav-link"
                :class="{ 'nav-link--active': route.path.startsWith('/workflows') }"
              >
                <LucideIcon name="workflow" :size="16" />
              </router-link>
            </SidebarHint>

            <!-- Production Monitor -->
            <SidebarHint
              title="Production Monitor"
              description="View real-time workflow executions, monitor active runs, and debug past errors with detailed step-by-step metrics."
              icon="activity"
            >
              <button
                class="nav-link"
                :class="{ 'nav-link--active': isMonitorOpen }"
                @click="toggleMonitor"
              >
                <LucideIcon name="activity" :size="16" />
              </button>
            </SidebarHint>

            <!-- Sidebar footer -->
            <template #footer>
              <BaseWoobyMenu
                tag="div"
                class="sidebar-footer-links"
                active-selector=".nav-link--active"
              >
                <SidebarHint
                  title="Universe Mode"
                  description="Explore your node ecosystem in an immersive 3D galaxy view to visualize integrations and dependencies."
                  icon="orbit"
                >
                  <router-link
                    to="/universe"
                    class="nav-link"
                    active-class="nav-link--active"
                    @click="appUiStore.enterUniverseMode()"
                  >
                    <LucideIcon name="orbit" :size="16" />
                  </router-link>
                </SidebarHint>
                <SidebarHint
                  title="Documentation"
                  description="Read the official documentation to learn how to build, deploy, and scale your automated workflows."
                  icon="book"
                >
                  <a href="https://docs.nod8.dev" target="_blank" class="nav-link">
                    <LucideIcon name="book" :size="16" />
                  </a>
                </SidebarHint>
                <SidebarHint
                  title="Settings"
                  description="Manage your global preferences, authentication, environment variables, and connections."
                  icon="settings"
                >
                  <button
                    class="nav-link"
                    :class="{ 'nav-link--active': settingsStore.isOpen }"
                    @click="settingsStore.toggle"
                  >
                    <LucideIcon name="settings" :size="16" />
                  </button>
                </SidebarHint>
              </BaseWoobyMenu>
            </template>
          </AppSidebar>
        </div>
      </Transition>
      <SidebarGlobalPanel v-if="!appUiStore.isUniverseMode" />
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
      <AppProductionMonitor />
    </template>
  </AppShell>
  <template v-if="!isPublicRoute">
    <CommandPaletteHost />
    <AppToaster />
    <AppConfirmPanel />
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/shared/components/layout/AppShell.vue'
import AppSidebar from '@/shared/components/layout/AppSidebar.vue'
import SidebarHint from '@/shared/components/layout/SidebarHint.vue'
import AppToaster from '@/shared/components/feedback/AppToaster.vue'
import AppConfirmPanel from '@/shared/components/layout/AppConfirmPanel.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import SidebarGlobalPanel from '@/shared/components/layout/SidebarGlobalPanel.vue'
import AppGlobalSettings from '@/shared/components/layout/AppGlobalSettings.vue'
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'
import CommandPaletteHost from '@/features/command-palette/components/CommandPaletteHost.vue'
import { useSidebarPanelStore } from '@/shared/stores/sidebar-panel.store'
import { useSettingsStore } from '@/shared/stores/settings.store'
import { useAppUiStore } from '@/shared/stores/app-ui.store'
import AppProductionMonitor, { isMonitorOpen, toggleMonitor } from '@/shared/components/layout/AppProductionMonitor.vue'

const sidebarStore = useSidebarPanelStore()
const settingsStore = useSettingsStore()
const appUiStore = useAppUiStore()
const route = useRoute()
const isPublicRoute = computed(() => route.meta.public === true)
</script>

<style scoped>
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
  transform: translateX(calc(-1 * var(--nod8-sidebar-width)));
}
</style>
