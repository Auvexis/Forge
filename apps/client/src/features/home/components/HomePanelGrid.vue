<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const panels = [
  {
    id: 'monitoring',
    title: 'Monitoring',
    description: 'Open production status, active runs, and workflow health.',
    icon: 'activity',
    action: 'Open Monitor',
  },
  {
    id: 'plugins',
    title: 'Plugin Installer',
    description: 'Install external plugins from repositories or local folders.',
    icon: 'package',
    action: 'Open Installer',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Manage profile preferences, credentials, theme, and Auvexis.',
    icon: 'settings',
    action: 'Open Settings',
  },
  {
    id: 'guides',
    title: 'Guides',
    description: 'Custom onboarding guides will live here as complete flows.',
    icon: 'book-open',
    action: 'Coming Soon',
  },
] as const

defineEmits<{
  openPanel: [panelId: string]
}>()
</script>

<template>
  <section class="home-panels" aria-labelledby="home-panels-title">
    <header class="home-panels__header">
      <h2 id="home-panels-title">Workspace Panels</h2>
      <p>Jump into the supporting surfaces around your main editors.</p>
    </header>

    <div class="home-panels__grid">
      <article v-for="panel in panels" :key="panel.id" class="home-panel">
        <span class="home-panel__icon">
          <LucideIcon :name="panel.icon" :size="18" />
        </span>
        <h3>{{ panel.title }}</h3>
        <p>{{ panel.description }}</p>
        <BaseButton
          variant="secondary"
          size="sm"
          :disabled="panel.id === 'guides'"
          @click="$emit('openPanel', panel.id)"
        >
          {{ panel.action }}
        </BaseButton>
      </article>
    </div>
  </section>
</template>

<style scoped>
.home-panels {
  display: grid;
  gap: var(--fabric-space-4);
}

.home-panels__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--fabric-space-4);
}

.home-panels h2,
.home-panels h3,
.home-panels p {
  margin: 0;
}

.home-panels h2 {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xl);
}

.home-panels__header p,
.home-panel p {
  color: var(--fabric-text-secondary);
  line-height: 1.55;
}

.home-panels__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--fabric-space-3);
}

.home-panel {
  display: flex;
  min-width: 0;
  min-height: 210px;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-4);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-md);
  background: var(--fabric-bg-surface);
}

.home-panel__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  color: var(--fabric-text-secondary);
  background: var(--fabric-bg-base);
}

.home-panel h3 {
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-md);
}

.home-panel p {
  flex: 1;
  font-size: var(--fabric-text-sm);
}

@media (max-width: 1100px) {
  .home-panels__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .home-panels__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .home-panels__grid {
    grid-template-columns: 1fr;
  }
}
</style>
