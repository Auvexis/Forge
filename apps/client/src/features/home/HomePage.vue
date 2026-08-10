<script setup lang="ts">
import { useRouter } from 'vue-router'
import HomeWelcome from './components/HomeWelcome.vue'

const router = useRouter()

function openTarget(panelId: string) {
  if (panelId === 'workflows') {
    void router.push('/workflows')
    return
  }
  if (panelId === 'pages') {
    void router.push('/pages')
    return
  }

}
</script>

<template>
  <HomeWelcome @open-target="openTarget" />
</template>
