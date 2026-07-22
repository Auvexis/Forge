<script setup lang="ts">
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

defineEmits<{
  openTarget: [target: string]
}>()
</script>

<template>
  <main class="home-welcome">
    <section class="home-welcome__intro" aria-labelledby="home-title">
      <div class="home-welcome__preview home-welcome__preview--fabric" aria-hidden="true">
        <div class="home-welcome__preview-toolbar">
          <span />
          <span />
          <span />
        </div>
        <div class="home-welcome__fabric-flow">
          <span class="home-welcome__flow-node is-active">Trigger</span>
          <span class="home-welcome__flow-line" />
          <span class="home-welcome__flow-node">Workflow</span>
          <span class="home-welcome__flow-line is-short" />
          <span class="home-welcome__flow-node">Page</span>
        </div>
      </div>

      <div class="home-welcome__intro-copy">
        <p class="home-welcome__eyebrow">Fabric</p>
        <h1 id="home-title">Your automation workspace.</h1>
        <p>
          Build workflows, create pages, install plugins, monitor production, and configure your
          profile from one place.
        </p>
      </div>

      <div class="home-welcome__quick-actions" aria-label="Quick actions">
        <BaseButton variant="primary" icon-left="workflow" @click="$emit('openTarget', 'workflows')">
          Workflow Editor
        </BaseButton>
        <BaseButton variant="secondary" icon-left="panel-top" @click="$emit('openTarget', 'pages')">
          Pages Editor
        </BaseButton>
        <BaseButton variant="secondary" icon-left="activity" @click="$emit('openTarget', 'monitoring')">
          Monitoring
        </BaseButton>
        <BaseButton variant="secondary" icon-left="package" @click="$emit('openTarget', 'plugins')">
          Plugin Installer
        </BaseButton>
        <BaseButton variant="secondary" icon-left="settings" @click="$emit('openTarget', 'settings')">
          Settings
        </BaseButton>
      </div>
    </section>

    <section class="home-welcome__editors" aria-label="Editors">
      <article class="home-welcome__editor">
        <div class="home-welcome__editor-preview home-welcome__editor-preview--workflow" aria-hidden="true">
          <div class="home-welcome__mini-toolbar">
            <span />
            <span />
          </div>
          <div class="home-welcome__workflow-preview">
            <span class="home-welcome__workflow-node">Manual</span>
            <span class="home-welcome__workflow-edge" />
            <span class="home-welcome__workflow-node is-center">AI Step</span>
            <span class="home-welcome__workflow-edge is-short" />
            <span class="home-welcome__workflow-node is-end">Return</span>
          </div>
        </div>

        <div class="home-welcome__editor-copy">
          <div class="home-welcome__editor-title">
            <LucideIcon name="workflow" :size="18" />
            <h2>Workflow Editor</h2>
          </div>
          <p>Create and edit visual automations, connect plugins, test executions, and publish workflows.</p>
          <div class="home-welcome__editor-actions">
            <BaseButton variant="primary" size="sm" @click="$emit('openTarget', 'workflows')">
              Create New Workflow
            </BaseButton>
            <BaseButton variant="secondary" size="sm" @click="$emit('openTarget', 'workflows')">
              Open Workflow Editor
            </BaseButton>
          </div>
        </div>
      </article>

      <article class="home-welcome__editor">
        <div class="home-welcome__editor-preview home-welcome__editor-preview--pages" aria-hidden="true">
          <div class="home-welcome__mini-toolbar">
            <span />
            <span />
          </div>
          <div class="home-welcome__pages-preview">
            <span class="home-welcome__page-hero" />
            <span class="home-welcome__page-line" />
            <span class="home-welcome__page-line is-short" />
            <span class="home-welcome__page-grid">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>

        <div class="home-welcome__editor-copy">
          <div class="home-welcome__editor-title">
            <LucideIcon name="panel-top" :size="18" />
            <h2>Pages Editor</h2>
          </div>
          <p>Build profile-scoped pages and forms connected to workflows, actions, and runtime data.</p>
          <div class="home-welcome__editor-actions">
            <BaseButton variant="primary" size="sm" @click="$emit('openTarget', 'pages')">
              Create Pages Project
            </BaseButton>
            <BaseButton variant="secondary" size="sm" @click="$emit('openTarget', 'pages')">
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
  min-height: 100%;
  overflow-y: auto;
  background: var(--fabric-bg-base);
  color: var(--fabric-text-primary);
}

