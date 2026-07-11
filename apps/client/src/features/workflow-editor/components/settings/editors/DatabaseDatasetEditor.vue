<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="Database Dataset"
      />
    </EditorField>

    <EditorField label="Database Plugin">
      <BaseSelect
        :model-value="(node.data.pluginId as string) || ''"
        :options="databasePluginOptions"
        placeholder="Select database plugin"
        @update:model-value="handlePluginChange"
      />
    </EditorField>

    <EditorField v-if="selectedPlugin" label="Connection Mode">
      <BaseSelect
        :model-value="(node.data.connectionMode as string) || 'cloud'"
        :options="CONNECTION_MODE_OPTIONS"
        @update:model-value="updateNodeData({ connectionMode: $event as string })"
      />
    </EditorField>

    <EditorField v-if="selectedPlugin" label="Credential">
      <div class="database-dataset-credential-row">
        <BaseSelect
          :model-value="(node.data.credentialPluginId as string) || ''"
          :options="credentialOptions"
          placeholder="Select saved credential"
          @update:model-value="updateNodeData({ credentialPluginId: $event as string })"
        />
        <BaseButton size="sm" variant="outline" icon-left="lock-keyhole" @click="settingsStore.openCredentialsFor(selectedPlugin.id)">
          Manage Credentials
        </BaseButton>
      </div>
    </EditorField>

    <EditorField v-if="selectedPlugin" label="Method">
      <BaseSelect
        :model-value="(node.data.methodId as string) || ''"
        :options="methodOptions"
        placeholder="Select method"
        @update:model-value="handleMethodChange"
      />
    </EditorField>

    <EditorField label="Query">
      <ExpressionTextarea
        :model-value="(node.data.query as string) || ''"
        @update:model-value="updateNodeData({ query: $event })"
        placeholder="select id, title, body from documents"
        spellcheck="false"
      />
    </EditorField>

    <EditorField label="Text Columns">
      <BaseInput
        :model-value="textColumns"
        @update:model-value="updateNodeData({ textColumns: splitColumns($event as string) })"
        placeholder="title, body"
      />
    </EditorField>

    <EditorField label="Metadata Columns">
      <BaseInput
        :model-value="metadataColumns"
        @update:model-value="updateNodeData({ metadataColumns: splitColumns($event as string) })"
        placeholder="id, source, created_at"
      />
    </EditorField>

    <EditorField label="Limit">
      <BaseInput
        type="number"
        :model-value="String(node.data.limit ?? '')"
        @update:model-value="updateNodeData({ limit: $event ? Number($event) : undefined })"
        placeholder="1000"
      />
    </EditorField>

    <EditorField label="Chunking">
      <BaseSwitch
        :model-value="chunking.enabled"
        label="Split dataset items into chunks"
        @update:model-value="updateChunking({ enabled: $event as boolean })"
      />
    </EditorField>

    <EditorField label="Chunk Size">
      <BaseInput
        type="number"
        :model-value="String(chunking.chunkSize)"
        @update:model-value="updateChunking({ chunkSize: Number($event) || 1000 })"
        placeholder="1000"
      />
    </EditorField>

    <EditorField label="Chunk Overlap">
      <BaseInput
        type="number"
        :model-value="String(chunking.chunkOverlap)"
        @update:model-value="updateChunking({ chunkOverlap: Number($event) || 0 })"
        placeholder="120"
      />
    </EditorField>

    <EditorField label="Context Overlap">
      <BaseSwitch
        :model-value="chunking.contextualOverlapEnabled"
        label="Carry previous chunk context into the current chunk"
        @update:model-value="updateChunking({ contextualOverlapEnabled: $event as boolean })"
      />
    </EditorField>

    <EditorField label="Previous Context Chars">
      <BaseInput
        type="number"
        :model-value="String(chunking.maxPreviousContextChars ?? '')"
        @update:model-value="updateChunking({ maxPreviousContextChars: $event ? Number($event) : undefined })"
        placeholder="300"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { DatasetChunkingConfig } from '@/core/types/workflow.types'
import type { NodeEditorProps } from './types'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import EditorField from './EditorField.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'
import { useSettingsStore } from '@/shared/stores/settings.store'

const props = defineProps<NodeEditorProps>()
const settingsStore = useSettingsStore()

