<template>
  <section class="universe-shell" aria-label="ND8 Universe">
    <UniverseScene @ready="sceneReady = true" />
    <div class="universe-shell__stars" aria-hidden="true"></div>
    <div class="universe-shell__brand" :class="{ 'universe-shell__brand--ready': sceneReady }">
      <img src="/favicon.svg" alt="" class="universe-shell__logo" />
      <span class="universe-shell__wordmark">nd.8</span>
    </div>

    <div class="universe-shell__intro">
      <p class="universe-shell__eyebrow">Universe Mode</p>
      <h1 class="universe-shell__title">{{ heroTitle }}</h1>
      <p class="universe-shell__subtitle">
        {{ heroSubtitle }}
      </p>
    </div>

    <div class="universe-shell__status" role="status" aria-live="polite">
      <span class="universe-shell__pulse" :class="{ 'universe-shell__pulse--ready': sceneReady }"></span>
      {{ statusLabel }}
    </div>

    <aside v-if="plugins.totalPlugins > 0" class="universe-shell__catalog" aria-label="Universe plugins">
      <button
        v-for="node in previewNodes"
        :key="node.id"
        class="universe-shell__plugin"
        :style="{ '--node-color': node.color }"
        type="button"
      >
        <span class="universe-shell__plugin-icon">
          <img v-if="node.icon.kind === 'image'" :src="node.icon.value" alt="" />
          <LucideIcon v-else :name="node.icon.value" :size="16" />
        </span>
        <span class="universe-shell__plugin-copy">
          <span class="universe-shell__plugin-name">{{ node.label }}</span>
          <span class="universe-shell__plugin-category">{{ node.category }}</span>
        </span>
      </button>
    </aside>

    <div v-if="error" class="universe-shell__error" role="alert">
      {{ error }}
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useUniversePlugins } from '../composables/useUniversePlugins'
import UniverseScene from './UniverseScene.vue'

const { plugins, isLoading, error, hasPlugins } = useUniversePlugins()
const sceneReady = ref(false)

const previewNodes = computed(() => plugins.value.nodes.slice(0, 6))

const heroTitle = computed(() => {
  if (isLoading.value) return 'Plugin galaxy initializing'
  if (!hasPlugins.value) return 'Universe is waiting for plugins'
  return `${plugins.value.totalPlugins} plugins in orbit`
})

const heroSubtitle = computed(() => {
  if (isLoading.value) return 'A cinematic map for exploring ND8 integrations is coming online.'
  if (!hasPlugins.value) return 'When plugins are available, they will appear here as a calm galaxy of integrations.'
  return `${plugins.value.categories.length} categories mapped for a future marketplace-ready explorer.`
})

const statusLabel = computed(() => {
  if (isLoading.value) return 'Loading plugins'
  if (error.value) return 'Plugin map unavailable'
  if (!hasPlugins.value) return 'No plugins found'
  return `${plugins.value.connectedPlugins} connected`
})
</script>
