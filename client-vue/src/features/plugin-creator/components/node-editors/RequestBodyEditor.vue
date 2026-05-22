<template>
  <div class="request-body-editor">
    <div class="request-body-editor__modes" aria-label="Body mode">
      <button
        v-for="option in bodyModeOptions"
        :key="option"
        type="button"
        :class="{ 'is-active': body.type === option }"
        @click="updateType(option)"
      >
        {{ option }}
      </button>
    </div>

    <p v-if="body.type === 'none'" class="request-body-editor__empty">
      No body will be sent with this request.
    </p>
    <BaseCodeEditor
      v-else
      :model-value="bodyValue"
      :language="body.type === 'json' || body.type === 'form' ? 'json' : 'text'"
      label="Body value"
      height="220px"
      @update:model-value="updateValue(String($event))"
    />
    <p v-if="jsonError" class="request-body-editor__error">{{ jsonError }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseCodeEditor from '@/shared/components/base/BaseCodeEditor.vue'
import { stringifyEditorValue } from './editorValueUtils'
import type { PluginBlueprintRequestBody } from '@/core/types/plugin-creator.types'

const props = defineProps<{
  body: PluginBlueprintRequestBody
}>()

const emit = defineEmits<{
  update: [body: PluginBlueprintRequestBody]
}>()

const bodyModeOptions: PluginBlueprintRequestBody['type'][] = ['none', 'json', 'text', 'form']
const jsonError = ref<string | null>(null)
const bodyValue = computed(() => stringifyEditorValue(props.body.value ?? {}))

watch(
  () => props.body.type,
  () => {
    jsonError.value = null
  },
)

function updateType(type: PluginBlueprintRequestBody['type']) {
  emit('update', { ...props.body, type })
}

function updateValue(value: string) {
  if (props.body.type === 'json' || props.body.type === 'form') {
    try {
      jsonError.value = null
      emit('update', { ...props.body, value: value.trim() ? JSON.parse(value) : {} })
    } catch {
      jsonError.value = 'Invalid JSON. Fix it before the body can be saved.'
    }
    return
  }
  emit('update', { ...props.body, value })
}
</script>

<style scoped>
.request-body-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.request-body-editor__modes {
  display: inline-flex;
  align-self: flex-start;
  padding: 3px;
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-sm);
  background: var(--sailor-bg-surface);
}

.request-body-editor__modes button {
  border: 0;
  border-radius: var(--sailor-radius-sm);
  background: transparent;
  color: var(--sailor-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  padding: 5px 9px;
}

.request-body-editor__modes button.is-active {
  background: var(--sailor-bg-surface-hover);
  color: var(--sailor-text-primary);
}

.request-body-editor__empty,
.request-body-editor__error {
  margin: 0;
  color: var(--sailor-text-muted);
  font-size: 12px;
}

.request-body-editor__error {
  color: #fca5a5;
}
</style>
