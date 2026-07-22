<script setup lang="ts">
import LucideIcon from '@/shared/icons/LucideIcon.vue'

interface HomeWorkspaceItem {
  label: string
  detail: string
  icon: string
  target: string
  disabled?: boolean
}

const recentItems: HomeWorkspaceItem[] = [
  { label: 'Workflow Editor', detail: 'visual automation graph', icon: 'workflow', target: 'workflows' },
  { label: 'Pages', detail: 'site and form surfaces', icon: 'panel-top', target: 'pages' },
  { label: 'Monitoring', detail: 'runs, health, output', icon: 'activity', target: 'monitoring' },
  { label: 'Plugin Installer', detail: 'external and local plugins', icon: 'package', target: 'plugins' },
  { label: 'Settings', detail: 'profile and connections', icon: 'settings', target: 'settings' },
  { label: 'Guides', detail: 'custom flows', icon: 'book-open', target: 'guides', disabled: true },
]

const inspectorRows = [
  ['Profile', 'Current'],
  ['Runtime', 'Local'],
  ['Workflows', 'Ready'],
  ['Pages', 'Ready'],
  ['Plugins', 'Managed'],
  ['Guides', 'Custom'],
]

defineEmits<{
  openTarget: [target: string]
}>()
</script>

<template>
  <main class="home-workspace">
    <header class="home-workspace__toolbar">
      <div class="home-workspace__tabs" role="tablist" aria-label="Home workspace">
        <button class="home-workspace__tab is-active" type="button">Start</button>
        <button class="home-workspace__tab" type="button">Projects</button>
        <button class="home-workspace__tab" type="button">Runs</button>
      </div>
      <div class="home-workspace__toolbar-actions">
        <button type="button" class="home-workspace__icon-btn" @click="$emit('openTarget', 'workflows')">
          <LucideIcon name="workflow" :size="15" />
        </button>
        <button type="button" class="home-workspace__icon-btn" @click="$emit('openTarget', 'pages')">
          <LucideIcon name="panel-top" :size="15" />
        </button>
        <button type="button" class="home-workspace__icon-btn" @click="$emit('openTarget', 'monitoring')">
          <LucideIcon name="activity" :size="15" />
        </button>
      </div>
    </header>

    <section class="home-workspace__grid">
      <aside class="home-workspace__panel home-workspace__browser">
        <header class="home-workspace__panel-tabs">
          <button class="home-workspace__panel-tab is-active" type="button">Launcher</button>
          <button class="home-workspace__panel-tab" type="button">Recent</button>
        </header>
        <div class="home-workspace__tree">
          <button
            v-for="item in recentItems"
            :key="item.target"
            type="button"
            class="home-workspace__tree-row"
            :class="{ 'is-disabled': item.disabled }"
            :disabled="item.disabled"
            @click="$emit('openTarget', item.target)"
          >
            <LucideIcon :name="item.icon" :size="14" />
            <span>{{ item.label }}</span>
            <small>{{ item.detail }}</small>
          </button>
        </div>
      </aside>

      <section class="home-workspace__viewer">
        <header class="home-workspace__viewer-tabs">
          <span class="home-workspace__editor-tab is-active">fabric.home</span>
          <span class="home-workspace__editor-tab">workflow.graph</span>
          <span class="home-workspace__editor-tab">pages.surface</span>
        </header>

        <div class="home-workspace__program">
          <div class="home-workspace__program-head">
            <span>Fabric Start Workspace</span>
            <code>00:00:12:18</code>
          </div>
          <div class="home-workspace__canvas">
            <div class="home-workspace__graph" aria-hidden="true">
              <span class="home-workspace__graph-node is-active">Trigger</span>
              <span class="home-workspace__graph-link" />
              <span class="home-workspace__graph-node">Workflow</span>
              <span class="home-workspace__graph-link is-short" />
              <span class="home-workspace__graph-node">Page</span>
            </div>
            <div class="home-workspace__copy">
              <h1>Fabric</h1>
              <p>Open an editor, inspect production, or configure the workspace.</p>
            </div>
          </div>
          <div class="home-workspace__transport">
            <button type="button" class="home-workspace__icon-btn">
              <LucideIcon name="skip-back" :size="14" />
            </button>
            <button type="button" class="home-workspace__icon-btn is-active">
              <LucideIcon name="play" :size="14" />
            </button>
            <button type="button" class="home-workspace__icon-btn">
              <LucideIcon name="skip-forward" :size="14" />
            </button>
          </div>
        </div>
      </section>

      <aside class="home-workspace__panel home-workspace__inspector">
        <header class="home-workspace__panel-tabs">
          <button class="home-workspace__panel-tab is-active" type="button">Inspector</button>
          <button class="home-workspace__panel-tab" type="button">Output</button>
        </header>
        <div class="home-workspace__section">
          <button class="home-workspace__section-header" type="button" aria-expanded="true">
            <LucideIcon name="chevron-down" :size="13" />
            Workspace
          </button>
          <div
            v-for="[label, value] in inspectorRows"
            :key="label"
            class="home-workspace__prop-row"
          >
            <span>{{ label }}</span>
            <code>{{ value }}</code>
          </div>
        </div>
        <div class="home-workspace__section">
          <button class="home-workspace__section-header" type="button" aria-expanded="true">
            <LucideIcon name="chevron-down" :size="13" />
            Actions
          </button>
          <button type="button" class="home-workspace__action-row" @click="$emit('openTarget', 'workflows')">
            New Workflow
          </button>
          <button type="button" class="home-workspace__action-row" @click="$emit('openTarget', 'pages')">
            Open Pages
          </button>
          <button type="button" class="home-workspace__action-row" @click="$emit('openTarget', 'plugins')">
            Install Plugin
          </button>
        </div>
      </aside>
    </section>

    <section class="home-workspace__timeline" aria-label="Workspace timeline">
      <div class="home-workspace__timeline-tabs">
        <span class="is-active">Timeline</span>
        <span>Console</span>
        <span>Problems</span>
      </div>
      <div class="home-workspace__track">
        <span class="home-workspace__track-head">W1</span>
        <div class="home-workspace__track-lane">
          <span class="home-workspace__clip is-workflow">Workflow Editor</span>
          <span class="home-workspace__clip is-pages">Pages</span>
          <span class="home-workspace__playhead" />
        </div>
      </div>
      <div class="home-workspace__track">
        <span class="home-workspace__track-head">S1</span>
        <div class="home-workspace__track-lane">
          <span class="home-workspace__clip is-panel">Monitoring</span>
          <span class="home-workspace__clip is-settings">Settings</span>
        </div>
      </div>
    </section>

    <footer class="home-workspace__status">
      <span>Fabric</span>
      <span>Profile: current</span>
      <span>Workspace: ready</span>
      <span>Home</span>
    </footer>
  </main>
