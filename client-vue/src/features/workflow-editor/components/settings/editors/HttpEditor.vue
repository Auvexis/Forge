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
        <div style="width: 140px; flex-shrink: 0;">
          <BaseSelect
            :model-value="(node.data.method as string) || 'GET'"
            :options="HTTP_METHODS"
            @update:model-value="updateNodeData({ method: $event as string })"
          />
        </div>
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
        <BaseSelect
          :model-value="(node.data.bodyType as string) || 'json'"
          :options="BODY_TYPES"
          @update:model-value="updateNodeData({ bodyType: $event as string })"
        />
      </EditorField>

      <EditorField label="Request Body">
        <textarea
          class="editor-textarea"
          style="font-family: monospace; white-space: pre;"
          :value="(node.data.body as string) || ''"
          @input="updateNodeData({ body: ($event.target as HTMLTextAreaElement).value })"
          placeholder='{ "key": "value" }'
          spellcheck="false"
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
          <BaseSelect
            :model-value="(node.data.responseType as string) || 'json'"
            :options="RESPONSE_TYPES"
            @update:model-value="updateNodeData({ responseType: $event as string })"
          />
        </EditorField>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NodeEditorProps } from './types'
import EditorField from './EditorField.vue'
import BaseSelect from '@/shared/components/base/BaseSelect.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'

const props = defineProps<NodeEditorProps>()
const advancedOpen = ref(false)

const HTTP_METHODS = [
  { value: 'GET', label: 'GET', icon: 'download' },
  { value: 'POST', label: 'POST', icon: 'send' },
  { value: 'PUT', label: 'PUT', icon: 'refresh-cw' },
  { value: 'PATCH', label: 'PATCH', icon: 'file-edit' },
  { value: 'DELETE', label: 'DELETE', icon: 'trash' },
]

const BODY_TYPES = [
  { value: 'json', label: 'JSON', icon: 'braces' },
  { value: 'form', label: 'Form Encoded', icon: 'align-justify' },
  { value: 'raw', label: 'Raw', icon: 'align-left' },
]
const RESPONSE_TYPES = [
  { value: 'json', label: 'JSON (auto-parse)' },
  { value: 'text', label: 'Plain Text' },
  { value: 'binary', label: 'Binary File (Buffer)' },
]

const hasBody = computed(() => ['POST', 'PUT', 'PATCH', 'DELETE'].includes((props.node.data.method as string) || 'GET'))

const addHeader = () => {
  const currentHeaders: Record<string, string> = { ...(props.node.data.headers as Record<string, string> || {}) }
  const newKey = `Header_${Object.keys(currentHeaders).length + 1}`
  props.updateNodeData({ headers: { ...currentHeaders, [newKey]: '' } })
}

const updateHeaderKey = (oldKey: string, newKey: string) => {
  if (!newKey || oldKey === newKey) return
  const currentHeaders: Record<string, string> = { ...(props.node.data.headers as Record<string, string> || {}) }
  const val = currentHeaders[oldKey]
  delete currentHeaders[oldKey]
  currentHeaders[newKey] = val || ''
  props.updateNodeData({ headers: currentHeaders })
}

const updateHeaderValue = (key: string, value: string) => {
  const currentHeaders: Record<string, string> = { ...(props.node.data.headers as Record<string, string> || {}) }
  currentHeaders[key] = value
  props.updateNodeData({ headers: currentHeaders })
}

const removeHeader = (key: string) => {
  const currentHeaders: Record<string, string> = { ...(props.node.data.headers as Record<string, string> || {}) }
  delete currentHeaders[key]
  props.updateNodeData({ headers: currentHeaders })
}
</script>

<style scoped></style>
