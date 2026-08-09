<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BaseWindowControls from './BaseWindowControls.vue'

withDefaults(
  defineProps<{
    title?: string
  }>(),
  {
    title: 'Fabric',
  },
)

const isDesktopWindow = computed(
  () => typeof window !== 'undefined' && window.fabricDesktop?.isDesktop === true,
)
const isWindowMaximized = ref(false)
let removeWindowStateListener: (() => void) | undefined

onMounted(() => {
  if (!isDesktopWindow.value || !window.fabricDesktop) return
  void window.fabricDesktop.getWindowState().then((state) => {
    isWindowMaximized.value = state.isMaximized
  })
  removeWindowStateListener = window.fabricDesktop.onWindowStateChange((state) => {
    isWindowMaximized.value = state.isMaximized
  })
})

onUnmounted(() => {
  removeWindowStateListener?.()
})

function minimizeWindow() {
  void window.fabricDesktop?.minimize()
}

function toggleMaximizeWindow() {
  void window.fabricDesktop?.toggleMaximize()
}

function closeWindow() {
  void window.fabricDesktop?.close()
}
</script>

<template>
  <header v-if="isDesktopWindow" class="base-desktop-topbar">
    <div class="base-desktop-topbar__left">
      <slot name="left">
        <span class="base-desktop-topbar__title">{{ title }}</span>
      </slot>
    </div>
    <div class="base-desktop-topbar__center">
      <slot />
    </div>
    <div class="base-desktop-topbar__right">
      <BaseWindowControls
        :is-maximized="isWindowMaximized"
        @minimize="minimizeWindow"
        @toggle-maximize="toggleMaximizeWindow"
        @close="closeWindow"
      />
    </div>
  </header>
</template>

<style scoped>
.base-desktop-topbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  min-height: 40px;
  border-bottom: 1px solid var(--fabric-app-topbar-topbar-border);
  background: var(--fabric-app-topbar-topbar-bg);
  color: var(--fabric-app-topbar-topbar-button-text);
  -webkit-app-region: drag;
}

.base-desktop-topbar__left,
.base-desktop-topbar__center,
.base-desktop-topbar__right {
  display: flex;
  align-items: center;
  min-width: 0;
}

.base-desktop-topbar__left {
  padding-left: var(--fabric-space-3);
}

.base-desktop-topbar__center {
  justify-content: center;
}

.base-desktop-topbar__right {
  justify-content: flex-end;
  align-self: stretch;
}

.base-desktop-topbar__title {
  overflow: hidden;
  color: var(--fabric-app-topbar-topbar-search-text);
  font-size: var(--fabric-text-sm);
  font-weight: var(--fabric-font-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-desktop-topbar :deep(button),
.base-desktop-topbar :deep(a),
.base-desktop-topbar :deep(input),
.base-desktop-topbar :deep(textarea),
.base-desktop-topbar :deep(select),
.base-desktop-topbar :deep([role='button']) {
  -webkit-app-region: no-drag;
}
</style>
