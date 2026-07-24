<template>
  <div class="editor-stack">
    <!-- Step name -->
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="What does this step do?"
      />
    </EditorField>

    <!-- Plugin selector -->
    <EditorField label="Integration (Plugin)">
      <BaseSelect
        :model-value="data.pluginId || ''"
        :options="pluginOptions"
        placeholder="Select Integration..."
        @update:model-value="(val) => updateNodeData({ pluginId: val, action: '', params: {} })"
      />
    </EditorField>

    <!-- Action selector -->
    <EditorField v-if="selectedPlugin" label="Action">
      <BaseSelect
        :model-value="data.action || ''"
        :options="actionOptions"
        placeholder="Select Action..."
        @update:model-value="(val) => updateNodeData({ action: val, params: {} })"
      />
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
        v-show="isFieldVisible(paramKey.toString(), paramVal)"
      >
        <!-- Param header -->
        <div class="pe-param-head">
          <div class="pe-param-info">
            <span class="pe-param-label">{{ (paramVal as any)['x-label'] || paramKey }}</span>
            <span v-if="(paramVal as any).description" class="pe-param-desc">{{
              (paramVal as any).description
            }}</span>
            <span v-if="isRequired(paramKey.toString())" class="pe-param-req">Required field</span>
          </div>
          <span class="pe-param-type">{{ (paramVal as any).type || 'any' }}</span>
        </div>

        <!-- Enum or Dynamic -> Select / Multiselect -->
        <template v-if="(paramVal as any).enum || (paramVal as any)['x-dynamic-options']">
          <!-- Multiselect -->
          <select
            v-if="(paramVal as any)['x-input-type'] === 'multiselect'"
            class="editor-select"
            multiple
            :value="(data.params as any)?.[paramKey] || []"
            :disabled="(paramVal as any)['x-dynamic-options'] && dynamicOptionsMap[paramKey.toString()]?.loading"
            @change="
              updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: Array.from(($event.target as HTMLSelectElement).selectedOptions).map(o => o.value),
                },
              })
            "
          >
            <template v-if="(paramVal as any)['x-dynamic-options'] && dynamicOptionsMap[paramKey.toString()]?.loading">
              <option value="" disabled>Loading options...</option>
            </template>
            <template v-else>
              <template v-if="(paramVal as any).enum">
                <option v-for="val in (paramVal as any).enum" :key="val" :value="val">{{ val }}</option>
              </template>
              <template v-else-if="(paramVal as any)['x-dynamic-options']">
                <option 
                  v-for="opt in (dynamicOptionsMap[paramKey.toString()]?.options || [])" 
                  :key="opt.value" 
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </template>
            </template>
          </select>
          
          <!-- Single Select -->
          <BaseSelect
            v-else
            :model-value="(data.params as any)?.[paramKey] || ''"
            :options="(paramVal as any)['x-dynamic-options'] ? (dynamicOptionsMap[paramKey.toString()]?.options || []) : ((paramVal as any).enum || []).map((v: string) => ({ label: v, value: v }))"
            :disabled="(paramVal as any)['x-dynamic-options'] && dynamicOptionsMap[paramKey.toString()]?.loading"
            :placeholder="(paramVal as any)['x-dynamic-options'] && dynamicOptionsMap[paramKey.toString()]?.loading ? 'Loading options...' : `Select ${(paramVal as any)['x-label'] || paramKey}...`"
            @update:model-value="
              (val: string | number) => updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: val,
                },
              })
            "
          />
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
          <ExpressionTextarea
            :model-value="(data.params as any)?.[paramKey] || ''"
            @update:model-value="
              (val: string | boolean) => updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: val,
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

        <!-- Code / JSON -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'code' || (paramVal as any)['x-input-type'] === 'json'">
          <BaseCodeEditor
            :model-value="(data.params as any)?.[paramKey] || ''"
            @update:model-value="
              (val: string | boolean) => updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: val,
                },
              })
            "
            :language="(paramVal as any)['x-input-type'] === 'json' ? 'json' : 'javascript'"
            height="280px"
          />
        </template>

        <!-- Datetime -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'datetime'">
          <BaseInput
            type="datetime-local"
            :model-value="(data.params as any)?.[paramKey] || ''"
            @update:model-value="
              (val: string | boolean) => updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: val,
                },
              })
            "
          />
        </template>

        <!-- File (Singular) Input -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'file'">
          <div class="pe-files-container">
            <div class="pe-file-input-group">
              <div class="pe-file-input-wrapper">
                <div v-if="typeof (data.params as any)?.[paramKey] === 'object' && (data.params as any)?.[paramKey] !== null" class="pe-file-display editor-input">
                  <LucideIcon name="file" size="14" />
                  <span class="pe-file-name">{{ (data.params as any)?.[paramKey].filename || 'Uploaded File' }}</span>
                </div>
                
                <div v-else class="pe-file-text-mode">
                  <ExpressionInput
                    style="flex: 1"
                    :model-value="(data.params as any)?.[paramKey] || ''"
                    @update:model-value="updateSingleFile(paramKey.toString(), $event as string)"
                    placeholder="e.g. {{ steps.download.output }}"
                  />
                  <input
                    type="file"
                    style="display: none"
                    @change="handleSingleFileUpload(paramKey.toString(), $event)"
                    :ref="(el) => setFileInputRef(paramKey.toString() + '-single', el)"
                  />
                  <button 
                    class="pe-file-btn pe-file-btn--upload"
                    @click="triggerFileInput(paramKey.toString() + '-single')"
                    title="Upload static file"
                  >
                    <LucideIcon name="upload" size="14" />
                  </button>
                </div>
              </div>
              <button 
                class="pe-file-btn pe-file-btn--remove" 
                @click="updateSingleFile(paramKey.toString(), '')"
                title="Clear file"
              >
                <LucideIcon name="trash" size="14" />
              </button>
            </div>
          </div>
        </template>

        <!-- Files Array Input -->
        <template v-else-if="(paramVal as any)['x-input-type'] === 'files'">
          <div class="pe-files-container">
            <div 
              v-for="(item, index) in getArrayFor(paramKey.toString())" 
              :key="index"
              class="pe-file-input-group"
            >
              <div class="pe-file-input-wrapper">
                <div v-if="typeof item === 'object'" class="pe-file-display editor-input">
                  <LucideIcon name="file" size="14" />
                  <span class="pe-file-name">{{ item.filename }}</span>
                </div>
                
                <div v-else class="pe-file-text-mode">
                  <ExpressionInput
                    style="flex: 1"
                    :model-value="item"
                    @update:model-value="updateFileArray(paramKey.toString(), index, $event as string)"
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
          <ExpressionInput
            :model-value="(data.params as any)?.[paramKey] || ''"
            @update:model-value="
              (val: string | boolean) => updateNodeData({
                params: {
                  ...(data.params || {}),
                  [paramKey]: val,
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

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { NodeEditorProps } from './types'
import { useApi } from '@/shared/composables/useApi'
import { pluginsApi } from '@/core/api/plugins.api'
import EditorField from './EditorField.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import type { PluginNode } from '@/core/types/workflow.types'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

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

const pluginOptions = computed(() => {
  if (!plugins.value) return []
  return plugins.value.map(p => {
    const iconStr = p.manifest.metadata.icon
    const isImage = iconStr && (iconStr.startsWith('http') || iconStr.startsWith('/') || iconStr.startsWith('data:'))
    return {
      label: p.manifest.metadata.name,
      value: p.id,
      ...(isImage ? { image: iconStr } : { icon: iconStr || 'puzzle' })
    }
  })
})

const actionOptions = computed(() => {
  if (!selectedPlugin.value?.manifest?.methods) return []
  return Object.entries(selectedPlugin.value.manifest.methods).map(([key, method]) => ({
    label: method.metadata.label || key,
    value: key,
    icon: 'zap'
  }))
})

const isRequired = (key: string) => {
  return (selectedAction.value?.parameters?.required ?? []).includes(key)
}

const getArrayFor = (key: string): any[] => {
  const val = (data.value.params as Record<string, any>)?.[key]
  if (Array.isArray(val)) return val
  if (val !== undefined && val !== null && val !== '') return [val]
  return ['']
}

// ── Visibility Logic (x-visible-if) ─────────────────────────
const isFieldVisible = (key: string, paramSchema: any) => {
  const visibilityConfig = paramSchema['x-visible-if']
  if (!visibilityConfig) return true

  const { field, operator, value } = visibilityConfig
  const siblingValue = data.value.params?.[field]

  switch (operator) {
    case 'equals': return siblingValue === value
    case 'not_equals': return siblingValue !== value
    case 'in': return Array.isArray(value) && value.includes(siblingValue)
    case 'contains': return Array.isArray(siblingValue) && siblingValue.includes(value)
    default: return true
  }
}

// ── Dynamic Options Logic (x-dynamic-options) ───────────────
const dynamicOptionsMap = ref<Record<string, { loading: boolean, options: { label: string, value: any }[] }>>({})

const loadDynamicOptions = async (paramKey: string, config: any) => {
  if (!config || !data.value.pluginId) return

  dynamicOptionsMap.value[paramKey] = { loading: true, options: [] }

  try {
    // Use the dedicated dynamic-options endpoint (GET, no workflow params needed)
    const rawOptions = await pluginsApi.getDynamicOptions(data.value.pluginId, config.method)
    const items = Array.isArray(rawOptions) ? rawOptions : []

    const getVal = (obj: any, path: string) =>
      path.split('.').reduce((acc: any, part: string) => acc?.[part], obj)

    dynamicOptionsMap.value[paramKey] = {
      loading: false,
      options: items.map((item: any) => ({
        label: String(getVal(item, config.labelPath) ?? JSON.stringify(item)),
        value: getVal(item, config.valuePath) ?? item,
      })),
    }
  } catch (err) {
    console.error(`[PluginEditor] Failed to load dynamic options for '${paramKey}':`, err)
    dynamicOptionsMap.value[paramKey] = { loading: false, options: [] }
  }
}

watch(
  () => [data.value.action, data.value.params, selectedAction.value],
  ([newAction, newParams], oldValues) => {
    const [oldAction, oldParams] = (oldValues as any) || []
    if (!selectedAction.value?.parameters?.properties) return

    for (const [key, schema] of Object.entries(selectedAction.value.parameters.properties)) {
      const dynConfig = (schema as any)['x-dynamic-options']
      if (dynConfig) {
        const actionChanged = newAction !== oldAction
        
        let depsChanged = false
        if (dynConfig.dependsOn && Array.isArray(dynConfig.dependsOn)) {
          const oldP = (oldParams || {}) as any
          const newP = (newParams || {}) as any
          depsChanged = dynConfig.dependsOn.some((dep: string) => oldP[dep] !== newP[dep])
        }
        
        if (actionChanged || depsChanged || !dynamicOptionsMap.value[key]) {
          loadDynamicOptions(key, dynConfig)
        }
      }
    }
  },
  { deep: true, immediate: true }
)


const fileInputRefs = ref<Record<string, any>>({})

const setFileInputRef = (id: string, el: any) => {
  if (el) {
    fileInputRefs.value[id] = el
  }
}

const triggerFileInput = (id: string) => {
  const el = fileInputRefs.value[id]
  if (el) {
    if (el.$el) {
      const input = el.$el.querySelector('input[type="file"]')
      if (input) input.click()
      else el.$el.click()
    } else if (typeof el.click === 'function') {
      el.click()
    }
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

const updateSingleFile = (key: string, value: any) => {
  props.updateNodeData({
    params: {
      ...(data.value.params || {}),
      [key]: value,
    },
  })
}

const handleSingleFileUpload = async (key: string, event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1]
    const fileObj = {
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      contentBase64: base64
    }
    updateSingleFile(key, fileObj)
  }
  reader.readAsDataURL(file)
}

const handleFileUpload = async (key: string, index: number, event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  if (!file) return
  
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
  margin-top: var(--fabric-space-2);
}

.pe-loading-text {
  font-size: 11px;
  color: var(--fabric-plugin-editor-text-muted);
  font-style: italic;
  padding: 4px 0;
}

.pe-params-header {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  border-bottom: 1px solid var(--fabric-plugin-editor-border);
  padding-bottom: var(--fabric-space-2);
}

.pe-params-indicator {
  width: 4px;
  height: 16px;
  background-color: var(--fabric-plugin-editor-text-primary);
  border-radius: 9999px;
}

.pe-params-title {
  font-size: 11px;
  font-weight: 900;
  color: var(--fabric-plugin-editor-text-primary);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
}

.pe-param-card {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-3);
  padding: var(--fabric-space-4);
  border-radius: var(--fabric-radius-lg);
  border: 1px solid var(--fabric-plugin-editor-border);
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
  color: var(--fabric-plugin-editor-text-primary);
}

.pe-param-desc {
  font-size: 10px;
  color: var(--fabric-plugin-editor-text-muted);
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
  color: var(--fabric-plugin-editor-text-muted);
  text-transform: uppercase;
  font-weight: 900;
  letter-spacing: -0.05em;
  border: 1px solid var(--fabric-plugin-editor-border);
}

.pe-param-toggle {
  display: flex;
  align-items: center;
  gap: var(--fabric-space-2);
  height: 40px;
}

.pe-param-toggle-text {
  font-size: var(--fabric-text-xs);
  color: var(--fabric-plugin-editor-text-muted);
  font-style: italic;
  font-weight: 500;
}




.pe-files-container {
  display: flex;
  flex-direction: column;
  gap: var(--fabric-space-2);
}

.pe-file-input-group {
  display: flex;
  gap: var(--fabric-space-2);
  align-items: center;
}

.pe-file-input-wrapper {
  flex: 1;
}

.pe-file-text-mode {
  display: flex;
  gap: var(--fabric-space-2);
  align-items: center;
  width: 100%;
}

.pe-file-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--fabric-plugin-editor-bg-surface);
}

.pe-file-name {
  font-size: 12px;
  color: var(--fabric-plugin-editor-text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pe-file-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fabric-plugin-editor-bg-surface);
  border: 1px solid var(--fabric-plugin-editor-border);
  color: var(--fabric-plugin-editor-text-muted);
  cursor: pointer;
  border-radius: var(--fabric-radius-sm);
  transition: all 0.2s ease;
}

.pe-file-btn:hover {
  color: var(--fabric-plugin-editor-text-primary);
  background: var(--fabric-plugin-editor-bg-surface-hover);
}

.pe-file-btn--upload {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.pe-file-btn--upload:hover {
  color: var(--fabric-plugin-editor-text-primary);
  border-color: var(--fabric-plugin-editor-text-primary);
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