</template>

<style scoped>
.home-workspace {
  --home-surface-app: var(--fabric-bg-chrome, #1e1e1e);
  --home-surface-panel: var(--fabric-bg-surface);
  --home-surface-header: var(--fabric-bg-elevated);
  --home-surface-sunken: var(--fabric-bg-base);
  --home-border: var(--fabric-border);
  --home-accent: #3d8eef;
  display: grid;
  grid-template-rows: 34px minmax(360px, 1fr) 172px 22px;
  min-height: 100%;
  overflow: hidden;
  background: var(--home-surface-app);
  color: var(--fabric-text-primary);
  font-size: 12px;
}

.home-workspace button {
  font: inherit;
}

.home-workspace__toolbar,
.home-workspace__panel-tabs,
.home-workspace__viewer-tabs,
.home-workspace__timeline-tabs,
.home-workspace__transport {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--home-border);
  background: var(--home-surface-header);
}

.home-workspace__toolbar {
  justify-content: space-between;
  min-width: 0;
}

.home-workspace__tabs,
.home-workspace__toolbar-actions {
  display: flex;
  align-items: center;
}

.home-workspace__tab,
.home-workspace__panel-tab,
.home-workspace__editor-tab {
  display: inline-flex;
  align-items: center;
  height: 100%;
  min-width: 0;
  border: 0;
  border-right: 1px solid var(--home-border);
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--fabric-text-secondary);
  font-size: 12px;
}

