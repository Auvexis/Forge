<template>
  <div class="universe-page" :class="{ 'universe-page--exiting': isExiting }">
    <UniverseShell class="universe-page__content" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UniverseShell } from '@/features/universe'
import { useKeyboard } from '@/shared/composables/useKeyboard'
import { useAppUiStore } from '@/shared/stores/app-ui.store'

const router = useRouter()
const appUiStore = useAppUiStore()
const isExiting = ref(false)
let exitTimer: number | undefined

function exitUniverseMode() {
  if (isExiting.value) return

  isExiting.value = true
  exitTimer = window.setTimeout(() => {
    appUiStore.quitUniverseMode()
    router.push('/workflows')
  }, 520)
}

useKeyboard('escape', exitUniverseMode, { prevent: true, stop: true, exact: true })

onMounted(() => {
  appUiStore.enterUniverseMode()
})

onBeforeUnmount(() => {
  if (exitTimer) window.clearTimeout(exitTimer)
  appUiStore.quitUniverseMode()
})
</script>

<style scoped>
.universe-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #01030a;
}

.universe-page__content {
  transition:
    opacity 520ms ease,
    filter 520ms ease,
    transform 520ms ease;
}

.universe-page--exiting .universe-page__content {
  opacity: 0;
  filter: blur(14px);
  transform: scale(1.015);
}
</style>