const { data: plugins, execute: executePlugins } = useApi(pluginsApi.getAll, [])
executePlugins()

const selectedPlugin = computed(() => {
  const pluginId = props.node.data.pluginId
  return plugins.value?.find((plugin) =>
    plugin.id === pluginId || plugin.manifest.metadata.id === pluginId,
  )
})

const databasePluginOptions = computed(() => {
  return (plugins.value ?? [])
    .filter(isDatabasePlugin)
    .map((plugin) => pluginOption(plugin))
})

const methodOptions = computed(() => {
  if (!selectedPlugin.value?.manifest.methods) return []
  return Object.entries(selectedPlugin.value.manifest.methods)
    .filter(([methodId, method]) => isDatabaseDatasetMethod(methodId, method.metadata.label, method.metadata.description))
    .map(([methodId, method]) => ({
      value: methodId,
      label: method.metadata.label || methodId,
      icon: 'database',
    }))
})

const credentialOptions = computed(() => {
  const pluginId = selectedPlugin.value?.id
  const credential = pluginId ? settingsStore.credentials[pluginId] : undefined
  return [
    { value: '', label: 'Use plugin saved credential' },
    ...(credential ? [{ value: credential.plugin_id, label: `${selectedPlugin.value?.manifest.metadata.name ?? pluginId} saved credential` }] : []),
  ]
})

const CONNECTION_MODE_OPTIONS = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'local', label: 'Local' },
  { value: 'self-hosted', label: 'Self-hosted' },
]

const defaultChunking: DatasetChunkingConfig = {
  enabled: false,
  chunkSize: 1000,
  chunkOverlap: 120,
  contextualOverlapEnabled: false,
  maxPreviousContextChars: 300,
}

const chunking = computed<DatasetChunkingConfig>(() => ({
  ...defaultChunking,
  ...((props.node.data.chunking as Partial<DatasetChunkingConfig> | undefined) ?? {}),
}))

const textColumns = computed(() => ((props.node.data.textColumns as string[] | undefined) ?? []).join(', '))
const metadataColumns = computed(() => ((props.node.data.metadataColumns as string[] | undefined) ?? []).join(', '))

onMounted(() => {
  if (selectedPlugin.value?.id) void settingsStore.fetchCredential(selectedPlugin.value.id)
})

watch(() => selectedPlugin.value?.id, (pluginId) => {
  if (pluginId) void settingsStore.fetchCredential(pluginId)
})

function pluginOption(plugin: NonNullable<typeof plugins.value>[number]) {
  const iconStr = plugin.manifest.metadata.icon
  const isImage = iconStr && (
    iconStr.startsWith('http') ||
    iconStr.startsWith('/') ||
    iconStr.startsWith('data:')
  )

  return {
    label: plugin.manifest.metadata.name,
    value: plugin.id,
    ...(isImage ? { image: iconStr } : { icon: iconStr || 'database' }),
  }
}

function isDatabasePlugin(plugin: NonNullable<typeof plugins.value>[number]) {
  const haystack = [
    plugin.id,
    plugin.manifest.metadata.id,
    plugin.manifest.metadata.name,
    plugin.manifest.metadata.description,
    ...plugin.manifest.metadata.categories,
  ].join(' ')

  return /(database|postgres|postgresql|supabase|sql)/i.test(haystack)
}

function isDatabaseDatasetMethod(methodId: string, label: string, description: string) {
  return /(query|select|list|rows|execute)/i.test(`${methodId} ${label} ${description}`)
}

function handlePluginChange(value: string | number | null) {
  const pluginId = String(value || '')
  props.updateNodeData({
    pluginId,
    methodId: '',
    credentialPluginId: '',
    connectionMode: props.node.data.connectionMode || 'cloud',
  })
}

function handleMethodChange(value: string | number | null) {
  props.updateNodeData({ methodId: String(value || '') })
}

function splitColumns(value: string): string[] {
  return value.split(',').map((column) => column.trim()).filter(Boolean)
}

function updateChunking(patch: Partial<DatasetChunkingConfig>) {
  props.updateNodeData({ chunking: { ...chunking.value, ...patch } })
}
</script>

<style scoped>
.database-dataset-credential-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--fabric-space-2);
  align-items: center;
}
</style>
