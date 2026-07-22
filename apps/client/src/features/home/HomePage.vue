<script setup lang="ts">
import { useRouter } from 'vue-router'
import HomeWorkspaceHub from './components/HomeWorkspaceHub.vue'

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

  const intentByPanel: Record<string, { type: string }> = {
    monitoring: { type: 'monitoring.open' },
    plugins: { type: 'plugin-installer.open' },
    settings: { type: 'settings.open' },
  }
  const intent = intentByPanel[panelId]
  if (!intent) return
  window.dispatchEvent(new CustomEvent('fabric:command-palette:intent', { detail: intent }))
}
</script>

<template>
  <HomeWorkspaceHub @open-target="openTarget" />
</template>
