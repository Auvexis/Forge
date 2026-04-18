<template>
  <div class="editor-stack">
    <!-- Step name -->
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
        placeholder="What does this step do?"
      />
    </EditorField>

    <!-- Plugin selector -->
    <EditorField label="Integration (Plugin)">
      <select
        class="editor-select"
        :value="data.pluginId || ''"
        @change="updateNodeData({ pluginId: ($event.target as HTMLSelectElement).value, action: '', params: {} })"
      >
        <option value="" disabled>Select Integration...</option>
        <option v-for="p in plugins" :key="p.id" :value="p.id">
          {{ p.manifest.metadata.name }}
        </option>
      </select>
    </EditorField>

    <!-- Action selector -->
    <EditorField v-if="selectedPlugin" label="Action">
      <select
        class="editor-select"
        :value="data.action || ''"
        @change="updateNodeData({ action: ($event.target as HTMLSelectElement).value, params: {} })"
      >
        <option value="" disabled>Select Action...</option>
        <option v-for="(method, key) in (selectedPlugin.manifest.methods || {})" :key="key" :value="key">
          {{ method.metadata.label || key }}
        </option>
      </select>
    </EditorField>

    <!-- Parameters container -->
    <div v-if="selectedAction" class="editor-stack mt-2">
      <div class="pe-params-header">
        <div class="pe-params-indicator"></div>
        <h3 class="pe-params-title">Parameters</h3>
      </div>

      <div
        v-for="(paramVal, paramKey) in (selectedAction.parameters?.properties || {})"
        :key="paramKey"
        class="pe-param-card"
      >
        <!-- Param header -->
        <div class="pe-param-head">
          <div class="pe-param-info">
            <span class="pe-param-label">{{ paramVal['x-label'] || paramKey }}</span>
            <span v-if="paramVal.description" class="pe-param-desc">{{ paramVal.description }}</span>
            <span v-if="isRequired(paramKey.toString())" class="pe-param-req">Required field</span>
          </div>
          <span class="pe-param-type">{{ paramVal.type || 'any' }}</span>
        </div>

        <!-- Inputs mapping -->
        <!-- Enum -> Select -->
        <template v-if="(paramVal as any).enum">
          <select
            class="editor-select"
            :value="(data.params as any)?.[paramKey] || ''"
            @change="updateNodeData({ params: { ...(data.params || {}), [paramKey]: ($event.target as HTMLSelectElement).value } })"
          >
            <option value="" disabled>Select {{ (paramVal as any)['x-label'] || paramKey }}...</option>
            <option v-for="val in (paramVal as any).enum" :key="val" :value="val">{{ val }}</option>
          </select>
        </template>

        <!-- Boolean / Toggle -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'toggle' || (paramVal as any).type === 'boolean'">
          <div class="pe-param-toggle">
            <label class="switch">
              <input
                type="checkbox"
                :checked="!!data.params?.[paramKey]"
                @change="updateNodeData({ params: { ...(data.params || {}), [paramKey]: ($event.target as HTMLInputElement).checked } })"
              />
              <span class="slider round"></span>
            </label>
            <span class="pe-param-toggle-text">{{ data.params?.[paramKey] ? 'Enabled' : 'Disabled' }}</span>
          </div>
        </template>

        <!-- Textarea -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'textarea'">
          <textarea
            class="editor-textarea"
            :value="(data.params as any)?.[paramKey] || ''"
            @input="updateNodeData({ params: { ...(data.params || {}), [paramKey]: ($event.target as HTMLTextAreaElement).value } })"
            :placeholder="(paramVal as any).description ? `e.g. ${(paramVal as any).default ?? ''}` : `Enter value for ${paramKey}`"
          />
        </template>

        <!-- Default Input -->
        <template v-else>
          <input
            class="editor-input editor-input--bold"
            :value="(data.params as any)?.[paramKey] || ''"
            @input="updateNodeData({ params: { ...(data.params || {}), [paramKey]: ($event.target as HTMLInputElement).value } })"
            :placeholder="(paramVal as any).description ? `e.g. ${(paramVal as any).default ?? ''}` : `Enter value for ${paramKey}`"
          />
        </template>

        <!-- Variable map trigger & tree -->
        <div v-if="upstreamNodes.length > 0" class="pe-var-container">
          <div class="pe-var-divider">
            <div class="pe-var-line"></div>
            <button class="pe-var-btn" @click="toggleMapVariables(paramKey.toString())">
              <LucideIcon :name="isMapVariablesOpen(paramKey.toString()) ? 'chevron-up' : 'chevron-down'" size="12" />
              <span>Map variables</span>
            </button>
            <div class="pe-var-line"></div>
          </div>
          
          <VariableTree
            v-if="isMapVariablesOpen(paramKey.toString())"
            :param-key="paramKey.toString()"
            :upstream-nodes="upstreamNodes"
            :nodes="nodes"
            @inject="injectVariable"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NodeEditorProps } from './types'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import EditorField from './EditorField.vue'
