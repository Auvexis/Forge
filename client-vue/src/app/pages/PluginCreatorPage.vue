<template>
  <main class="plugin-creator-page">
    <PluginCreatorHeader />

    <section class="plugin-creator-page__workspace" aria-label="Plugin creator canvas">
      <aside class="plugin-creator-page__rail">
        <span class="plugin-creator-page__rail-title">Add Item</span>
        <button type="button">Method</button>
        <button type="button">Input Field</button>
        <button type="button">Request</button>
      </aside>

      <div class="plugin-creator-page__canvas-shell">
        <PluginCreatorCanvas :blueprint="store.activeBlueprint" />
        <PluginCreatorFloatingToolbar @add-item="isAddPanelOpen = true" />
        <PluginCreatorAddItemPanel :open="isAddPanelOpen" @close="isAddPanelOpen = false" />
      </div>

      <aside class="plugin-creator-page__inspector">
        <span class="plugin-creator-page__rail-title">Inspector</span>
        <p>Select a method or request block to edit plugin metadata.</p>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import PluginCreatorHeader from '@/features/plugin-creator/components/PluginCreatorHeader.vue'
import PluginCreatorCanvas from '@/features/plugin-creator/components/PluginCreatorCanvas.vue'
import PluginCreatorFloatingToolbar from '@/features/plugin-creator/components/PluginCreatorFloatingToolbar.vue'
import PluginCreatorAddItemPanel from '@/features/plugin-creator/components/PluginCreatorAddItemPanel.vue'
import { usePluginCreatorStore } from '@/features/plugin-creator'
import { ref } from 'vue'

const store = usePluginCreatorStore()
const isAddPanelOpen = ref(false)
</script>

<style scoped>
.plugin-creator-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  background: #f6f8fb;
  color: #142033;
}

.plugin-creator-page__rail button {
  min-height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #172033;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.plugin-creator-page__workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
}

.plugin-creator-page__canvas-shell {
  position: relative;
  min-width: 0;
  min-height: 0;
}

.plugin-creator-page__rail,
.plugin-creator-page__inspector {
  padding: 16px;
  border-right: 1px solid #d9e1ec;
  background: #ffffff;
}

.plugin-creator-page__inspector {
  border-right: 0;
  border-left: 1px solid #d9e1ec;
}

.plugin-creator-page__rail-title {
  display: block;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #526173;
}

.plugin-creator-page__rail button {
  width: 100%;
  margin-bottom: 8px;
  text-align: left;
  padding: 0 10px;
}

.plugin-creator-page__inspector p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #526173;
}

@media (max-width: 900px) {
  .plugin-creator-page__workspace {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(360px, 1fr) auto;
  }

  .plugin-creator-page__rail,
  .plugin-creator-page__inspector {
    border: 0;
    border-bottom: 1px solid #d9e1ec;
  }

  .plugin-creator-page__inspector {
    border-top: 1px solid #d9e1ec;
  }
}
</style>
