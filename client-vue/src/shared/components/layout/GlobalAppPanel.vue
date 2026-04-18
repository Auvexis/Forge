<template>
  <AppPanel v-bind="panelAttrs" @close="panelStore.closePanel">
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

// Binding limpo para os atributos de fundação do Painel
const panelAttrs = computed(() => ({
  isOpen: panelStore.isOpen,
  title: panelStore.title,
  position: panelStore.position,
  width: panelStore.width,
}))
</script>
