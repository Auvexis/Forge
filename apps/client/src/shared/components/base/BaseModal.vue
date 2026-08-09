<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RenderPortal, RenderWindow, ownerWindowOf } from "@renderizer/vue";
import BaseWindowControls from "./BaseWindowControls.vue";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    maxWidth?: string;
    height?: string;
    dimBackdrop?: boolean;
    surface?: "modal" | "window";
    windowId?: string;
    configId?: string;
    title?: string;
    windowWidth?: number;
    windowHeight?: number;
  }>(),
  {
    dimBackdrop: true,
    surface: "modal",
    windowId: undefined,
    configId: undefined,
    title: "Fabric",
    windowWidth: undefined,
    windowHeight: undefined,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
}>();

const anchorRef = ref<HTMLElement | null>(null);
const externalOpenFailed = ref(false);
const windowId = computed(
  () => props.windowId ?? `base-modal-${props.configId ?? "window"}`,
);
const useWindowSurface = computed(
  () =>
    props.surface === "window" &&
    props.isOpen &&
    window.fabricDesktop?.isDesktop === true &&
    !externalOpenFailed.value,
);

function close() {
  emit("close");
}

function handleOpenFailed() {
  externalOpenFailed.value = true;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.isOpen) {
    close();
  }
}

onMounted(() => {
  ownerWindowOf(anchorRef.value).addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  ownerWindowOf(anchorRef.value).removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <span ref="anchorRef" class="base-modal-anchor" aria-hidden="true"></span>
  <RenderWindow
    v-if="useWindowSurface"
    :open="isOpen"
    :window-id="windowId"
    :title="title"
    :config-id="configId"
    :width="windowWidth"
    :height="windowHeight"
    frame-prefix="fabric-workspace"
    fallback="none"
    :exclude-document-classes="['fabric-desktop-full-bleed']"
    @closed="close"
    @open-failed="handleOpenFailed"
  >
    <template #default="{ isMaximized, control }">
      <section
        class="base-modal-window-surface"
        :class="{ 'base-modal-window-surface--maximized': isMaximized }"
      >
        <header class="base-modal-window-surface__topbar">
          <div class="base-modal-window-surface__title-slot">
            <slot name="window-title">
              <span class="base-modal-window-surface__title">{{ title }}</span>
            </slot>
          </div>
          <BaseWindowControls
            :is-maximized="isMaximized"
            @minimize="control('minimize')"
            @toggle-maximize="control('toggle-maximize')"
            @close="control('close')"
          />
        </header>
        <main class="base-modal-window-surface__content">
          <slot />
        </main>
      </section>
    </template>
  </RenderWindow>
  <RenderPortal v-else>
    <Transition name="base-modal-window">
      <div
        v-if="isOpen"
        class="base-modal-backdrop"
        :class="{ 'base-modal-backdrop--clear': !dimBackdrop }"
        @click.self="close"
      >
        <div
          class="base-modal-container flex flex-col overflow-hidden"
          :style="{
            maxWidth: maxWidth || '1600px',
            height: height || '85vh',
            width: '95vw',
          }"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </RenderPortal>
</template>

<style scoped>
.base-modal-anchor {
  display: none;
}

.base-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--fabric-base-modal-backdrop);
}

.base-modal-backdrop--clear {
  background: transparent;
}

.base-modal-container {
  position: relative;
  background: var(--fabric-base-modal-bg);
  color: var(--fabric-base-modal-text);
  border: 1px solid var(--fabric-base-modal-border);
  box-shadow: none;
  border-radius: var(--fabric-base-modal-radius);
  outline: 1px solid var(--fabric-base-modal-inner-border);
  outline-offset: -2px;
}

.base-modal-container::before {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  background: var(--fabric-base-modal-highlight);
  pointer-events: none;
}

.base-modal-window-surface {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--fabric-desktop-window-border);
  border-radius: var(--fabric-desktop-window-radius);
  background: var(--fabric-base-modal-bg);
  color: var(--fabric-base-modal-text);
}

.base-modal-window-surface--maximized {
  border: 0;
  border-radius: 0;
}

.base-modal-window-surface__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  border-bottom: 1px solid var(--fabric-app-topbar-topbar-border);
  background: var(--fabric-app-topbar-topbar-bg);
  -webkit-app-region: drag;
}

.base-modal-window-surface__title-slot {
  display: flex;
  height: 100%;
  min-width: 0;
  align-items: stretch;
}

.base-modal-window-surface__title {
  display: inline-flex;
  align-items: center;
  padding-left: 12px;
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
}

.base-modal-window-surface__content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* Window-style overlay transition */
.base-modal-window-enter-active,
.base-modal-window-leave-active {
  transition: opacity 120ms linear;
}

.base-modal-window-enter-from,
.base-modal-window-leave-to {
  opacity: 0;
}

.base-modal-window-enter-active .base-modal-container {
  transition:
    transform 140ms cubic-bezier(0.2, 0, 0, 1),
    opacity 120ms linear;
}

.base-modal-window-leave-active .base-modal-container {
  transition:
    transform 90ms cubic-bezier(0.4, 0, 1, 1),
    opacity 90ms linear;
}

.base-modal-window-enter-from .base-modal-container {
  opacity: 0;
  transform: translateY(6px) scale(0.992);
}

.base-modal-window-leave-to .base-modal-container {
  opacity: 0;
  transform: translateY(2px) scale(0.996);
}
</style>
