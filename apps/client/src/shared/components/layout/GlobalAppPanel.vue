<template>
  <AppPanel
    v-bind="panelAttrs"
    @close="panelStore.closePanel"
    @resize="emitPanelResize"
    @resize-end="emitPanelResizeEnd"
    @resize-reset="emitPanelResizeReset"
  >
    <component
      :is="panelStore.panelComponent"
      v-if="panelStore.panelComponent"
      v-bind="panelStore.componentProps"
    />
  </AppPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppPanel from './AppPanel.vue'
import { useAppPanelStore } from '@/shared/stores/app-panel.store'

const panelStore = useAppPanelStore()

type PanelSize = {
  width: number | null
  height: number | null
}

const emit = defineEmits<{
  resize: [payload: PanelSize & { panelId: string }]
  resizeEnd: [payload: PanelSize & { panelId: string }]
  resizeReset: [payload: { panelId: string }]
}>()

// Binding limpo para os atributos de fundação do Painel
const panelAttrs = computed(() => ({
  isOpen: panelStore.isOpen,
  title: panelStore.title,
  panelId: panelStore.panelId,
  position: panelStore.position,
  width: panelStore.width,
  resizable: panelStore.resizable,
  resizeSide: panelStore.resizeSide,
}))

function emitPanelResize(size: PanelSize) {
  emit('resize', { panelId: panelStore.panelId, ...size })
}

function emitPanelResizeEnd(size: PanelSize) {
  emit('resizeEnd', { panelId: panelStore.panelId, ...size })
}

function emitPanelResizeReset() {
  emit('resizeReset', { panelId: panelStore.panelId })
}
</script>
