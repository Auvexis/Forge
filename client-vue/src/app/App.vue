<template>
  <router-view v-if="isPublicRoute" v-slot="{ Component }">
    <component :is="Component" />
    <AppToaster />
  </router-view>

  <AppShell v-else>
    <!-- Use the AppSidebar in the sidebar slot -->
    <template #sidebar>
      <AppSidebar>
        <!-- Navigation Links -->
        <router-link to="/plugins" class="nav-link" active-class="nav-link--active" title="Plugins">
          <LucideIcon name="blocks" :size="16" />
        </router-link>

        <router-link
          to="/workflows"
          class="nav-link"
          active-class="nav-link--active"
          title="Workflows"
        >
          <LucideIcon name="workflow" :size="16" />
        </router-link>

        <!-- Production Monitor -->
        <button
          class="nav-link"
          :class="{ 'nav-link--active': isMonitorOpen }"
          title="Production Monitor"
          @click="toggleMonitor"
        >
          <LucideIcon name="activity" :size="16" />
        </button>

        <!-- Sidebar footer -->
        <template #footer>
          <BaseWoobyMenu
            tag="div"
            class="sidebar-footer-links"
            active-selector=".nav-link--active"
          >
            <a href="https://docs.nod8.dev" target="_blank" class="nav-link" title="Documentation">
              <LucideIcon name="book" :size="16" />
            </a>
            <button
              class="nav-link"
              :class="{ 'nav-link--active': settingsStore.isOpen }"
              title="Settings"
              @click="settingsStore.toggle"
            >
              <LucideIcon name="settings" :size="16" />
            </button>
          </BaseWoobyMenu>
        </template>
      </AppSidebar>
      <SidebarGlobalPanel />
    </template>

    <!-- Main Content Area -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Global Overlays -->
    <template #overlay>
      <AppToaster />
      <AppConfirmPanel />
      <AppGlobalSettings />
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/shared/components/layout/AppShell.vue'
import AppSidebar from '@/shared/components/layout/AppSidebar.vue'
import AppToaster from '@/shared/components/feedback/AppToaster.vue'
import AppConfirmPanel from '@/shared/components/layout/AppConfirmPanel.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import SidebarGlobalPanel from '@/shared/components/layout/SidebarGlobalPanel.vue'
import AppGlobalSettings from '@/shared/components/layout/AppGlobalSettings.vue'
import BaseWoobyMenu from '@/shared/components/base/BaseWoobyMenu.vue'
import { useSidebarPanelStore } from '@/shared/stores/sidebar-panel.store'
import { useSettingsStore } from '@/shared/stores/settings.store'
import ProductionMonitorPanel from '@/features/workflow-editor/components/ui/ProductionMonitorPanel.vue'

const sidebarStore = useSidebarPanelStore()
const settingsStore = useSettingsStore()
const route = useRoute()
const isMonitorOpen = computed(() => sidebarStore.isOpen && sidebarStore.title === 'Production Monitor')
const isPublicRoute = computed(() => route.meta.public === true)

function toggleMonitor() {
  sidebarStore.togglePanel({
    title: 'Production Monitor',
    component: ProductionMonitorPanel,
    width: 'md',
  })
}
</script>
