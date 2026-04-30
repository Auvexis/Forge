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
        @change="
          updateNodeData({
            pluginId: ($event.target as HTMLSelectElement).value,
            action: '',
            params: {},
          })
        "
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
        <option
          v-for="(method, key) in selectedPlugin.manifest.methods || {}"
          :key="key"
          :value="key"
        >
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
        v-for="(paramVal, paramKey) in selectedAction.parameters?.properties || {}"
        :key="paramKey"
        class="pe-param-card"
      >
        <!-- Param header -->
        <div class="pe-param-head">
          <div class="pe-param-info">
            <span class="pe-param-label">{{ paramVal['x-label'] || paramKey }}</span>
            <span v-if="paramVal.description" class="pe-param-desc">{{
              paramVal.description
            }}</span>
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
            @change="
              updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: ($event.target as HTMLSelectElement).value,
                },
              })
            "
          >
            <option value="" disabled>
              Select {{ (paramVal as any)['x-label'] || paramKey }}...
            </option>
            <option v-for="val in (paramVal as any).enum" :key="val" :value="val">{{ val }}</option>
          </select>
        </template>

        <!-- Boolean / Toggle -->
        <template
          v-else-if="
            (paramVal as any)['x-input-type'] === 'toggle' || (paramVal as any).type === 'boolean'
          "
        >
          <div class="pe-param-toggle">
            <BaseSwitch
              :model-value="!!data.params?.[paramKey]"
              @update:model-value="
                (val) => updateNodeData({
                  params: {
                    ...(data.params || {}),
                    [paramKey]: val,
                  },
                })
              "
            />
            <span class="pe-param-toggle-text">{{
              data.params?.[paramKey] ? 'Enabled' : 'Disabled'
            }}</span>
          </div>
        </template>

        <!-- Textarea -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'textarea'">
          <textarea
            class="editor-textarea"
            :value="(data.params as any)?.[paramKey] || ''"
            @input="
              updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: ($event.target as HTMLTextAreaElement).value,
                },
              })
            "
            :placeholder="
              (paramVal as any).description
                ? `e.g. ${(paramVal as any).default ?? ''}`
                : `Enter value for ${paramKey}`
            "
          />
        </template>

        <!-- Files Array Input -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'files'">
          <div class="pe-files-container">
            <div 
              v-for="(item, index) in (Array.isArray((data.params as any)?.[paramKey]) ? (data.params as any)?.[paramKey] : ((data.params as any)?.[paramKey] ? [(data.params as any)?.[paramKey]] : ['']))" 
              :key="index"
              class="pe-file-input-group"
            >
              <div class="pe-file-input-wrapper">
                <div v-if="typeof item === 'object'" class="pe-file-display editor-input">
                  <LucideIcon name="file" size="14" />
                  <span class="pe-file-name">{{ item.filename }}</span>
                </div>
                
                <div v-else class="pe-file-text-mode">
                  <input
                    class="editor-input editor-input--bold"
                    style="flex: 1;"
                    :value="item"
                    @input="updateFileArray(paramKey.toString(), index, ($event.target as HTMLInputElement).value)"
                    placeholder="e.g. {{ trigger.file }}"
                  />
                  <input
                    type="file"
                    style="display: none"
                    @change="handleFileUpload(paramKey.toString(), index, $event)"
                    :ref="(el) => setFileInputRef(paramKey.toString() + index, el)"
                  />
                  <button 
                    class="pe-file-btn pe-file-btn--upload"
                    @click="triggerFileInput(paramKey.toString() + index)"
                    title="Upload static file"
                  >
                    <LucideIcon name="upload" size="14" />
                  </button>
                </div>
              </div>
              <button 
                class="pe-file-btn pe-file-btn--remove" 
                @click="removeFileFromArray(paramKey.toString(), index)"
                title="Remove file"
              >
                <LucideIcon name="trash" size="14" />
              </button>
            </div>
            <button class="pe-file-btn pe-file-btn--add" @click="addFileToArray(paramKey.toString())">
              <LucideIcon name="plus" size="14" />
              <span>Add File</span>
            </button>
          </div>
        </template>

        <!-- Default Input -->
        <template v-else>
          <input
            class="editor-input editor-input--bold"
            :value="(data.params as any)?.[paramKey] || ''"
            @input="
              updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: ($event.target as HTMLInputElement).value,
                },
              })
            "
            :placeholder="
              (paramVal as any).description
                ? `e.g. ${(paramVal as any).default ?? ''}`
                : `Enter value for ${paramKey}`
            "
          />
        </template>

        <!-- Variable map trigger & tree -->
        <div v-if="upstreamNodes.length > 0" class="pe-var-container">
          <div class="pe-var-divider">
            <div class="pe-var-line"></div>
            <button class="pe-var-btn" @click="toggleMapVariables(paramKey.toString())">
              <LucideIcon
                :name="isMapVariablesOpen(paramKey.toString()) ? 'chevron-up' : 'chevron-down'"
                size="12"
              />
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
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PluginNode } from '@/core/types/workflow.types'

