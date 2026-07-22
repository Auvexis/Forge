<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineEmits<{
  openTarget: [target: string]
}>()

const showMediaSlots = false
</script>

<template>
  <main class="home-welcome">
    <section class="home-welcome__intro" aria-labelledby="home-title">
      <div v-if="showMediaSlots" class="home-welcome__media-slot" aria-hidden="true" />

      <div class="home-welcome__intro-main">
        <div class="home-welcome__intro-copy">
          <p class="home-welcome__eyebrow">Fabric</p>
          <h1 id="home-title">Your automation workspace.</h1>
          <p>
            Build workflows, create pages, install plugins, monitor production, and configure your
            profile from one place.
          </p>
        </div>

        <div class="home-welcome__quick-actions" aria-label="Quick actions">
          <BaseButton variant="link" icon-left="activity" @click="$emit('openTarget', 'monitoring')">
            Monitoring
          </BaseButton>
          <BaseButton variant="link" icon-left="package" @click="$emit('openTarget', 'plugins')">
            Plugin Installer
          </BaseButton>
          <BaseButton variant="link" icon-left="settings" @click="$emit('openTarget', 'settings')">
            Settings
          </BaseButton>
        </div>
      </div>
    </section>

    <section class="home-welcome__editors" aria-label="Editors">
      <article class="home-welcome__editor">
        <div v-if="showMediaSlots" class="home-welcome__editor-media-slot" aria-hidden="true" />

        <div class="home-welcome__editor-copy">
          <div class="home-welcome__editor-title">
            <LucideIcon name="workflow" :size="18" />
            <h2>Workflow Editor</h2>
          </div>
          <p>Create and edit visual automations, connect plugins, test executions, and publish workflows.</p>
          <div class="home-welcome__editor-actions">
            <BaseButton variant="link" size="sm" icon-left="plus" @click="$emit('openTarget', 'workflows')">
              Create New Workflow
            </BaseButton>
            <BaseButton variant="link" size="sm" icon-left="workflow" @click="$emit('openTarget', 'workflows')">
              Open Workflow Editor
            </BaseButton>
          </div>
        </div>
      </article>

      <article class="home-welcome__editor">
        <div v-if="showMediaSlots" class="home-welcome__editor-media-slot" aria-hidden="true" />

        <div class="home-welcome__editor-copy">
          <div class="home-welcome__editor-title">
            <LucideIcon name="panel-top" :size="18" />
            <h2>Pages Editor</h2>
          </div>
          <p>Build profile-scoped pages and forms connected to workflows, actions, and runtime data.</p>
          <div class="home-welcome__editor-actions">
            <BaseButton variant="link" size="sm" icon-left="plus" @click="$emit('openTarget', 'pages')">
              Create Pages Project
            </BaseButton>
            <BaseButton variant="link" size="sm" icon-left="panel-top" @click="$emit('openTarget', 'pages')">
              Open Pages Editor
            </BaseButton>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.home-welcome {
  display: flex;
  width: 100%;
  min-height: 100%;
  flex: 1;
  flex-direction: column;
  padding: var(--fabric-space-8);
  overflow-y: auto;
  background: var(--fabric-bg-base);
  color: var(--fabric-text-primary);
}

.home-welcome__intro {
  display: flex;
  width: 100%;
  min-height: 220px;
  justify-content: flex-start;
  align-items: center;
  gap: var(--fabric-space-8);
  padding: var(--fabric-space-4) 0 var(--fabric-space-8);
  text-align: left;
}

.home-welcome__media-slot,
.home-welcome__editor-media-slot {
  flex: 0 0 auto;
  border-radius: var(--fabric-radius-sm);
  background: transparent;
}

.home-welcome__media-slot {
  width: min(360px, 38vw);
  height: 210px;
}

.home-welcome__editor-media-slot {
  width: min(320px, 100%);
  height: 180px;
}

.home-welcome__intro-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--fabric-space-5);
}

.home-welcome__intro-copy {
  max-width: 560px;
}

.home-welcome__eyebrow,
.home-welcome h1,
.home-welcome h2,
.home-welcome p {
  margin: 0;
}

.home-welcome__eyebrow {
  margin-bottom: var(--fabric-space-2);
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  text-transform: uppercase;
}

.home-welcome h1 {
  font-size: 36px;
  letter-spacing: 0;
  line-height: 1.15;
}

.home-welcome__intro-copy p {
  margin-top: var(--fabric-space-3);
  color: var(--fabric-text-secondary);
  line-height: 1.6;
}

.home-welcome__quick-actions,
.home-welcome__editor-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--fabric-space-3);
}

.home-welcome__editors {
  display: flex;
  gap: var(--fabric-space-10);
  width: 100%;
  padding: var(--fabric-space-8) 0 0;
}

.home-welcome__editor {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--fabric-space-4);
}

.home-welcome__editor-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--fabric-space-3);
}

.home-welcome__editor-title {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
}

.home-welcome h2 {
  font-size: var(--fabric-text-xl);
}

.home-welcome__editor-copy p {
  color: var(--fabric-text-secondary);
  line-height: 1.55;
}

.home-welcome__editor-actions {
  justify-content: flex-start;
}

@media (max-width: 900px) {
  .home-welcome__intro {
    flex-direction: column;
    align-items: flex-start;
  }

  .home-welcome__media-slot {
    width: min(360px, 100%);
  }

  .home-welcome__editors {
    flex-direction: column;
  }
}

@media (max-width: 620px) {
  .home-welcome {
    padding: var(--fabric-space-4);
  }

  .home-welcome__intro {
    min-height: auto;
  }

  .home-welcome h1 {
    font-size: 30px;
  }

}
</style>
