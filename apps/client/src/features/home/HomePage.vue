<script setup lang="ts">
import { useRouter } from 'vue-router'
import HomeHero from './components/HomeHero.vue'
import HomePanelGrid from './components/HomePanelGrid.vue'
import HomeProductSection from './components/HomeProductSection.vue'

const router = useRouter()

function openWorkflowEditor() {
  void router.push('/workflows')
}

function openPagesEditor() {
  void router.push('/pages')
}

function openPanel(panelId: string) {
  const intentByPanel: Record<string, { type: string }> = {
    monitoring: { type: 'monitoring.open' },
    plugins: { type: 'plugin-installer.open' },
    settings: { type: 'settings.open' },
  }
  const intent = intentByPanel[panelId]
  if (!intent) return
  window.dispatchEvent(new CustomEvent('fabric:command-palette:intent', { detail: intent }))
}
</script>

<template>
  <main class="home-page">
    <HomeHero
      @create-workflow="openWorkflowEditor"
      @open-pages="openPagesEditor"
    />

    <div class="home-page__content">
      <HomeProductSection
        title="Workflow Editor"
        description="Design automations visually, connect triggers to actions, inspect executions, and publish workflows when they are ready for production."
        icon="workflow"
        accent="#34d399"
        primary-label="Create New Workflow"
        secondary-label="Open Workflow Editor"
        preview="workflow"
        @primary="openWorkflowEditor"
        @secondary="openWorkflowEditor"
      />

      <HomeProductSection
        title="Pages"
        description="Build profile-scoped pages connected to workflows, forms, and data actions with the Pages editor."
        icon="panel-top"
        accent="#60a5fa"
        primary-label="Create Pages Project"
        secondary-label="Open Pages Editor"
        preview="pages"
        @primary="openPagesEditor"
        @secondary="openPagesEditor"
      />

      <HomePanelGrid @open-panel="openPanel" />
    </div>
  </main>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  overflow-y: auto;
  background: var(--fabric-bg-base);
}

.home-page__content {
  display: grid;
  gap: var(--fabric-space-5);
  width: min(1280px, 100%);
  margin: 0 auto;
  padding: var(--fabric-space-6);
}

@media (max-width: 720px) {
  .home-page__content {
    padding: var(--fabric-space-4);
  }
}
</style>
