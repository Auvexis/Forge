<template>
  <AppPage>
    <PageEditor />
  </AppPage>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import AppPage from '@/shared/components/layout/AppPage.vue'
import { useAppUiStore } from '@/shared/stores/app-ui.store'
import PageEditor from '@/features/web-pages/components/PageEditor.vue'
import '@/features/web-pages/pages.css'

const appUiStore = useAppUiStore()

onMounted(() => {
  appUiStore.enterUniverseMode()
})

onBeforeUnmount(() => {
  appUiStore.quitUniverseMode()
})
</script>