import VariableTree from './VariableTree.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PluginNode } from '@/core/types/workflow.types'

const props = defineProps<NodeEditorProps>()

const data = computed(() => props.node.data as PluginNode)

const { data: plugins, execute: executePlugins } = useApi(pluginsApi.getAll, [])
executePlugins()

const selectedPlugin = computed(() => {
  return plugins.value?.find((p) => p.id === data.value.pluginId)
})

const selectedAction = computed(() => {
  return selectedPlugin.value?.manifest.methods[data.value.action]
})

const isRequired = (key: string) => {
  return (selectedAction.value?.parameters?.required ?? []).includes(key)
}

const mapVariablesOpen = ref<Record<string, boolean>>({})

const isMapVariablesOpen = (key: string) => mapVariablesOpen.value[key] ?? false

const toggleMapVariables = (key: string) => {
  mapVariablesOpen.value[key] = !mapVariablesOpen.value[key]
}
</script>

<style scoped>


.mt-2 { margin-top: var(--nod8-space-2); }

.pe-params-header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: var(--nod8-space-2);
}

.pe-params-indicator {
  width: 4px;
  height: 16px;
  background-color: var(--nod8-text-primary);
  border-radius: 9999px;
}

.pe-params-title {
  font-size: 11px;
  font-weight: 900;
  color: var(--nod8-text-primary);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

.pe-param-card {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-3);
  padding: var(--nod8-space-4);
  border-radius: var(--nod8-radius-lg);
  background-color: rgba(124, 58, 237, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pe-param-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.pe-param-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pe-param-label {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--nod8-text-primary);
}

.pe-param-desc {
  font-size: 10px;
  color: var(--nod8-text-muted);
  line-height: 1;
  margin-top: 2px;
}

.pe-param-req {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  color: rgba(239, 68, 68, 0.8);
  line-height: 1;
  margin-top: 2px;
}

.pe-param-type {
  font-size: 11px;
  background-color: rgba(124, 58, 237, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--nod8-text-muted);
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: -0.05em;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pe-param-toggle {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  height: 40px;
}

.pe-param-toggle-text {
  font-size: var(--nod8-text-xs);
  color: var(--nod8-text-muted);
  font-style: italic;
  font-weight: 500;
}

/* Switch */
.switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--nod8-border); transition: .4s; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: var(--nod8-accent); }
input:checked + .slider:before { transform: translateX(16px); }
.slider.round { border-radius: 20px; }
.slider.round:before { border-radius: 50%; }

.pe-var-container {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-1);
}

.pe-var-divider {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--nod8-space-2);
}

.pe-var-line {
  flex: 1;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
}

.pe-var-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--nod8-radius-sm);
  font-size: 11px;
  color: var(--nod8-text-muted);
}

.pe-var-btn:hover {
  background-color: var(--nod8-bg-surface);
  color: var(--nod8-text-primary);
}
</style>
