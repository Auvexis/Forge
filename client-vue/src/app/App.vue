<template>
  <AppShell>
    <!-- Use the AppSidebar in the sidebar slot -->
    <template #sidebar>
      <AppSidebar>
        <!-- Navigation Links -->
        <router-link
          to="/workflows"
          class="nav-link"
          active-class="nav-link--active"
          title="Workflows"
        >
          <LucideIcon name="workflow" :size="16" />
        </router-link>

        <router-link to="/plugins" class="nav-link" active-class="nav-link--active" title="Plugins">
          <LucideIcon name="puzzle" :size="16" />
        </router-link>

        <!-- Sidebar footer -->
        <template #footer>
          <div class="sidebar-footer-links">
            <a href="https://docs.nod8.dev" target="_blank" class="nav-link" title="Documentation">
              <LucideIcon name="book" :size="16" />
            </a>
            <div class="nav-link" title="Settings">
              <LucideIcon name="settings" :size="16" />
            </div>
          </div>
        </template>
      </AppSidebar>
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
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import AppShell from '@/shared/components/layout/AppShell.vue'
import AppSidebar from '@/shared/components/layout/AppSidebar.vue'
import AppToaster from '@/shared/components/feedback/AppToaster.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
</script>

<style scoped>
/* Scoped nav link styling for the sidebar */
.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px; /* w-10 */
  height: 36px; /* h-9 */
  border-radius: var(--nod8-radius-md);
  color: var(--nod8-text-secondary);
  transition: all var(--nod8-duration-fast) var(--nod8-ease-standard);
  text-decoration: none;
  cursor: pointer;
}

.nav-link:hover {
  background-color: var(--nod8-bg-muted);
  color: var(--nod8-text-primary);
}

.nav-link--active {
  background-color: var(--nod8-accent-subtle);
  color: var(--nod8-accent); /* Brighter icon color */
}

/* The active indicator bar on the left */
.nav-link--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 16px;
  background-color: var(--nod8-accent);
  border-radius: 0 9999px 9999px 0; /* rounded-r-full */
}

.sidebar-footer-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Base font-family on #app root is handled by reset.css */
</style>
