<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <input
        class="editor-input editor-input--bold"
        :value="node.data.name || ''"
        @input="updateNodeData({ name: ($event.target as HTMLInputElement).value })"
        placeholder="HTTP Request"
      />
    </EditorField>

    <EditorField label="Method & URL">
      <div class="editor-row">
        <select
          class="editor-select editor-row--method"
          :value="node.data.method || 'GET'"
          @change="updateNodeData({ method: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="m in HTTP_METHODS" :key="m" :value="m">{{ m }}</option>
        </select>
        <div class="editor-row--grow">
          <input
            class="editor-input editor-input--mono"
            :value="node.data.url || ''"
            @input="updateNodeData({ url: ($event.target as HTMLInputElement).value })"
            placeholder="https://api.example.com/v1/resource"
          />
        </div>
      </div>
    </EditorField>

    <div v-show="hasBody" class="editor-stack">
      <EditorField label="Body Content Type">
        <select
          class="editor-select"
          :value="node.data.bodyType || 'json'"
          @change="updateNodeData({ bodyType: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="t in BODY_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </EditorField>

      <EditorField label="Request Body">
        <CodeEditor
          language="json"
          :model-value="node.data.body || ''"
          @update:model-value="updateNodeData({ body: $event })"
        />
      </EditorField>
    </div>

    <div class="editor-stack">
      <div class="flex items-center justify-between">
        <button class="editor-collapsible-trigger" @click="advancedOpen = !advancedOpen">
          <LucideIcon :name="advancedOpen ? 'chevron-up' : 'chevron-down'" :size="12" />
          Headers & Advanced
        </button>
      </div>

      <div v-if="advancedOpen" class="editor-stack mt-2">
        <EditorField label="Headers">
          <div class="editor-header-list">
            <div v-for="(val, key) in node.data.headers || {}" :key="key" class="editor-header-row">
              <input
                class="editor-input editor-input--mono"
                :value="key"
                @blur="updateHeaderKey(key as string, ($event.target as HTMLInputElement).value)"
              />
              <input
                class="editor-input editor-input--mono"
                :value="val"
                @input="updateHeaderValue(key as string, ($event.target as HTMLInputElement).value)"
              />
              <button class="editor-header-remove" @click="removeHeader(key as string)">
                <LucideIcon name="x" :size="14" />
              </button>
            </div>
            <button class="editor-add-btn" @click="addHeader">
              <LucideIcon name="plus" :size="14" />
              Add Header
            </button>
          </div>
        </EditorField>

        <EditorField label="Response Type">
          <select
            class="editor-select"
            :value="node.data.responseType || 'json'"
            @change="updateNodeData({ responseType: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="t in RESPONSE_TYPES" :key="t.value" :value="t.value">
              {{ t.label }}
            </option>
          </select>
        </EditorField>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import CodeEditor from './CodeEditor.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<NodeEditorProps>()
const advancedOpen = ref(false)

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const BODY_TYPES = [
  { value: 'json', label: 'JSON' },
  { value: 'form', label: 'Form Encoded' },
  { value: 'raw', label: 'Raw' },
]
const RESPONSE_TYPES = [
  { value: 'json', label: 'JSON (auto-parse)' },
  { value: 'text', label: 'Plain Text' },
  { value: 'binary', label: 'Binary File (Buffer)' },
]

const hasBody = computed(() => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(props.node.data.method || 'GET'))

const addHeader = () => {
  const currentHeaders = { ...(props.node.data.headers || {}) }
  const newKey = `Header_${Object.keys(currentHeaders).length + 1}`
  props.updateNodeData({ headers: { ...currentHeaders, [newKey]: '' } })
}

const updateHeaderKey = (oldKey: string, newKey: string) => {
  if (!newKey || oldKey === newKey) return
  const currentHeaders = { ...(props.node.data.headers || {}) }
  const val = currentHeaders[oldKey]
  delete currentHeaders[oldKey]
  currentHeaders[newKey] = val
  props.updateNodeData({ headers: currentHeaders })
}

const updateHeaderValue = (key: string, value: string) => {
  const currentHeaders = { ...(props.node.data.headers || {}) }
  currentHeaders[key] = value
  props.updateNodeData({ headers: currentHeaders })
}

const removeHeader = (key: string) => {
  const currentHeaders = { ...(props.node.data.headers || {}) }
  delete currentHeaders[key]
  props.updateNodeData({ headers: currentHeaders })
}
</script>

<style scoped></style>
