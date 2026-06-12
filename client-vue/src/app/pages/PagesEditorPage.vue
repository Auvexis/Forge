<template>
  <AppPage>
    <PageEditor v-if="route.params.pageId" />
    <PagesList v-else />
  </AppPage>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppPage from '@/shared/components/layout/AppPage.vue'
import { useAppUiStore } from '@/shared/stores/app-ui.store'
import PagesList from '@/features/web-pages/components/PagesList.vue'
import PageEditor from '@/features/web-pages/components/PageEditor.vue'
import '@/features/web-pages/pages.css'

const route = useRoute()
const appUiStore = useAppUiStore()

watch(
  () => route.params.pageId,
  (pageId) => {
    if (pageId) appUiStore.enterUniverseMode()
    else appUiStore.quitUniverseMode()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  appUiStore.quitUniverseMode()
})
</script>
