<template>
  <UniverseShell />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { UniverseShell } from '@/features/universe'
import { useAppUiStore } from '@/shared/stores/app-ui.store'

const appUiStore = useAppUiStore()

onMounted(() => {
  appUiStore.enterUniverseMode()
})

onBeforeUnmount(() => {
  appUiStore.quitUniverseMode()
})
</script>
