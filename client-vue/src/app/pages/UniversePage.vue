<template>
  <UniverseShell />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { UniverseShell } from '@/features/universe'
import { useKeyboard } from '@/shared/composables/useKeyboard'
import { useAppUiStore } from '@/shared/stores/app-ui.store'

const router = useRouter()
const appUiStore = useAppUiStore()

function exitUniverseMode() {
  appUiStore.quitUniverseMode()
  router.push('/workflows')
}

useKeyboard('escape', exitUniverseMode, { prevent: true, stop: true, exact: true })

onMounted(() => {
  appUiStore.enterUniverseMode()
})

onBeforeUnmount(() => {
  appUiStore.quitUniverseMode()
})
</script>