.home-workspace__tab,
.home-workspace__editor-tab {
  padding: 0 12px;
}

.home-workspace__panel-tab {
  padding: 0 10px;
}

.home-workspace__tab.is-active,
.home-workspace__panel-tab.is-active {
  border-bottom-color: var(--home-accent);
  background: var(--home-surface-panel);
  color: var(--fabric-text-primary);
}

.home-workspace__editor-tab {
  height: 30px;
  border-top: 2px solid transparent;
}

.home-workspace__editor-tab.is-active {
  border-top-color: var(--home-accent);
  background: var(--home-surface-panel);
  color: var(--fabric-text-primary);
}

.home-workspace__icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--fabric-text-secondary);
  cursor: pointer;
}

.home-workspace__icon-btn:hover,
.home-workspace__action-row:hover,
.home-workspace__tree-row:hover {
  background: color-mix(in srgb, var(--fabric-text-primary) 5%, transparent);
  color: var(--fabric-text-primary);
}

.home-workspace__icon-btn.is-active {
  background: color-mix(in srgb, var(--home-accent) 24%, transparent);
  color: var(--home-accent);
}

.home-workspace__grid {
  display: grid;
  grid-template-columns: 270px minmax(420px, 1fr) 310px;
  min-height: 0;
  border-bottom: 1px solid var(--home-border);
}

.home-workspace__panel,
.home-workspace__viewer {
  min-width: 0;
  min-height: 0;
  background: var(--home-surface-panel);
}

.home-workspace__browser,
.home-workspace__viewer {
  border-right: 1px solid var(--home-border);
}

.home-workspace__panel-tabs,
.home-workspace__viewer-tabs {
  height: 31px;
}

.home-workspace__tree {
  padding: 6px 0;
}

.home-workspace__tree-row {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  grid-template-rows: 18px 16px;
  column-gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 3px 8px;
  border: 0;
  background: transparent;
  color: var(--fabric-text-secondary);
  text-align: left;
  cursor: pointer;
}

.home-workspace__tree-row svg {
  grid-row: 1 / span 2;
  align-self: center;
}

