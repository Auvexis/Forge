<template>
  <div class="editor-stack">
    <EditorField label="Step Name">
      <BaseInput
        :model-value="(node.data.name as string) || ''"
        @update:model-value="updateNodeData({ name: $event as string })"
        placeholder="AI Model"
      />
    </EditorField>

    <EditorField label="Provider Plugin">
      <BaseInput
        :model-value="(node.data.pluginId as string) || ''"
        disabled
        placeholder="Selected provider plugin"
      />
    </EditorField>

    <EditorField label="Adapter">
      <BaseInput
        :model-value="(node.data.adapter as string) || 'openai-compatible'"
        disabled
        placeholder="openai-compatible"
      />
    </EditorField>

    <EditorField label="Model">
      <BaseInput
        :model-value="(node.data.model as string) || ''"
        @update:model-value="updateNodeData({ model: $event as string })"
        placeholder="gpt-4.1-mini"
      />
    </EditorField>

    <EditorField label="Temperature">
      <BaseInput
        type="number"
        :model-value="Number(node.data.temperature ?? 0.2)"
        @update:model-value="updateNodeData({ temperature: Number($event) })"
        placeholder="0.2"
      />
    </EditorField>

    <EditorField label="Max Tokens">
      <BaseInput
        type="number"
        :model-value="Number(node.data.maxTokens ?? 0)"
        @update:model-value="updateNodeData({ maxTokens: Number($event) || undefined })"
        placeholder="Optional"
      />
    </EditorField>

    <template v-if="node.data.adapter === 'ollama'">
      <EditorField label="Context Window">
        <BaseInput
          type="number"
          :model-value="Number(node.data.numCtx ?? 0)"
          @update:model-value="updateNodeData({ numCtx: Number($event) || undefined })"
          placeholder="Optional"
        />
      </EditorField>

      <EditorField label="Top P">
        <BaseInput
          type="number"
          :model-value="Number(node.data.topP ?? 0)"
          @update:model-value="updateNodeData({ topP: Number($event) || undefined })"
          placeholder="Optional"
        />
      </EditorField>

      <EditorField label="Top K">
        <BaseInput
          type="number"
          :model-value="Number(node.data.topK ?? 0)"
          @update:model-value="updateNodeData({ topK: Number($event) || undefined })"
          placeholder="Optional"
        />
      </EditorField>

      <EditorField label="Repeat Penalty">
        <BaseInput
          type="number"
          :model-value="Number(node.data.repeatPenalty ?? 0)"
          @update:model-value="updateNodeData({ repeatPenalty: Number($event) || undefined })"
          placeholder="Optional"
        />
      </EditorField>

      <EditorField label="Seed">
        <BaseInput
          type="number"
          :model-value="Number(node.data.seed ?? 0)"
          @update:model-value="updateNodeData({ seed: Number($event) || undefined })"
          placeholder="Optional"
        />
      </EditorField>

      <EditorField label="Keep Alive">
        <BaseInput
          :model-value="String(node.data.keepAlive ?? '')"
          @update:model-value="updateNodeData({ keepAlive: ($event as string) || undefined })"
          placeholder="5m"
        />
      </EditorField>

      <EditorField label="Ollama Options">
        <BaseTextarea
          :model-value="ollamaOptionsText"
          @update:model-value="updateOllamaOptions($event as string)"
          placeholder='{"mirostat":2}'
          :rows="4"
        />
      </EditorField>
    </template>

    <EditorField label="Thinking">
      <BaseSwitch
        :model-value="Boolean(node.data.thinkingEnabled)"
        :disabled="node.data.thinkingSupported === false"
        label="Show model thinking when the provider streams it"
        @update:model-value="updateNodeData({ thinkingEnabled: $event as boolean })"
      />
    </EditorField>

    <EditorField label="Base URL">
      <BaseInput
        :model-value="(node.data.baseUrl as string) || ''"
        @update:model-value="updateNodeData({ baseUrl: ($event as string) || undefined })"
        placeholder="https://api.example.com/v1"
      />
    </EditorField>

  </div>
</template>

<script setup lang="ts">
import type { NodeEditorProps } from './types'
import { ref, watch } from 'vue'
import EditorField from './EditorField.vue'
import BaseInput from '@/shared/components/base/BaseInput.vue'
import BaseSwitch from '@/shared/components/base/BaseSwitch.vue'
import BaseTextarea from '@/shared/components/base/BaseTextarea.vue'

const props = defineProps<NodeEditorProps>()
const { node, updateNodeData } = props
const ollamaOptionsText = ref(formatOllamaOptions())

function formatOllamaOptions(): string {
  const options = props.node.data.ollamaOptions
  return options && typeof options === 'object'
    ? JSON.stringify(options, null, 2)
    : ''
}

watch(
  () => props.node.id,
  () => {
    ollamaOptionsText.value = formatOllamaOptions()
  },
)

function updateOllamaOptions(value: string) {
  ollamaOptionsText.value = value
  const trimmed = value.trim()
  if (!trimmed) {
    props.updateNodeData({ ollamaOptions: undefined })
    return
  }

  try {
    const parsed = JSON.parse(trimmed)
    props.updateNodeData({
      ollamaOptions: parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : undefined,
    })
  } catch {}
}

</script>
