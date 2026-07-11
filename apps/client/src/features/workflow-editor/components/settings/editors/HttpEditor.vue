<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="HTTP Request"
        style="font-weight: 500"
      />
    </EditorField>

    <EditorField label="Method & URL">
      <div class="editor-row">
        <div style="width: 140px; flex-shrink: 0">
          <BaseSelect
            :model-value="(node.data.method as string) || 'GET'"
            :options="HTTP_METHODS"
            @update:model-value="updateNodeData({ method: $event as string })"
          />
        </div>
        <div class="editor-row--grow">
          <ExpressionInput
            :model-value="(node.data.url as string) || ''"
            @update:model-value="updateNodeData({ url: $event as string })"
            placeholder="https://api.example.com/v1/resource"
            style="font-family: var(--fabric-font-mono)"
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
        <ExpressionTextarea
          :model-value="(node.data.body as string) || ''"
          @update:model-value="updateNodeData({ body: $event as string })"
          placeholder='{ "key": "value" }'
          spellcheck="false"
        />
      </EditorField>
    </div>

    <div class="editor-stack">
      <div class="flex items-center justify-between">
        <BaseButton
          variant="ghost"
          size="sm"
          :icon-left="advancedOpen ? 'chevron-up' : 'chevron-down'"
          @click="advancedOpen = !advancedOpen"
        >
          Headers & Advanced
        </BaseButton>
      </div>

      <div v-if="advancedOpen" class="editor-stack mt-2">
        <EditorField label="Headers">
          <div class="editor-header-list">
            <div
              v-for="(val, key) in node.data.headers || {}"
              :key="key"
              class="editor-header-row"
              style="display: flex; gap: 8px; margin-bottom: 8px"
            >
              <BaseVariableInput
                :model-value="key"
                @blur="updateHeaderKey(key as string, ($event.target as HTMLInputElement).value)"
                style="font-family: var(--fabric-font-mono); flex: 1"
                :show-variable-button="false"
              />
              <ExpressionInput
                :model-value="val"
                @update:model-value="updateHeaderValue(key as string, $event as string)"
                style="font-family: var(--fabric-font-mono); flex: 1"
              />
              <BaseButton
                variant="ghost"
                size="icon"
                icon-left="x"
                style="padding: 15px; border-radius: var(--fabric-radius-md)"
                @click="removeHeader(key as string)"
              />
            </div>
            <BaseButton
              variant="dashed"
              size="md"
              icon-left="plus"
              full-width
              @click="addHeader"
              style="border-radius: var(--fabric-radius-full)"
            >
              Add Header
            </BaseButton>
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
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseVariableInput from '@/shared/components/base/BaseVariableInput.vue'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import ExpressionInput from '../expressions/ExpressionInput.vue'
import ExpressionTextarea from '../expressions/ExpressionTextarea.vue'

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

const hasBody = computed(() =>
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes((props.node.data.method as string) || 'GET'),
)

const addHeader = () => {
  const currentHeaders: Record<string, string> = {
    ...((props.node.data.headers as Record<string, string>) || {}),
  }
  const newKey = `Header_${Object.keys(currentHeaders).length + 1}`
  props.updateNodeData({ headers: { ...currentHeaders, [newKey]: '' } })
}

const updateHeaderKey = (oldKey: string, newKey: string) => {
  if (!newKey || oldKey === newKey) return
  const currentHeaders: Record<string, string> = {
    ...((props.node.data.headers as Record<string, string>) || {}),
  }
  const val = currentHeaders[oldKey]
  delete currentHeaders[oldKey]
  currentHeaders[newKey] = val || ''
  props.updateNodeData({ headers: currentHeaders })
}

const updateHeaderValue = (key: string, value: string) => {
  const currentHeaders: Record<string, string> = {
    ...((props.node.data.headers as Record<string, string>) || {}),
  }
  currentHeaders[key] = value
  props.updateNodeData({ headers: currentHeaders })
}

const removeHeader = (key: string) => {
  const currentHeaders: Record<string, string> = {
    ...((props.node.data.headers as Record<string, string>) || {}),
  }
  delete currentHeaders[key]
  props.updateNodeData({ headers: currentHeaders })
}
</script>

<style scoped></style>
