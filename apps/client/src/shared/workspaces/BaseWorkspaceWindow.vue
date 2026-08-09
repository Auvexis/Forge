<script setup lang="ts">
import { computed } from "vue";
import { RenderWindow } from "@renderizer/vue";
import BaseWindowControls from "@/shared/components/base/BaseWindowControls.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    workspaceId: string;
    title: string;
    configId?: string;
    width?: number;
    height?: number;
  }>(),
  {
    configId: undefined,
    width: 1180,
    height: 780,
  },
);

const emit = defineEmits<{
  (event: "closed"): void;
  (event: "open-failed"): void;
}>();

const isDesktop = computed(() => window.fabricDesktop?.isDesktop === true);
</script>

<template>
  <RenderWindow
    v-if="isDesktop"
    :open="open"
    :window-id="workspaceId"
    :title="title"
    :config-id="configId"
    :width="width"
    :height="height"
    fallback="none"
    :exclude-document-classes="['fabric-desktop-full-bleed']"
    @closed="emit('closed')"
    @open-failed="emit('open-failed')"
  >
    <template #default="{ isMaximized, control }">
      <section
        class="base-workspace-window"
        :class="{ 'base-workspace-window--maximized': isMaximized }"
      >
        <header class="base-workspace-window__topbar">
          <div class="base-workspace-window__tabs" role="tablist">
            <slot name="tabs" />
          </div>
          <BaseWindowControls
            :is-maximized="isMaximized"
            @minimize="control('minimize')"
            @toggle-maximize="control('toggle-maximize')"
            @close="control('close')"
          />
        </header>
        <main class="base-workspace-window__content">
          <slot />
        </main>
      </section>
    </template>
  </RenderWindow>
</template>

<style>
.fabric-workspace-document,
.fabric-workspace-document .fabric-workspace-mount {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--fabric-bg-base);
}

html.fabric-desktop .fabric-workspace-document {
  border: 0;
  border-radius: 0;
}
</style>

<style scoped>
.base-workspace-window {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  border: 1px solid var(--fabric-desktop-window-border);
  border-radius: var(--fabric-desktop-window-radius);
  background: var(--fabric-bg-base);
  color: var(--fabric-text-primary);
}

.base-workspace-window--maximized {
  border: 0;
  border-radius: 0;
}

.base-workspace-window__topbar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  min-height: 40px;
  border-bottom: 1px solid var(--fabric-app-topbar-topbar-border);
  border-radius: var(--fabric-desktop-window-radius)
    var(--fabric-desktop-window-radius) 0 0;
  background: var(--fabric-app-topbar-topbar-bg);
  -webkit-app-region: drag;
}

.base-workspace-window--maximized .base-workspace-window__topbar {
  border-radius: 0;
}

.base-workspace-window__tabs {
  display: flex;
  min-width: 0;
  overflow: hidden;
}

.base-workspace-window__content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
