<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import BaseWindowControls from '@/shared/components/base/BaseWindowControls.vue'
import { WorkspaceWindowController } from './workspace-window.controller'

const props = withDefaults(defineProps<{
  open: boolean
  workspaceId: string
  title: string
  width?: number
  height?: number
}>(), {
  width: 1180,
  height: 780,
})

const emit = defineEmits<{
  (event: 'closed'): void
  (event: 'open-failed'): void
}>()

const controller = shallowRef<WorkspaceWindowController | null>(null)
const target = ref<HTMLElement | null>(null)
const isMaximized = ref(false)
let removeStateListener: (() => void) | undefined
let removeClosedListener: (() => void) | undefined

const isDesktop = computed(() => window.fabricDesktop?.isDesktop === true)

function openWorkspace() {
  if (!props.open || !isDesktop.value) return
  controller.value ??= new WorkspaceWindowController({
    workspaceId: props.workspaceId,
    title: props.title,
    width: props.width,
    height: props.height,
  })
  target.value = controller.value.open()
  if (!target.value) emit('open-failed')

  void window.fabricDesktop?.getWorkspaceState(props.workspaceId).then((state) => {
    isMaximized.value = state.isMaximized || state.isFullScreen
  })
}

function disposeWorkspace(closeWindow = true) {
  controller.value?.dispose({ closeWindow })
  controller.value = null
  target.value = null
  isMaximized.value = false
}

function control(action: 'minimize' | 'toggle-maximize' | 'close') {
  void window.fabricDesktop?.controlWorkspace(props.workspaceId, action)
}

watch(
  () => props.open,
  (open) => {
    if (open) openWorkspace()
    else disposeWorkspace()
  },
  { immediate: true },
)

if (window.fabricDesktop) {
  removeStateListener = window.fabricDesktop.onWorkspaceStateChange((state) => {
    if (state.workspaceId !== props.workspaceId) return
    isMaximized.value = state.isMaximized || state.isFullScreen
  })
  removeClosedListener = window.fabricDesktop.onWorkspaceClosed((state) => {
    if (state.workspaceId !== props.workspaceId) return
    disposeWorkspace(false)
    emit('closed')
  })
}

onBeforeUnmount(() => {
  removeStateListener?.()
  removeClosedListener?.()
  disposeWorkspace()
})
</script>

<template>
  <Teleport v-if="open && target" :to="target">
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
  </Teleport>
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
  border-radius: var(--fabric-desktop-window-radius) var(--fabric-desktop-window-radius) 0 0;
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