const props = defineProps<NodeEditorProps>()

const data = computed(() => props.node.data as unknown as PluginNode)

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

const fileInputRefs = ref<Record<string, HTMLInputElement>>({})

const setFileInputRef = (id: string, el: any) => {
  if (el) {
    fileInputRefs.value[id] = el as HTMLInputElement
  }
}

const triggerFileInput = (id: string) => {
  if (fileInputRefs.value[id]) {
    fileInputRefs.value[id].click()
  }
}

const updateFileArray = (key: string, index: number, value: string) => {
  let currentArray = Array.isArray((data.value.params as any)?.[key]) 
    ? [...(data.value.params as any)[key]] 
    : ((data.value.params as any)?.[key] ? [(data.value.params as any)[key]] : [''])
  
  currentArray[index] = value
  
  props.updateNodeData({
    params: {
      ...(data.value.params || {}),
      [key]: currentArray,
    },
  })
}

const handleFileUpload = async (key: string, index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1]
    const fileObj = {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      contentBase64: base64
    }
    
    let currentArray = Array.isArray((data.value.params as any)?.[key]) 
      ? [...(data.value.params as any)[key]] 
      : ((data.value.params as any)?.[key] ? [(data.value.params as any)[key]] : [''])
      
    currentArray[index] = fileObj
    
    props.updateNodeData({
      params: {
        ...(data.value.params || {}),
        [key]: currentArray,
      },
    })
  }
  reader.readAsDataURL(file)
}

const addFileToArray = (key: string) => {
  let currentArray = Array.isArray((data.value.params as any)?.[key]) 
    ? [...(data.value.params as any)[key]] 
    : ((data.value.params as any)?.[key] ? [(data.value.params as any)[key]] : [''])
    
  currentArray.push('')
  
  props.updateNodeData({
    params: {
      ...(data.value.params || {}),
      [key]: currentArray,
    },
  })
}

const removeFileFromArray = (key: string, index: number) => {
  let currentArray = Array.isArray((data.value.params as any)?.[key]) 
    ? [...(data.value.params as any)[key]] 
    : ((data.value.params as any)?.[key] ? [(data.value.params as any)[key]] : [''])
    
  currentArray.splice(index, 1)
  
  if (currentArray.length === 0) {
    currentArray.push('')
  }
  
  props.updateNodeData({
    params: {
      ...(data.value.params || {}),
      [key]: currentArray,
    },
  })
}
</script>

<style scoped>
.mt-2 {
  margin-top: var(--nod8-space-2);
}

.pe-params-header {
  display: flex;
  align-items: center;
  gap: var(--nod8-space-2);
  border-bottom: 1px solid var(--nod8-border);
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
  border: 1px solid var(--nod8-border);
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
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--nod8-text-muted);
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: -0.05em;
  border: 1px solid var(--nod8-border);
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
  background-color: var(--nod8-border);
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

.pe-files-container {
  display: flex;
  flex-direction: column;
  gap: var(--nod8-space-2);
}

.pe-file-input-group {
  display: flex;
  gap: var(--nod8-space-2);
  align-items: center;
}

.pe-file-input-wrapper {
  flex: 1;
}

.pe-file-text-mode {
  display: flex;
  gap: var(--nod8-space-2);
  align-items: center;
  width: 100%;
}

.pe-file-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--nod8-bg-surface);
}

.pe-file-name {
  font-size: 12px;
  color: var(--nod8-text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pe-file-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--nod8-bg-surface);
  border: 1px solid var(--nod8-border);
  color: var(--nod8-text-muted);
  cursor: pointer;
  border-radius: var(--nod8-radius-sm);
  transition: all 0.2s ease;
}

.pe-file-btn:hover {
  color: var(--nod8-text-primary);
  background: var(--nod8-bg-surface-hover);
}

.pe-file-btn--upload {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.pe-file-btn--upload:hover {
  color: var(--nod8-text-primary);
  border-color: var(--nod8-text-primary);
}

.pe-file-btn--remove {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.pe-file-btn--remove:hover {
  color: rgba(239, 68, 68, 1);
  border-color: rgba(239, 68, 68, 0.5);
}

.pe-file-btn--add {
  gap: 6px;
  padding: 8px 12px;
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
</style>
