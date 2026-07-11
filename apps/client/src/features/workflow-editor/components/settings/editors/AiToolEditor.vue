<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Tool"
      />
    </EditorField>

    <EditorField label="Integration (Plugin)">
      <BaseSelect
        :model-value="(node.data.pluginId as string) || ''"
        :options="pluginOptions"
        placeholder="Select Integration..."
        @update:model-value="handlePluginChange"
      />
    </EditorField>

    <EditorField v-if="selectedPlugin" label="Action">
      <BaseSelect
        :model-value="(node.data.methodId as string) || ''"
        :options="actionOptions"
        placeholder="Select Action..."
        @update:model-value="handleMethodChange"
      />
    </EditorField>

    <EditorField label="Tool Instructions">
      <ExpressionTextarea
        :model-value="(node.data.descriptionOverride as string) || ''"
        :rows="5"
        placeholder="Tell the agent when to use this tool, what it should accomplish, and any constraints it must follow."
        @update:model-value="updateDescriptionOverride"
      />
    </EditorField>

    <div v-if="selectedAction?.parameters?.properties" class="editor-stack mt-2">
      <div class="pe-params-header">
        <div class="pe-params-indicator"></div>
        <h3 class="pe-params-title">Parameter Defaults</h3>
      </div>

      <div
        v-for="(paramVal, paramKey) in selectedAction.parameters?.properties || {}"
        :key="paramKey"
        class="pe-param-card"
      >
        <div class="pe-param-head">
          <div class="pe-param-info">
            <span class="pe-param-label">{{ (paramVal as any)['x-label'] || paramKey }}</span>
            <span v-if="(paramVal as any).description" class="pe-param-desc">
              {{ (paramVal as any).description }}
            </span>
          </div>
          <span class="pe-param-type">{{ (paramVal as any).type || 'any' }}</span>
        </div>

        <template v-if="(paramVal as any).enum">
          <BaseSelect
            :model-value="selectDefaultValue(paramKey.toString())"
            :options="((paramVal as any).enum || []).map((value: string) => ({ label: value, value }))"
            :placeholder="`Select ${(paramVal as any)['x-label'] || paramKey}...`"
            @update:model-value="(value) => updateInputDefault(paramKey.toString(), value)"
          />
        </template>

        <template v-else-if="(paramVal as any)['x-input-type'] === 'toggle' || (paramVal as any).type === 'boolean'">
          <div class="pe-param-toggle">
            <BaseSwitch
              :model-value="Boolean(inputDefaultValue(paramKey.toString()))"
              @update:model-value="(value) => updateInputDefault(paramKey.toString(), value)"
            />
            <span class="pe-param-toggle-text">
              {{ inputDefaultValue(paramKey.toString()) ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
        </template>

        <template v-else-if="(paramVal as any)['x-input-type'] === 'textarea'">
          <ExpressionTextarea
            :model-value="String(inputDefaultValue(paramKey.toString()) ?? '')"
            :placeholder="parameterPlaceholder(paramKey.toString(), paramVal)"
            @update:model-value="(value) => updateInputDefault(paramKey.toString(), value)"
          />
        </template>

        <template v-else-if="(paramVal as any)['x-input-type'] === 'code' || (paramVal as any)['x-input-type'] === 'json'">
          <BaseCodeEditor
            :model-value="codeDefaultValue(paramKey.toString())"
            :language="(paramVal as any)['x-input-type'] === 'json' ? 'json' : 'javascript'"
            height="220px"
            @update:model-value="(value) => updateInputDefault(paramKey.toString(), value)"
          />
        </template>

        <template v-else-if="(paramVal as any)['x-input-type'] === 'datetime'">
          <BaseInput
            type="datetime-local"
            :model-value="String(inputDefaultValue(paramKey.toString()) ?? '')"
            @update:model-value="(value) => updateInputDefault(paramKey.toString(), value)"
          />
        </template>

        <template v-else>
          <ExpressionInput
            :model-value="String(inputDefaultValue(paramKey.toString()) ?? '')"
            :placeholder="parameterPlaceholder(paramKey.toString(), paramVal)"
            @update:model-value="(value) => updateInputDefault(paramKey.toString(), value)"
          />
        </template>
      </div>
    </div>

    <EditorField label="Approval">
      <BaseSwitch
        :model-value="Boolean(node.data.requiresApproval)"
        label="Require approval"
        @update:model-value="updateNodeData({ requiresApproval: $event })"
      />
    </EditorField>

    <EditorField label="Timeout">
      <BaseInput
        type="number"
        :model-value="Number(node.data.timeoutMs ?? 30000)"
        @update:model-value="updateNodeData({ timeoutMs: Number($event) })"
        placeholder="30000"
      />
    </EditorField>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NodeEditorProps } from './types'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import EditorField from './EditorField.vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

const props = defineProps<NodeEditorProps>()

const { data: plugins, execute: executePlugins } = useApi(pluginsApi.getAll, [])
executePlugins()

const selectedPlugin = computed(() => {
  const pluginId = props.node.data.pluginId
  return plugins.value?.find((plugin) =>
    plugin.id === pluginId || plugin.manifest.metadata.id === pluginId,
  )
})

const selectedAction = computed(() => {
  const methodId = props.node.data.methodId
  if (typeof methodId !== 'string') return undefined
  return selectedPlugin.value?.manifest.methods[methodId]
})

const pluginOptions = computed(() => {
  if (!plugins.value) return []
  return plugins.value
    .filter(pluginHasAgentTools)
    .map((plugin) => {
      const iconStr = plugin.manifest.metadata.icon
      const isImage = iconStr && (
        iconStr.startsWith('http') ||
        iconStr.startsWith('/') ||
        iconStr.startsWith('data:')
      )

      return {
        label: plugin.manifest.metadata.name,
        value: plugin.id,
        ...(isImage ? { image: iconStr } : { icon: iconStr || 'puzzle' }),
      }
    })
})

const actionOptions = computed(() => {
  if (!selectedPlugin.value?.manifest.methods) return []
  return Object.entries(selectedPlugin.value.manifest.methods)
    .filter(([, method]) => method.agentTool?.enabled === true)
    .map(([key, method]) => ({
      label: method.metadata.label || key,
      value: key,
      icon: 'zap',
    }))
})

function pluginHasAgentTools(plugin: NonNullable<typeof plugins.value>[number]) {
  return Object.values(plugin.manifest.methods).some((method) => method.agentTool?.enabled === true)
}

function methodDefaults(methodId: string) {
  const method = selectedPlugin.value?.manifest.methods[methodId]
  const agentTool = method?.agentTool

  return {
    name: method?.metadata.label || methodId,
    methodId,
    sideEffect: agentTool?.sideEffect || 'read',
    requiresApproval: Boolean(agentTool?.requiresApproval),
    timeoutMs: agentTool?.timeoutMs ?? 30000,
    inputDefaults: {},
  }
}

function handlePluginChange(value: string | number | null) {
  props.updateNodeData({
    name: 'AI Tool',
    pluginId: String(value || ''),
    methodId: '',
    inputDefaults: {},
  })
}

function handleMethodChange(value: string | number | null) {
  const methodId = String(value || '')
  props.updateNodeData(methodId ? methodDefaults(methodId) : { methodId: '', inputDefaults: {} })
}

function updateDescriptionOverride(value: string) {
  const next = value.trim()
  props.updateNodeData({ descriptionOverride: next || undefined })
}

function inputDefaultValue(key: string) {
  return (props.node.data.inputDefaults as Record<string, unknown> | undefined)?.[key]
}

function selectDefaultValue(key: string): string | number | null {
  const value = inputDefaultValue(key)
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

function updateInputDefault(key: string, value: unknown) {
  props.updateNodeData({
    inputDefaults: {
      ...((props.node.data.inputDefaults as Record<string, unknown> | undefined) ?? {}),
      [key]: value,
    },
  })
}

function codeDefaultValue(key: string) {
  const value = inputDefaultValue(key)
  return typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)
}

function parameterPlaceholder(key: string, schema: unknown) {
  const value = schema as Record<string, unknown>
  return value.description ? `e.g. ${value.default ?? ''}` : `Enter value for ${key}`
}
</script>

<style scoped>
.mt-2 {
  margin-top: var(--fabric-space-2);
}

.pe-params-header {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  border-bottom: 1px solid var(--fabric-border);
  padding-bottom: var(--fabric-space-2);
}

.pe-params-indicator {
  width: 4px;
  height: 16px;
  background-color: var(--fabric-text-primary);
  border-radius: 9999px;
}

.pe-params-title {
  margin: 0;
  color: var(--fabric-text-primary);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  opacity: 0.7;
  text-transform: uppercase;
}

.pe-param-card {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-4);
  border: 1px solid var(--fabric-border);
  border-radius: var(--fabric-radius-lg);
}

.pe-param-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--fabric-space-3);
}

.pe-param-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pe-param-label {
  color: var(--fabric-text-primary);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.pe-param-desc {
  margin-top: 2px;
  color: var(--fabric-text-muted);
  font-size: 10px;
  line-height: 1.35;
}

.pe-param-type {
  flex: 0 0 auto;
  padding: 2px 6px;
  border: 1px solid var(--fabric-border);
  border-radius: 4px;
  color: var(--fabric-text-muted);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: -0.05em;
  text-transform: uppercase;
}

.pe-param-toggle {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  height: 40px;
}

.pe-param-toggle-text {
  color: var(--fabric-text-muted);
  font-size: var(--fabric-text-xs);
  font-style: italic;
  font-weight: 500;
}
</style>
