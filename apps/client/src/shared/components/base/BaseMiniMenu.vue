<template>
  <span ref="anchorRef" class="bmm-anchor" aria-hidden="true"></span>
  <RenderWindow
    v-if="useWindowSurface"
    :open="isOpen"
    :window-id="resolvedWindowId"
    :title="title"
    :config-id="configId"
    :width="windowWidth"
    :height="windowHeight"
    frame-prefix="fabric-workspace"
    fallback="none"
    :exclude-document-classes="['fabric-desktop-full-bleed']"
    @closed="emit('close')"
    @open-failed="externalOpenFailed = true"
  >
    <template #default="{ isMaximized, control }">
      <section
        class="bmm-window"
        :class="{ 'bmm-window--maximized': isMaximized }"
      >
        <header class="bmm-window__topbar">
          <span class="bmm-window__title">{{ title }}</span>
          <BaseWindowControls
            :is-maximized="isMaximized"
            @minimize="control('minimize')"
            @toggle-maximize="control('toggle-maximize')"
            @close="control('close')"
          />
        </header>
        <main class="bmm-window__content">
          <slot />
        </main>
      </section>
    </template>
  </RenderWindow>
  <RenderPortal v-else>
    <transition name="bmm-fade">
      <div v-if="isOpen" class="bmm-overlay" @click.self="$emit('close')">
        <div class="bmm-dialog" :style="{ maxWidth, maxHeight }">
          <div class="bmm-header">
            <div
              style="
                display: flex;
                align-items: center;
                gap: var(--fabric-space-3);
              "
            >
              <img
                v-if="logo && isUrl(logo)"
                :src="logo"
                alt="Logo"
                class="bmm-logo"
              />
              <LucideIcon
                v-else-if="icon"
                :name="icon"
                :size="18"
                style="opacity: 0.7"
              />
              <h1 v-if="title" class="bmm-title">{{ title }}</h1>
            </div>

            <BaseButton
              variant="ghost"
              size="icon"
              icon-left="x"
              @click="$emit('close')"
            />
          </div>
          <div class="bmm-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="bmm-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </RenderPortal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import BaseButton from "./BaseButton.vue";
import BaseWindowControls from "./BaseWindowControls.vue";
import LucideIcon from "@/shared/icons/LucideIcon.vue";
import { RenderPortal, RenderWindow } from "@renderizer/vue";

const anchorRef = ref<HTMLElement | null>(null);
const externalOpenFailed = ref(false);

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  logo: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "",
  },
  maxWidth: {
    type: String,
    default: "480px",
  },
  maxHeight: {
    type: String,
    default: "90vh",
  },
  surface: {
    type: String as () => "modal" | "window",
    default: "modal",
  },
  windowId: {
    type: String,
    default: undefined,
  },
  configId: {
    type: String,
    default: undefined,
  },
  windowWidth: {
    type: Number,
    default: undefined,
  },
  windowHeight: {
    type: Number,
    default: undefined,
  },
});

const emit = defineEmits(["close"]);
const resolvedWindowId = computed(
  () => props.windowId ?? `base-mini-menu-${props.configId ?? "window"}`,
);
const useWindowSurface = computed(
  () =>
    props.surface === "window" &&
    props.isOpen &&
    window.fabricDesktop?.isDesktop === true &&
    !externalOpenFailed.value,
);

const isUrl = (str: string) => str?.startsWith("http") || str?.startsWith("/");
</script>

<style scoped>
.bmm-anchor {
  display: none;
}

.bmm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483400;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(1px);
  padding: var(--fabric-space-3);
}

.bmm-dialog {
  width: 100%;
  background: var(--fabric-base-mini-menu-bg-surface);
  border: 1px solid var(--fabric-base-mini-menu-border);
  border-radius: var(--fabric-base-mini-menu-radius);
  box-shadow: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bmm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  padding: 0 var(--fabric-space-2) 0 var(--fabric-space-3);
  border-bottom: 1px solid var(--fabric-base-mini-menu-border);
  background: var(--fabric-base-mini-menu-bg-surface);
}

.bmm-title {
  margin: 0;
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
  line-height: 1;
  color: var(--fabric-base-mini-menu-text-primary);
}

.bmm-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: var(--fabric-base-mini-menu-logo-radius);
}

.bmm-body {
  padding: var(--fabric-space-3);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
}

.bmm-footer {
  padding: var(--fabric-space-2) var(--fabric-space-3);
  border-top: 1px solid var(--fabric-base-mini-menu-border);
  background: var(--fabric-base-mini-menu-bg-surface);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--fabric-space-2);
}

.bmm-window {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: var(--fabric-base-mini-menu-bg-surface);
  color: var(--fabric-base-mini-menu-text-primary);
}

.bmm-window--maximized {
  border: 0;
  border-radius: 0;
}

.bmm-window__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  border-bottom: 1px solid var(--fabric-app-topbar-topbar-border);
  background: var(--fabric-app-topbar-topbar-bg);
  -webkit-app-region: drag;
}

.bmm-window__title {
  padding-left: 12px;
  color: var(--fabric-text-primary);
  font-size: var(--fabric-text-xs);
  font-weight: var(--fabric-font-semibold);
}

.bmm-window__content {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

/* Transitions */
.bmm-fade-enter-active,
.bmm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.bmm-fade-enter-active .bmm-dialog,
.bmm-fade-leave-active .bmm-dialog {
  transition:
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.2s ease;
}

.bmm-fade-enter-from,
.bmm-fade-leave-to {
  opacity: 0;
}

.bmm-fade-enter-from .bmm-dialog {
  transform: scale(0.95) translateY(10px);
}
.bmm-fade-leave-to .bmm-dialog {
  transform: scale(0.95) translateY(10px);
}
</style>
