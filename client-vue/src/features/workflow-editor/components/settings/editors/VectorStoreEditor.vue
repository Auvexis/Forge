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
      <BaseInput
        :model-value="(node.data.collectionName as string) || ''"
        @update:model-value="updateNodeData({ collectionName: $event as string })"
        placeholder="documents"
      />
    </EditorField>

    <EditorField label="Dimension">
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
        placeholder="cosine, dotproduct, euclidean"
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
      <BaseInput
        :model-value="config.mode || 'cloud'"
        @update:model-value="updateConfig({ mode: ($event as string) || 'cloud' })"
        placeholder="cloud or local"
      />
    </EditorField>

    <template v-if="pluginId === 'sailor-pinecone'">
      <EditorField label="API Key">
        <BaseInput
          :model-value="config.apiKey || ''"
          @update:model-value="updateConfig({ apiKey: $event as string })"
          placeholder="Pinecone API key"
        />
      </EditorField>

      <EditorField label="Host">
        <BaseInput
          :model-value="config.host || ''"
          @update:model-value="updateConfig({ host: $event as string })"
          placeholder="https://index-project.svc.region.pinecone.io"
        />
      </EditorField>

      <EditorField label="Local Host">
        <BaseInput
          :model-value="config.localHost || ''"
          @update:model-value="updateConfig({ localHost: $event as string })"
          placeholder="http://localhost:5080"
        />
      </EditorField>

      <EditorField label="Namespace">
        <BaseInput
          :model-value="config.namespace || ''"
          @update:model-value="updateConfig({ namespace: $event as string })"
          placeholder="default"
        />
      </EditorField>
    </template>

    <EditorField v-if="pluginId === 'sailor-qdrant'" label="Qdrant Mode">
      <BaseInput
        :model-value="config.mode || 'cloud'"
        @update:model-value="updateConfig({ mode: ($event as string) || 'cloud' })"
        placeholder="cloud, local, self-hosted"
      />
    </EditorField>

    <template v-if="pluginId === 'sailor-qdrant'">
      <EditorField label="Host">
        <BaseInput
          :model-value="config.host || ''"
          @update:model-value="updateConfig({ host: $event as string })"
          placeholder="https://cluster.region.cloud.qdrant.io"
        />
      </EditorField>

      <EditorField label="Local Host">
        <BaseInput
          :model-value="config.localHost || ''"
          @update:model-value="updateConfig({ localHost: $event as string })"
          placeholder="http://localhost:6333"
        />
      </EditorField>

      <EditorField label="API Key">
        <BaseInput
          :model-value="config.apiKey || ''"
          @update:model-value="updateConfig({ apiKey: $event as string })"
          placeholder="Qdrant API key"
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
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'

const props = defineProps<NodeEditorProps>()

const pluginId = computed(() => (props.node.data.pluginId as string) || 'sailor-qdrant')
const config = computed<Record<string, any>>(() => ((props.node.data.config as Record<string, any> | undefined) ?? {}))

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
</script>
