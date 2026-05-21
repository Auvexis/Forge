<template>
  <main class="plugin-creator-page">
    <PluginCreatorHeader
      :title="store.activeBlueprint?.metadata.name ?? 'Low-code plugin workspace'"
      @run="runSelectedMethod"
      @save="store.saveDraft"
      @publish="publishActiveBlueprint"
    />

    <section class="plugin-creator-page__workspace" aria-label="Plugin creator canvas">
      <div class="plugin-creator-page__canvas-shell">
        <div v-if="store.error" class="plugin-creator-page__status plugin-creator-page__status--error">
          {{ store.error }}
        </div>
        <div v-else-if="store.isLoading" class="plugin-creator-page__status">
          Loading plugin workspace...
        </div>
        <PluginCreatorCanvas
          :blueprint="store.activeBlueprint"
          @select-node="selectedNodeId = $event"
        />
        <PluginCreatorFloatingToolbar
          @add-item="isAddPanelOpen = true"
          @run="runSelectedMethod"
          @save="store.saveDraft"
          @publish="publishActiveBlueprint"
          @undo="store.undo"
          @redo="store.redo"
          @clear-execution="clearExecution"
        />
        <PluginCreatorAddItemPanel :open="isAddPanelOpen" @close="isAddPanelOpen = false" />
      </div>

      <aside class="plugin-creator-page__side">
        <PluginCreatorInspector
          :blueprint="store.activeBlueprint"
          :selected-node-id="selectedNodeId"
          @update-metadata="store.updateMetadata"
          @update-node="store.updateNode"
          @update-method="store.updateMethod"
          @update-input="store.updateMethodInput"
          @update-credential="store.updateCredentialField"
          @update-request="store.updateMethodRequest"
        />
        <PluginCreatorTestPanel
          :blueprint="store.activeBlueprint"
          :selected-node-id="selectedNodeId"
          :last-test-result="store.lastTestResult"
          :is-running="store.isTesting"
          @test-method="store.runMethodTest"
        />
        <PluginCreatorVersionPanel
          :versions="store.versions"
          :is-loading="store.isLoading"
          @load="store.loadVersions"
          @rollback="store.rollbackToSnapshot"
        />
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import PluginCreatorHeader from '@/features/plugin-creator/components/PluginCreatorHeader.vue'
import PluginCreatorCanvas from '@/features/plugin-creator/components/PluginCreatorCanvas.vue'
import PluginCreatorFloatingToolbar from '@/features/plugin-creator/components/PluginCreatorFloatingToolbar.vue'
import PluginCreatorAddItemPanel from '@/features/plugin-creator/components/PluginCreatorAddItemPanel.vue'
import PluginCreatorInspector from '@/features/plugin-creator/components/PluginCreatorInspector.vue'
import PluginCreatorTestPanel from '@/features/plugin-creator/components/PluginCreatorTestPanel.vue'
import PluginCreatorVersionPanel from '@/features/plugin-creator/components/PluginCreatorVersionPanel.vue'
import { usePluginCreatorStore } from '@/features/plugin-creator'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = usePluginCreatorStore()
const route = useRoute()
const router = useRouter()
const isAddPanelOpen = ref(false)
const selectedNodeId = ref<string | null>(null)

onMounted(() => {
  void loadInitialBlueprint()
})

async function loadInitialBlueprint() {
  const routePluginId = Array.isArray(route.params.pluginId)
    ? route.params.pluginId[0]
    : route.params.pluginId

  if (routePluginId) {
    const blueprint = await store.loadBlueprint(routePluginId)
    selectDefaultNode()
    return blueprint
  }

  const blueprints = await store.listBlueprints()
  const [firstBlueprint] = blueprints
  if (firstBlueprint) {
    const blueprint = await store.loadBlueprint(firstBlueprint.id)
    await router.replace({ name: 'plugin-creator-detail', params: { pluginId: firstBlueprint.id } })
    selectDefaultNode()
    return blueprint
  }

  const blueprint = await store.createBlueprint({
    handle: 'my-api',
    name: 'My API',
    description: 'Low-code API plugin',
    includeDefaultMethod: true,
  })
  await router.replace({ name: 'plugin-creator-detail', params: { pluginId: blueprint.id } })
  selectDefaultNode()
  return blueprint
}

function selectDefaultNode() {
  const nodes = store.activeBlueprint?.canvas.nodes
  selectedNodeId.value = nodes ? Object.keys(nodes)[0] ?? null : null
}

async function runSelectedMethod() {
  const methodId =
    selectedNodeId.value && store.activeBlueprint?.canvas.nodes[selectedNodeId.value]?.data.methodId
  const fallbackMethodId = store.activeBlueprint?.methods[0]?.id
  const selectedMethodId = typeof methodId === 'string' ? methodId : fallbackMethodId
  if (!selectedMethodId) return

  await store.runMethodTest({
    methodId: selectedMethodId,
    params: {},
    credentials: {},
  })
}

async function publishActiveBlueprint() {
  await store.generatePreview()
  await store.publishActiveBlueprint()
}

function clearExecution() {
  store.lastTestResult = null
}
</script>

<style scoped>
.plugin-creator-page {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  background: var(--sailor-bg-base);
  color: var(--sailor-text-primary);
}

.plugin-creator-page__workspace {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
}

.plugin-creator-page__canvas-shell {
  position: relative;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--sailor-border-subtle);
}

.plugin-creator-page__status {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 25;
  max-width: min(420px, calc(100% - 28px));
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 650;
  box-shadow: 0 10px 24px rgba(20, 32, 51, 0.12);
}

.plugin-creator-page__status--error {
  border-color: #fecaca;
  background: #fff1f2;
  color: #b91c1c;
}

.plugin-creator-page__side {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(220px, auto) minmax(160px, auto);
  overflow: hidden;
  background: var(--sailor-bg-base);
  border-left: 1px solid var(--sailor-border-subtle);
}

@media (max-width: 900px) {
  .plugin-creator-page__workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(360px, 1fr) auto;
  }

  .plugin-creator-page__side {
    min-height: 420px;
  }
}
</style>
