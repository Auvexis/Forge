<template>
  <section
    class="app-workbench"
    :class="[
      `app-workbench--${density}`,
      {
        'app-workbench--has-toolstrip': $slots.toolstrip,
        'app-workbench--has-status': $slots.status,
      },
    ]"
  >
    <header v-if="$slots.toolstrip" class="app-workbench__toolstrip">
      <slot name="toolstrip" />
    </header>

    <div class="app-workbench__body">
      <aside v-if="$slots.left" class="app-workbench__panel app-workbench__panel--left">
        <slot name="left" />
      </aside>

      <main class="app-workbench__main">
        <slot />
      </main>

      <aside v-if="$slots.inspector" class="app-workbench__panel app-workbench__panel--inspector">
        <slot name="inspector" />
      </aside>
    </div>

    <footer v-if="$slots.status" class="app-workbench__status">
      <slot name="status" />
    </footer>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    density?: 'compact' | 'comfortable'
  }>(),
  {
    density: 'compact',
  },
)
</script>

<style scoped>
.app-workbench {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  color: var(--fabric-app-workbench-workbench-text);
  background: var(--fabric-app-workbench-workbench-bg);
}

.app-workbench--has-toolstrip {
  grid-template-rows: auto minmax(0, 1fr);
}

.app-workbench--has-status {
  grid-template-rows: minmax(0, 1fr) var(--fabric-workbench-status-height, 24px);
}

.app-workbench--has-toolstrip.app-workbench--has-status {
  grid-template-rows: auto minmax(0, 1fr) var(--fabric-workbench-status-height, 24px);
}

.app-workbench__toolstrip,
.app-workbench__status {
  min-width: 0;
  flex: 0 0 auto;
  background: var(--fabric-app-workbench-workbench-rail-bg);
}

.app-workbench__toolstrip {
  border-bottom: 1px solid var(--fabric-app-workbench-workbench-border);
}

.app-workbench__status {
  height: var(--fabric-workbench-status-height, 24px);
  min-height: var(--fabric-workbench-status-height, 24px);
  max-height: var(--fabric-workbench-status-height, 24px);
  border-top: 1px solid var(--fabric-app-workbench-workbench-border);
  overflow: hidden;
}

.app-workbench__body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.app-workbench__main {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--fabric-app-workbench-workbench-main-bg);
}

.app-workbench__panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--fabric-app-workbench-workbench-panel-bg);
}

.app-workbench__panel--left {
  border-right: 1px solid var(--fabric-app-workbench-workbench-border);
}

.app-workbench__panel--inspector {
  border-left: 1px solid var(--fabric-app-workbench-workbench-border);
}

.app-workbench--compact {
  --app-workbench-row-height: 24px;
}

.app-workbench--comfortable {
  --app-workbench-row-height: 30px;
}
</style>
