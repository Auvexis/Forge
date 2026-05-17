<template>
  <main class="plugins-page">
    <InstalledPluginsList :plugins="plugins" @refresh="loadPlugins" />

    <div class="plugins-page__workspace">
      <ExternalPluginInstaller @preview="preview = $event" @installed="onInstalled" />
    </div>

    <ExternalPluginPreviewPanel :preview="preview" />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { pluginsApi } from '@/core/api/plugins.api'
import type { ExternalPluginInstallResult, ExternalPluginPreview, PluginSummary } from '@/core/types/plugin.types'
import ExternalPluginInstaller from '@/features/plugins/components/ExternalPluginInstaller.vue'
import ExternalPluginPreviewPanel from '@/features/plugins/components/ExternalPluginPreviewPanel.vue'
import InstalledPluginsList from '@/features/plugins/components/InstalledPluginsList.vue'
import { PROFILE_SWITCH_REFRESH_EVENT } from '@/features/profiles/profileSwitchRefresh'

const plugins = ref<PluginSummary[]>([])
const preview = ref<ExternalPluginPreview | null>(null)

async function loadPlugins() {
  plugins.value = await pluginsApi.getAll()
}

function onInstalled(_result: ExternalPluginInstallResult) {
  void loadPlugins()
}

onMounted(() => {
  void loadPlugins()
  window.addEventListener(PROFILE_SWITCH_REFRESH_EVENT, loadPlugins)
})

onBeforeUnmount(() => {
  window.removeEventListener(PROFILE_SWITCH_REFRESH_EVENT, loadPlugins)
})
</script>

<style scoped>
.plugins-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 360px;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.plugins-page__workspace {
  min-width: 0;
}

@media (max-width: 1100px) {
  .plugins-page {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .plugins-page :deep(.preview-panel) {
    display: none;
  }
}

@media (max-width: 760px) {
  .plugins-page {
    grid-template-columns: 1fr;
  }

  .plugins-page :deep(.installed-plugins) {
    min-width: 0;
    border-right: 0;
    border-bottom: 1px solid var(--sailor-border);
  }
}
</style>
