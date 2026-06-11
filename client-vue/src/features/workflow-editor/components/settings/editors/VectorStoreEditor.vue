<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Vector Store"
      />
    </EditorField>

    <EditorField label="Provider Plugin">
      <BaseInput
        :model-value="pluginId"
        @update:model-value="updateProvider($event as string)"
        placeholder="sailor-pinecone or sailor-qdrant"
      />
    </EditorField>

    <EditorField label="Collection">
      <div class="editor-hint">Collection or index name. Keep it stable to avoid duplicate vector data.</div>
      <BaseInput
        :model-value="(node.data.collectionName as string) || ''"
        @update:model-value="updateNodeData({ collectionName: $event as string })"
        placeholder="documents"
      />
    </EditorField>

    <EditorField label="Dimension">
      <div class="editor-hint">Must match the embedding dimension used when documents are indexed.</div>
      <BaseInput
        type="number"
        :model-value="String(node.data.dimension ?? '')"
        @update:model-value="updateNodeData({ dimension: Number($event) || 1536 })"
        placeholder="1536"
      />
    </EditorField>

    <EditorField label="Metric">
      <BaseInput
        :model-value="(node.data.metric as string) || 'cosine'"
        @update:model-value="updateNodeData({ metric: ($event as string) || 'cosine' })"
        placeholder="cosine, dot, euclidean"
      />
    </EditorField>

    <EditorField label="Retrieval Mode">
      <BaseSelect
        :model-value="(node.data.retrievalMode as string) || 'index-and-query'"
        :options="RETRIEVAL_MODES"
        @update:model-value="updateNodeData({ retrievalMode: $event as string })"
      />
    </EditorField>

    <EditorField label="Query">
      <ExpressionTextarea
        :model-value="(node.data.query as string) || ''"
        @update:model-value="updateNodeData({ query: $event })"
        placeholder="trigger.body.question"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Top K">
      <BaseInput
        type="number"
        :model-value="String(node.data.topK ?? 5)"
        @update:model-value="updateNodeData({ topK: Number($event) || 5 })"
        placeholder="5"
      />
    </EditorField>

    <EditorField label="Output Mode">
      <BaseSelect
        :model-value="(node.data.outputMode as string) || 'context'"
        :options="OUTPUT_MODES"
        @update:model-value="updateNodeData({ outputMode: $event as string })"
      />
    </EditorField>

    <EditorField label="Max Context Chars">
      <BaseInput
        type="number"
        :model-value="String(node.data.maxContextChars ?? 8000)"
        @update:model-value="updateNodeData({ maxContextChars: Number($event) || 8000 })"
        placeholder="8000"
      />
    </EditorField>

    <EditorField label="Filter">
      <BaseInput
        :model-value="filterJson"
        @update:model-value="updateFilter($event as string)"
        placeholder='{"tenantId":"demo"}'
      />
    </EditorField>

    <EditorField label="Methods">
      <BaseInput
        :model-value="(node.data.upsertMethodId as string) || ''"
        @update:model-value="updateNodeData({ upsertMethodId: $event as string })"
        placeholder="upsert-documents"
      />
    </EditorField>

    <EditorField v-if="pluginId === 'sailor-pinecone'" label="Pinecone Mode">
      <BaseSelect
        :model-value="config.mode || 'cloud'"
        :options="PINECONE_MODES"
        @update:model-value="updateConfig({ mode: $event as string })"
      />
    </EditorField>

    <template v-if="pluginId === 'sailor-pinecone'">
      <EditorField v-if="isRemoteMode" label="Credential">
        <div class="vector-store-credential-row">
          <BaseSelect
            :model-value="config.apiKeyCredentialId || ''"
            :options="credentialOptions"
            placeholder="Select saved Pinecone credential"
            @update:model-value="updateConfig({ apiKeyCredentialId: $event as string })"
          />
          <BaseButton size="sm" variant="outline" icon-left="lock-keyhole" @click="settingsStore.openCredentialsFor(pluginId)">
            Manage Credentials
          </BaseButton>
        </div>
      </EditorField>

      <EditorField v-if="isRemoteMode" label="Host">
        <div class="editor-hint">Use the full URL for the Pinecone index host.</div>
        <BaseInput
          :model-value="config.host || ''"
          @update:model-value="updateConfig({ host: $event as string })"
          placeholder="https://index-project.svc.region.pinecone.io"
        />
      </EditorField>

      <EditorField v-if="!isRemoteMode" label="Local Host">
        <div class="editor-hint">Use the full URL for the local Pinecone-compatible endpoint.</div>
        <BaseInput
          :model-value="config.localHost || ''"
          @update:model-value="updateConfig({ localHost: $event as string })"
          placeholder="http://localhost:5080"
        />
      </EditorField>

      <EditorField label="Namespace">
        <div class="editor-hint">Namespace keeps tenants or environments separated inside the same index.</div>
        <BaseInput
          :model-value="config.namespace || ''"
          @update:model-value="updateConfig({ namespace: $event as string })"
          placeholder="default"
        />
      </EditorField>
    </template>

    <EditorField v-if="pluginId === 'sailor-qdrant'" label="Qdrant Mode">
      <BaseSelect
        :model-value="config.mode || 'cloud'"
        :options="QDRANT_MODES"
        @update:model-value="updateConfig({ mode: $event as string })"
      />
    </EditorField>

    <template v-if="pluginId === 'sailor-qdrant'">
      <EditorField v-if="isRemoteMode" label="Credential">
        <div class="vector-store-credential-row">
          <BaseSelect
            :model-value="config.apiKeyCredentialId || ''"
            :options="credentialOptions"
            placeholder="Select saved Qdrant credential"
            @update:model-value="updateConfig({ apiKeyCredentialId: $event as string })"
          />
          <BaseButton size="sm" variant="outline" icon-left="lock-keyhole" @click="settingsStore.openCredentialsFor(pluginId)">
            Manage Credentials
          </BaseButton>
        </div>
      </EditorField>

      <EditorField v-if="isRemoteMode" label="Host">
        <div class="editor-hint">Use the full URL for Qdrant cloud or self-hosted endpoints.</div>
        <BaseInput
          :model-value="config.url || ''"
          @update:model-value="updateConfig({ url: $event as string })"
          placeholder="https://cluster.region.cloud.qdrant.io"
        />
      </EditorField>

      <EditorField v-if="!isRemoteMode" label="Local Host">
        <div class="editor-hint">Use the full URL for local Qdrant, including protocol and port.</div>
        <BaseInput
          :model-value="config.url || ''"
          @update:model-value="updateConfig({ url: $event as string })"
          placeholder="http://localhost:6333"
        />
      </EditorField>

      <EditorField label="Prefer gRPC">
        <BaseSwitch
          :model-value="Boolean(config.preferGrpc)"
          label="Use gRPC when the self-hosted endpoint supports it"
          @update:model-value="updateConfig({ preferGrpc: $event as boolean })"
        />
      </EditorField>

      <EditorField label="TLS">
        <BaseSwitch
          :model-value="Boolean(config.tls)"
          label="Use TLS for cloud or self-hosted Qdrant"
          @update:model-value="updateConfig({ tls: $event as boolean })"
        />
      </EditorField>

      <EditorField label="Timeout">
        <BaseInput
          type="number"
          :model-value="String(config.timeoutMs ?? '')"
          @update:model-value="updateConfig({ timeoutMs: $event ? Number($event) : undefined })"
          placeholder="30000"
        />
      </EditorField>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'
