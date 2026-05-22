<template>
  <section class="plugin-creator-run-method-panel" aria-label="Run Plugin Creator Method">
    <header>
      <strong>Run method</strong>
      <button type="button" :disabled="!methodId || isRunning" @click="runMethod">
        {{ isRunning ? 'Running' : 'Run' }}
      </button>
    </header>
    <label>
      <span>Params JSON</span>
      <textarea v-model="paramsJson" spellcheck="false" />
    </label>
    <label>
      <span>Credentials JSON</span>
      <textarea v-model="credentialsJson" spellcheck="false" />
    </label>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import type { PluginCreatorTestMethodPayload } from '../../../core/types/plugin-creator.types.ts'

const props = defineProps<{
  methodId?: string | null
  isRunning?: boolean
}>()

const emit = defineEmits<{
  'test-method': [payload: PluginCreatorTestMethodPayload]
}>()

const paramsJson = ref('{}')
const credentialsJson = ref('{}')

function runMethod() {
  if (!props.methodId) return
  emit('test-method', {
    methodId: props.methodId,
    params: parseJson(paramsJson.value),
    credentials: parseJson(credentialsJson.value),
  })
}

function parseJson(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value || '{}') as unknown
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {}
}
</script>

<style scoped>
.plugin-creator-run-method-panel {
  display: grid;
  gap: 10px;
}

.plugin-creator-run-method-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plugin-creator-run-method-panel label {
  display: grid;
  gap: 5px;
  color: var(--sailor-text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.plugin-creator-run-method-panel textarea {
  min-height: 72px;
  resize: vertical;
  border: 1px solid var(--sailor-border-subtle);
  border-radius: 6px;
  background: var(--sailor-bg-surface);
  color: var(--sailor-text-primary);
}
</style>