.home-welcome__intro {
  display: flex;
  min-height: 460px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--fabric-space-5);
  padding: var(--fabric-space-8) var(--fabric-space-5);
  border-bottom: 1px solid var(--fabric-border);
  text-align: center;
}

.home-welcome__preview {
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-surface);
}

.home-welcome__preview--fabric {
  width: min(620px, 100%);
  height: 210px;
}

.home-welcome__preview-toolbar,
.home-welcome__mini-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border-bottom: 1px solid var(--fabric-border);
  background: var(--fabric-bg-elevated);
}

.home-welcome__preview-toolbar span,
.home-welcome__mini-toolbar span {
  width: 36px;
  height: 7px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--fabric-text-muted) 42%, transparent);
}

.home-welcome__fabric-flow,
.home-welcome__workflow-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100% - 28px);
  gap: 12px;
  background:
    linear-gradient(var(--fabric-border-muted) 1px, transparent 1px),
    linear-gradient(90deg, var(--fabric-border-muted) 1px, transparent 1px),
    var(--fabric-bg-base);
  background-size: 36px 36px;
}

.home-welcome__flow-node,
.home-welcome__workflow-node {
  display: grid;
  place-items: center;
  width: 104px;
  height: 36px;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-surface);
  color: var(--fabric-text-secondary);
  font-size: var(--fabric-text-xs);
}

.home-welcome__flow-node.is-active {
  border-color: var(--fabric-accent, #3d8eef);
  color: var(--fabric-text-primary);
}

.home-welcome__flow-line,
.home-welcome__workflow-edge {
  width: 58px;
  height: 1px;
  background: var(--fabric-border-strong, var(--fabric-border));
}

.home-welcome__flow-line.is-short,
.home-welcome__workflow-edge.is-short {
  width: 34px;
}

.home-welcome__intro-copy {
  max-width: 720px;
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
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--fabric-space-2);
}

.home-welcome__editors {
  display: flex;
  gap: var(--fabric-space-6);
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: var(--fabric-space-7) var(--fabric-space-5);
}

.home-welcome__editor {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--fabric-space-4);
}

.home-welcome__editor-preview {
  height: 260px;
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-surface);
}

.home-welcome__workflow-node.is-center {
  transform: translateY(-28px);
}

.home-welcome__workflow-node.is-end {
  transform: translateY(24px);
}

.home-welcome__pages-preview {
  display: grid;
  gap: var(--fabric-space-3);
  height: calc(100% - 28px);
  padding: var(--fabric-space-5);
  background: var(--fabric-bg-base);
}

.home-welcome__page-hero,
.home-welcome__page-line,
.home-welcome__page-grid span {
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-sm);
  background: var(--fabric-bg-surface);
}

.home-welcome__page-hero {
  height: 82px;
}

.home-welcome__page-line {
  height: 16px;
}

.home-welcome__page-line.is-short {
  width: 64%;
}

.home-welcome__page-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--fabric-space-2);
}

.home-welcome__page-grid span {
  height: 58px;
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
  .home-welcome__editors {
    flex-direction: column;
  }
}

@media (max-width: 620px) {
  .home-welcome__intro {
    min-height: auto;
    padding-inline: var(--fabric-space-4);
  }

  .home-welcome h1 {
    font-size: 30px;
  }

  .home-welcome__fabric-flow,
  .home-welcome__workflow-preview {
    gap: 7px;
  }

  .home-welcome__flow-node,
  .home-welcome__workflow-node {
    width: 78px;
  }
}
</style>