import { useSettingsStore } from '@/shared/stores/settings.store'

const props = defineProps<NodeEditorProps>()
const settingsStore = useSettingsStore()

const pluginId = computed(() => (props.node.data.pluginId as string) || 'sailor-qdrant')
const config = computed<Record<string, any>>(() => ((props.node.data.config as Record<string, any> | undefined) ?? {}))
const filterJson = computed(() => JSON.stringify((props.node.data.filter as Record<string, any> | undefined) ?? {}))
const isRemoteMode = computed(() => ['cloud', 'self-hosted'].includes((config.value.mode as string) || 'cloud'))
const credentialOptions = computed(() => {
  const credential = settingsStore.credentials[pluginId.value]
  return [
    { value: '', label: 'No credential selected' },
    ...(credential
      ? [{ value: credential.plugin_id, label: `${pluginId.value} saved credential` }]
      : []),
  ]
})

const PINECONE_MODES = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'local', label: 'Local' },
]

const QDRANT_MODES = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'local', label: 'Local' },
  { value: 'self-hosted', label: 'Self-hosted' },
]

const RETRIEVAL_MODES = [
  { value: 'index', label: 'Index only' },
  { value: 'query', label: 'Query only' },
  { value: 'index-and-query', label: 'Index and query' },
]

const OUTPUT_MODES = [
  { value: 'context', label: 'Context' },
  { value: 'items', label: 'Items' },
]

onMounted(() => {
  void settingsStore.fetchCredential(pluginId.value)
})

watch(pluginId, (nextPluginId) => {
  void settingsStore.fetchCredential(nextPluginId)
})

function updateProvider(nextPluginId: string) {
  props.updateNodeData({
    pluginId: nextPluginId,
    config: {
      ...config.value,
      mode: config.value.mode ?? 'cloud',
    },
  })
}

function updateConfig(patch: Record<string, any>) {
  props.updateNodeData({ config: { ...config.value, ...patch } })
}

function updateFilter(value: string) {
  try {
    const parsed = JSON.parse(value || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      props.updateNodeData({ filter: parsed })
    }
  } catch {
    // Keep the last valid filter while the user is editing JSON.
  }
}
</script>

<style scoped>
.vector-store-credential-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sailor-space-2);
  align-items: center;
}
</style>
