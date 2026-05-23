<template>
  <AppPage>
    <PageEditor v-if="route.params.pageId" />
    <PagesList v-else />
  </AppPage>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppPage from '@/shared/components/layout/AppPage.vue'
import PagesList from '@/features/web-pages/components/PagesList.vue'
import PageEditor from '@/features/web-pages/components/PageEditor.vue'
import '@/features/web-pages/pages.css'

const route = useRoute()
</script>