.home-workspace__tree-row span {
  overflow: hidden;
  color: var(--fabric-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-workspace__tree-row small {
  overflow: hidden;
  color: var(--fabric-text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-workspace__tree-row.is-disabled {
  cursor: default;
  opacity: 0.52;
}

.home-workspace__program {
  display: grid;
  grid-template-rows: 28px minmax(0, 1fr) 34px;
  height: calc(100% - 31px);
  min-height: 0;
}

.home-workspace__program-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 10px;
  border-bottom: 1px solid var(--home-border);
  color: var(--fabric-text-secondary);
}

.home-workspace code {
  font-family: var(--fabric-font-mono, Consolas, monospace);
}

.home-workspace__canvas {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(var(--home-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--home-border) 1px, transparent 1px),
    #050505;
  background-size: 42px 42px;
}

.home-workspace__graph {
  position: absolute;
  inset: auto 24px 24px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0.72;
}

.home-workspace__graph-node {
  display: grid;
  place-items: center;
  width: 98px;
  height: 30px;
  border: 1px solid color-mix(in srgb, var(--home-accent) 42%, var(--home-border));
  border-radius: 2px;
  background: var(--home-surface-panel);
  color: var(--fabric-text-secondary);
  font-size: 11px;
}

.home-workspace__graph-node.is-active {
  color: var(--fabric-text-primary);
  box-shadow: inset 2px 0 0 var(--home-accent);
}

.home-workspace__graph-link {
  width: 64px;
  height: 1px;
  background: color-mix(in srgb, var(--home-accent) 55%, var(--home-border));
}

.home-workspace__graph-link.is-short {
  width: 38px;
}

.home-workspace__copy {
  text-align: center;
}

.home-workspace__copy h1 {
  margin: 0;
  color: var(--fabric-text-primary);
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: 0;
}

.home-workspace__copy p {
  margin: 8px 0 0;
  color: var(--fabric-text-secondary);
  font-size: 12px;
}

.home-workspace__transport {
  justify-content: center;
  gap: 4px;
  border-top: 1px solid var(--home-border);
  border-bottom: 0;
}

.home-workspace__section {
  padding: 4px 0 8px;
  border-bottom: 1px solid var(--home-border);
}

.home-workspace__section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 24px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--fabric-text-primary);
  font-weight: 600;
  text-align: left;
}

.home-workspace__prop-row {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  height: 22px;
  padding: 0 10px 0 24px;
  gap: 8px;
}

.home-workspace__prop-row:hover {
  background: color-mix(in srgb, var(--fabric-text-primary) 4%, transparent);
}

.home-workspace__prop-row span {
  overflow: hidden;
  color: var(--fabric-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-workspace__prop-row code {
  justify-self: end;
  color: var(--fabric-text-primary);
  font-size: 11px;
}

.home-workspace__action-row {
  display: flex;
  align-items: center;
  width: 100%;
  height: 22px;
  padding: 0 10px 0 24px;
  border: 0;
  background: transparent;
  color: var(--fabric-text-secondary);
  text-align: left;
  cursor: pointer;
}

.home-workspace__timeline {
  display: grid;
  grid-template-rows: 28px 48px 48px;
  min-height: 0;
  background: var(--home-surface-panel);
}

.home-workspace__timeline-tabs {
  gap: 14px;
  padding: 0 10px;
  color: var(--fabric-text-secondary);
}

.home-workspace__timeline-tabs span.is-active {
  color: var(--fabric-text-primary);
}

.home-workspace__track {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  min-width: 0;
  border-bottom: 1px solid var(--home-border);
}

.home-workspace__track-head {
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-right: 1px solid var(--home-border);
  background: var(--home-surface-header);
  color: var(--fabric-text-secondary);
  font-size: 11px;
}

.home-workspace__track-lane {
  position: relative;
  min-width: 0;
  background: var(--home-surface-sunken);
}

.home-workspace__clip {
  position: absolute;
  top: 7px;
  bottom: 7px;
  display: flex;
  align-items: end;
  overflow: hidden;
  padding: 0 5px 3px;
  border: 1px solid var(--home-accent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--home-accent) 28%, var(--home-surface-panel));
  color: var(--fabric-text-primary);
  font-size: 10px;
  white-space: nowrap;
}

.home-workspace__clip::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 40px);
}

.home-workspace__clip.is-workflow {
  left: 36px;
  width: 240px;
}

.home-workspace__clip.is-pages {
  left: 310px;
  width: 190px;
}

.home-workspace__clip.is-panel {
  left: 96px;
  width: 180px;
}

.home-workspace__clip.is-settings {
  left: 520px;
  width: 140px;
}

.home-workspace__playhead {
  position: absolute;
  top: 0;
  bottom: -49px;
  left: 292px;
  width: 1px;
  background: var(--home-accent);
}

.home-workspace__playhead::before {
  content: "";
  position: absolute;
  top: -1px;
  left: -5px;
  width: 11px;
  height: 11px;
  background: var(--home-accent);
  clip-path: polygon(0 0, 100% 0, 100% 62%, 50% 100%, 0 62%);
}

.home-workspace__status {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  padding: 0 8px;
  background: var(--home-accent);
  color: #fff;
  font-size: 11px;
}

@media (max-width: 1120px) {
  .home-workspace {
    overflow: auto;
  }

  .home-workspace__grid {
    grid-template-columns: 240px minmax(520px, 1fr);
  }

  .home-workspace__inspector {
    display: none;
  }
}
</style>
